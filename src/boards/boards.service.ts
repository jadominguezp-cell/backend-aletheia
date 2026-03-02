import { Injectable, OnModuleInit } from '@nestjs/common';
import { getDatabase, initDb, DbClient } from '../database/database';
import { v4 as uuidv4 } from 'uuid';

export interface Board {
    id: string;
    title: string;
    user_id: string;
    company_type: 'peruana' | 'extranjera';
    country?: string;
    ruc?: string;
    registration_code?: string;
    created_at: string;
    updated_at: string;
}

export interface Column {
    id: string;
    board_id: string;
    title: string;
    position: number;
    color: string;
}

export interface Card {
    id: string;
    column_id: string;
    title: string;
    description: string;
    document_type: string;
    priority: 'alta' | 'media' | 'baja';
    position: number;
    link?: string;
    attachment_url?: string;
    created_at: string;
    updated_at: string;
}

const DEFAULT_COLUMNS = [
    { title: 'Lista SPLAFT', color: '#4A90D9', position: 0 },
    { title: 'Por Hacer', color: '#F5A623', position: 1 },
    { title: 'En Revisión', color: '#E87C3E', position: 2 },
    { title: 'Finalizado', color: '#10B981', position: 3 },
];

const DEFAULT_MANUAL_CARDS = [
    { title: 'Consulta en Migraciones', description: 'Validación de registros migratorios y permanencia en territorio nacional. Búsqueda que requiere verificación manual.', document_type: 'migraciones', link: 'https://www.migraciones.gob.pe/' },
    { title: 'Consulta en la página web de Infogob', description: 'Identificación de vínculos políticos y antecedentes de participación pública. Búsqueda que requiere verificación manual.', document_type: 'infogob', link: 'https://infogob.jne.gob.pe/' },
    { title: 'Consulta en la página web de EsSalud', description: 'Verificación de condición laboral registrada. Búsqueda que requiere verificación manual.', document_type: 'essalud', link: 'http://ww4.essalud.gob.pe:7777/acredita/' },
    { title: 'Consulta en Centrales de Riesgos', description: 'Revisión de historial crediticio y comportamiento financiero. Búsqueda que requiere verificación manual.', document_type: 'centrales-riesgos', link: 'https://reportedeudas.sbs.gob.pe/reportedeudasSBS1/ReporteDeudaOperacionMutual.aspx' },
];

@Injectable()
export class BoardsService implements OnModuleInit {
    private db!: DbClient;

    async onModuleInit() {
        this.db = await initDb();
    }

    // ─── Boards ───
    async getAllBoards(userId: string): Promise<Board[]> {
        const result = await this.db.execute({
            sql: 'SELECT * FROM boards WHERE user_id = ? ORDER BY created_at DESC',
            args: [userId],
        });
        return result.rows as unknown as Board[];
    }

    async getBoard(id: string, userId: string): Promise<Board | undefined> {
        const result = await this.db.execute({
            sql: 'SELECT * FROM boards WHERE id = ? AND user_id = ?',
            args: [id, userId],
        });
        return result.rows[0] as unknown as Board | undefined;
    }

    async createBoard(title: string, userId: string, companyType: 'peruana' | 'extranjera' = 'peruana', country?: string, ruc?: string): Promise<Board> {
        const id = uuidv4();
        const now = new Date().toISOString();
        const shortNode = id.split('-')[0].toUpperCase();
        const registration_code = `OP-${shortNode}-${Date.now().toString().slice(-4)}`;

        await this.db.execute({
            sql: 'INSERT INTO boards (id, title, user_id, company_type, country, ruc, registration_code, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            args: [id, title, userId, companyType, country || null, ruc || null, registration_code, now, now],
        });

        // Autocreate operation registry
        const initialOperationData = JSON.stringify({
            identificacion: {
                codigoOficina: '',
                numeroRegistro: registration_code,
                numeroRegistroInterno: '',
                modalidad: '',
                ubigeo: '',
                fecha: new Date().toISOString().split('T')[0],
                hora: '12:00'
            },
            datosOperacion: {},
            sujetos: {
                ejecutante: {},
                ordenante: {},
                beneficiario: {}
            }
        });

        await this.db.execute({
            sql: 'INSERT INTO operations (id, board_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            args: [uuidv4(), id, initialOperationData, now, now],
        });

        let splaftColumnId = '';
        for (const col of DEFAULT_COLUMNS) {
            const colId = uuidv4();
            if (col.title === 'Lista SPLAFT') {
                splaftColumnId = colId;
            }
            await this.db.execute({
                sql: 'INSERT INTO columns (id, board_id, title, position, color) VALUES (?, ?, ?, ?, ?)',
                args: [colId, id, col.title, col.position, col.color],
            });
        }

        if (splaftColumnId) {
            let position = 0;
            if (companyType === 'extranjera') {
                await this.db.execute({
                    sql: 'INSERT INTO cards (id, column_id, title, description, document_type, priority, position, link, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    args: [uuidv4(), splaftColumnId, 'Próximamente', 'La opción para visualizar los documentos requeridos de empresas extranjeras se anunciará próximamente.', 'oficial', 'baja', position++, null, now, now],
                });
            } else {
                for (const doc of DEFAULT_MANUAL_CARDS) {
                    await this.db.execute({
                        sql: 'INSERT INTO cards (id, column_id, title, description, document_type, priority, position, link, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        args: [uuidv4(), splaftColumnId, doc.title, doc.description, doc.document_type, 'media', position++, doc.link, now, now],
                    });
                }
            }
        }

        return (await this.getBoard(id, userId))!;
    }

    async updateBoardTitle(id: string, title: string, userId: string): Promise<Board | undefined> {
        const now = new Date().toISOString();
        await this.db.execute({
            sql: 'UPDATE boards SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?',
            args: [title, now, id, userId],
        });
        return this.getBoard(id, userId);
    }

    async deleteBoard(id: string, userId: string): Promise<boolean> {
        // Delete cards first, then columns, then board (manual cascade)
        const cols = await this.getColumns(id);
        for (const col of cols) {
            await this.db.execute({ sql: 'DELETE FROM cards WHERE column_id = ?', args: [col.id] });
        }
        await this.db.execute({ sql: 'DELETE FROM columns WHERE board_id = ?', args: [id] });
        const result = await this.db.execute({
            sql: 'DELETE FROM boards WHERE id = ? AND user_id = ?',
            args: [id, userId],
        });
        return result.rowsAffected > 0;
    }

    // ─── Columns ───
    async getColumns(boardId: string): Promise<Column[]> {
        const result = await this.db.execute({
            sql: 'SELECT * FROM columns WHERE board_id = ? ORDER BY position',
            args: [boardId],
        });
        return result.rows as unknown as Column[];
    }

    // ─── Cards ───
    async getCardsByBoard(boardId: string): Promise<Card[]> {
        const result = await this.db.execute({
            sql: `SELECT cards.* FROM cards
            JOIN columns ON cards.column_id = columns.id
            WHERE columns.board_id = ?
            ORDER BY cards.position`,
            args: [boardId],
        });
        return result.rows as unknown as Card[];
    }

    async createCard(columnId: string, title: string, description = '', documentType = '', priority = 'media'): Promise<Card> {
        const id = uuidv4();
        const now = new Date().toISOString();

        const maxPosResult = await this.db.execute({
            sql: 'SELECT COALESCE(MAX(position), -1) as maxPos FROM cards WHERE column_id = ?',
            args: [columnId],
        });
        const position = (Number(maxPosResult.rows[0]?.maxPos ?? -1)) + 1;

        await this.db.execute({
            sql: 'INSERT INTO cards (id, column_id, title, description, document_type, priority, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            args: [id, columnId, title, description, documentType, priority, position, now, now],
        });

        const result = await this.db.execute({ sql: 'SELECT * FROM cards WHERE id = ?', args: [id] });
        return result.rows[0] as unknown as Card;
    }

    async updateCard(id: string, data: Partial<Pick<Card, 'title' | 'description' | 'document_type' | 'priority' | 'link' | 'attachment_url'>>): Promise<Card | undefined> {
        const now = new Date().toISOString();
        const fields: string[] = [];
        const values: any[] = [];

        if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
        if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
        if (data.document_type !== undefined) { fields.push('document_type = ?'); values.push(data.document_type); }
        if (data.priority !== undefined) { fields.push('priority = ?'); values.push(data.priority); }
        if (data.link !== undefined) { fields.push('link = ?'); values.push(data.link); }
        if (data.attachment_url !== undefined) { fields.push('attachment_url = ?'); values.push(data.attachment_url); }

        if (fields.length === 0) {
            const r = await this.db.execute({ sql: 'SELECT * FROM cards WHERE id = ?', args: [id] });
            return r.rows[0] as unknown as Card;
        }

        fields.push('updated_at = ?');
        values.push(now);
        values.push(id);

        await this.db.execute({
            sql: `UPDATE cards SET ${fields.join(', ')} WHERE id = ?`,
            args: values,
        });

        const result = await this.db.execute({ sql: 'SELECT * FROM cards WHERE id = ?', args: [id] });
        return result.rows[0] as unknown as Card;
    }

    async moveCard(cardId: string, targetColumnId: string, targetPosition: number): Promise<Card | undefined> {
        const now = new Date().toISOString();

        await this.db.execute({
            sql: 'UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ?',
            args: [targetColumnId, targetPosition],
        });

        await this.db.execute({
            sql: 'UPDATE cards SET column_id = ?, position = ?, updated_at = ? WHERE id = ?',
            args: [targetColumnId, targetPosition, now, cardId],
        });

        const result = await this.db.execute({ sql: 'SELECT * FROM cards WHERE id = ?', args: [cardId] });
        return result.rows[0] as unknown as Card;
    }

    async deleteCard(id: string): Promise<boolean> {
        const result = await this.db.execute({ sql: 'DELETE FROM cards WHERE id = ?', args: [id] });
        return result.rowsAffected > 0;
    }
}
