import { Injectable, OnModuleInit } from '@nestjs/common';
import { getDatabase, initDb, DbClient } from '../database/database';

export interface Operation {
    id: string;
    board_id: string;
    data: any;
    created_at: string;
    updated_at: string;
}

@Injectable()
export class OperationsService implements OnModuleInit {
    private db!: DbClient;

    async onModuleInit() {
        this.db = await initDb();
    }

    async getOperationsByUser(userId: string): Promise<any[]> {
        // Obtenemos los tableros del usuario y cruzamos con operations
        const result = await this.db.execute({
            sql: `
            SELECT o.*, b.title as board_title, b.company_type, b.country, b.registration_code
            FROM operations o
            JOIN boards b ON o.board_id = b.id
            WHERE b.user_id = ?
            ORDER BY o.created_at DESC
            `,
            args: [userId],
        });

        return result.rows.map((row: any) => ({
            ...row,
            data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data
        }));
    }

    async getOperationById(operationId: string, userId: string): Promise<any | undefined> {
        const result = await this.db.execute({
            sql: `
            SELECT o.*, b.title as board_title, b.company_type, b.registration_code
            FROM operations o
            JOIN boards b ON o.board_id = b.id
            WHERE o.id = ? AND b.user_id = ?
            `,
            args: [operationId, userId],
        });

        const row = result.rows[0];
        if (!row) return undefined;

        return {
            ...row,
            data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data
        };
    }

    async updateOperation(operationId: string, data: any, userId: string): Promise<any> {
        // Verify ownership
        const op = await this.getOperationById(operationId, userId);
        if (!op) return null;

        const now = new Date().toISOString();
        await this.db.execute({
            sql: 'UPDATE operations SET data = ?, updated_at = ? WHERE id = ?',
            args: [JSON.stringify(data), now, operationId]
        });

        return this.getOperationById(operationId, userId);
    }
}
