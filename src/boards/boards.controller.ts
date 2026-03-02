import { Controller, Get, Post, Put, Delete, Body, Param, Req, HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { BoardsService } from './boards.service';
import { getAuth } from '../auth/auth';

@Controller('api/boards')
export class BoardsController {
    constructor(private readonly boardsService: BoardsService) { }

    private async getUserId(req: Request): Promise<string> {
        const session = await getAuth().api.getSession({ headers: req.headers as any });
        if (!session?.user?.id) {
            throw new HttpException('No autorizado', HttpStatus.UNAUTHORIZED);
        }
        return session.user.id;
    }

    @Get()
    async getBoards(@Req() req: Request) {
        const userId = await this.getUserId(req);
        return this.boardsService.getAllBoards(userId);
    }

    @Get(':id')
    async getBoard(@Param('id') id: string, @Req() req: Request) {
        const userId = await this.getUserId(req);
        const board = await this.boardsService.getBoard(id, userId);
        if (!board) throw new HttpException('Tablero no encontrado', HttpStatus.NOT_FOUND);

        const columns = await this.boardsService.getColumns(id);
        const cards = await this.boardsService.getCardsByBoard(id);

        return {
            ...board,
            columns: columns.map((col) => ({
                ...col,
                cards: cards.filter((c) => c.column_id === col.id),
            })),
        };
    }

    @Post()
    async createBoard(@Body() body: { title: string, companyType?: 'peruana' | 'extranjera', country?: string, ruc?: string }, @Req() req: Request) {
        const userId = await this.getUserId(req);
        if (!body.title) throw new HttpException('Título requerido', HttpStatus.BAD_REQUEST);

        return this.boardsService.createBoard(body.title, userId, body.companyType || 'peruana', body.country, body.ruc);
    }

    @Put(':id')
    async updateBoard(@Param('id') id: string, @Body() body: { title: string }, @Req() req: Request) {
        const userId = await this.getUserId(req);
        const board = await this.boardsService.updateBoardTitle(id, body.title, userId);
        if (!board) throw new HttpException('Tablero no encontrado', HttpStatus.NOT_FOUND);
        return board;
    }

    @Delete(':id')
    async deleteBoard(@Param('id') id: string, @Req() req: Request) {
        const userId = await this.getUserId(req);
        const deleted = await this.boardsService.deleteBoard(id, userId);
        if (!deleted) throw new HttpException('Tablero no encontrado', HttpStatus.NOT_FOUND);
        return { success: true };
    }

    // ─── Cards ───
    @Post(':boardId/cards')
    async createCard(
        @Param('boardId') boardId: string,
        @Body() body: { columnId: string; title: string; description?: string; documentType?: string; priority?: string },
        @Req() req: Request,
    ) {
        await this.getUserId(req);
        return this.boardsService.createCard(body.columnId, body.title, body.description, body.documentType, body.priority);
    }

    @Put('cards/:cardId')
    async updateCard(@Param('cardId') cardId: string, @Body() body: any, @Req() req: Request) {
        await this.getUserId(req);
        return this.boardsService.updateCard(cardId, body);
    }

    @Put('cards/:cardId/move')
    async moveCard(
        @Param('cardId') cardId: string,
        @Body() body: { targetColumnId: string; targetPosition: number },
        @Req() req: Request,
    ) {
        await this.getUserId(req);
        return this.boardsService.moveCard(cardId, body.targetColumnId, body.targetPosition);
    }

    @Delete('cards/:cardId')
    async deleteCard(@Param('cardId') cardId: string, @Req() req: Request) {
        await this.getUserId(req);
        const deleted = await this.boardsService.deleteCard(cardId);
        if (!deleted) throw new HttpException('Tarjeta no encontrada', HttpStatus.NOT_FOUND);
        return { success: true };
    }
}
