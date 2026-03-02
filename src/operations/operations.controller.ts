import { Controller, Get, Put, Body, Param, Req, HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { OperationsService } from './operations.service';
import { auth } from '../auth/auth';

@Controller('api/operations')
export class OperationsController {
    constructor(private readonly operationsService: OperationsService) { }

    private async getUserId(req: Request): Promise<string> {
        const session = await auth.api.getSession({ headers: req.headers as any });
        if (!session?.user?.id) {
            throw new HttpException('No autorizado', HttpStatus.UNAUTHORIZED);
        }
        return session.user.id;
    }

    @Get()
    async getOperations(@Req() req: Request) {
        const userId = await this.getUserId(req);
        return this.operationsService.getOperationsByUser(userId);
    }

    @Get('board/:boardId')
    async getOperationByBoard(@Param('boardId') boardId: string, @Req() req: Request) {
        const userId = await this.getUserId(req);
        // The service logic must retrieve the operation for the user's board
        // Assuming operationsService.getOperationByBoard exists, else we use a workaround
        // Since we don't have getOperationByBoard in the view, I'll use getOperationsByUser and filter.
        const ops = await this.operationsService.getOperationsByUser(userId);
        const operation = ops.find(o => o.board_id === boardId);
        if (!operation) throw new HttpException('Operación no encontrada para este tablero', HttpStatus.NOT_FOUND);
        return operation;
    }

    @Get(':id')
    async getOperation(@Param('id') id: string, @Req() req: Request) {
        const userId = await this.getUserId(req);
        const operation = await this.operationsService.getOperationById(id, userId);
        if (!operation) throw new HttpException('Operación no encontrada', HttpStatus.NOT_FOUND);
        return operation;
    }

    @Put(':id')
    async updateOperation(@Param('id') id: string, @Body() body: any, @Req() req: Request) {
        const userId = await this.getUserId(req);
        if (!body.data) throw new HttpException('Datos de operación requeridos', HttpStatus.BAD_REQUEST);

        const updated = await this.operationsService.updateOperation(id, body.data, userId);
        if (!updated) throw new HttpException('Operación no encontrada', HttpStatus.NOT_FOUND);
        return updated;
    }
}
