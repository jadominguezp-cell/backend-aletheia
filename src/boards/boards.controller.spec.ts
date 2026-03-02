import { Test, TestingModule } from '@nestjs/testing';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';
import { HttpException, UnauthorizedException } from '@nestjs/common';

jest.mock('../auth/auth', () => ({
    auth: {
        api: {
            getSession: jest.fn()
        }
    }
}));

import { auth } from '../auth/auth';

describe('BoardsController', () => {
    let controller: BoardsController;
    let service: BoardsService;

    const mockBoardsService = {
        getAllBoards: jest.fn(),
        getBoard: jest.fn(),
        createBoard: jest.fn(),
        updateBoardTitle: jest.fn(),
        deleteBoard: jest.fn(),
        getColumns: jest.fn(),
        getCardsByBoard: jest.fn(),
        createCard: jest.fn(),
        updateCard: jest.fn(),
        moveCard: jest.fn(),
        deleteCard: jest.fn()
    };

    const mockRequest = { headers: {} } as any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [BoardsController],
            providers: [{ provide: BoardsService, useValue: mockBoardsService }],
        }).compile();

        controller = module.get<BoardsController>(BoardsController);
        service = module.get<BoardsService>(BoardsService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should throw UnauthorizedException if user is not authenticated', async () => {
        (auth.api.getSession as jest.Mock).mockResolvedValueOnce(null);

        await expect(controller.getBoards(mockRequest)).rejects.toThrow(HttpException);
    });

    describe('when authenticated', () => {
        beforeEach(() => {
            (auth.api.getSession as jest.Mock).mockResolvedValue({ user: { id: 'u1' } });
        });

        it('should get all boards', async () => {
            mockBoardsService.getAllBoards.mockResolvedValueOnce([{ id: 'b1' }]);
            const result = await controller.getBoards(mockRequest);
            expect(result).toEqual([{ id: 'b1' }]);
            expect(service.getAllBoards).toHaveBeenCalledWith('u1');
        });

        it('should get a single board if user has access', async () => {
            const board = { id: 'b1', user_id: 'u1' };
            mockBoardsService.getBoard.mockResolvedValueOnce(board);
            mockBoardsService.getColumns.mockResolvedValueOnce([]);
            mockBoardsService.getCardsByBoard.mockResolvedValueOnce([]);

            const result = await controller.getBoard('b1', mockRequest);
            expect(result).toEqual({ ...board, columns: [] });
        });

        it('should throw HttpException on getBoard if user does not own it', async () => {
            // Mock returns undefined if not found or unauthorized
            mockBoardsService.getBoard.mockResolvedValueOnce(undefined);
            await expect(controller.getBoard('b1', mockRequest)).rejects.toThrow(HttpException);
        });

        it('should create a board', async () => {
            mockBoardsService.createBoard.mockResolvedValueOnce({ id: 'b1', title: 'Test' });
            const result = await controller.createBoard({ title: 'Test' }, mockRequest);
            expect(result).toEqual({ id: 'b1', title: 'Test' });
            expect(service.createBoard).toHaveBeenCalledWith('Test', 'u1', 'peruana', undefined, undefined);
        });

        it('should update a board title', async () => {
            mockBoardsService.getBoard.mockResolvedValueOnce({ id: 'b1', user_id: 'u1' });
            mockBoardsService.updateBoardTitle.mockResolvedValueOnce({ id: 'b1', title: 'New' });
            const result = await controller.updateBoard('b1', { title: 'New' }, mockRequest);
            expect(result).toEqual({ id: 'b1', title: 'New' });
            expect(service.updateBoardTitle).toHaveBeenCalledWith('b1', 'New', 'u1');
        });

        it('should move a card', async () => {
            mockBoardsService.moveCard.mockResolvedValueOnce({ id: 'c1', column_id: 'col2' });
            const result = await controller.moveCard('c1', { targetColumnId: 'col2', targetPosition: 2 }, mockRequest);
            expect(result).toEqual({ id: 'c1', column_id: 'col2' });
            expect(service.moveCard).toHaveBeenCalledWith('c1', 'col2', 2);
        });
    });
});
