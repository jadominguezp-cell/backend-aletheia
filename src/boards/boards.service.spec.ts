import { Test, TestingModule } from '@nestjs/testing';
import { BoardsService } from './boards.service';
import * as dbModule from '../database/database';

jest.mock('../database/database');

describe('BoardsService', () => {
    let service: BoardsService;

    const mockDbClient = {
        execute: jest.fn()
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [BoardsService],
        }).compile();

        service = module.get<BoardsService>(BoardsService);

        jest.spyOn(dbModule, 'initDb').mockResolvedValue(mockDbClient as any);
        await service.onModuleInit();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('Boards', () => {
        it('should get all boards for a user', async () => {
            const mockRows = [{ id: 'b1', title: 'Board 1', user_id: 'u1' }];
            mockDbClient.execute.mockResolvedValueOnce({ rows: mockRows });

            const result = await service.getAllBoards('u1');

            expect(result).toEqual(mockRows);
            expect(mockDbClient.execute).toHaveBeenCalledWith(expect.objectContaining({
                sql: expect.stringContaining('SELECT * FROM boards WHERE user_id = ?'),
                args: ['u1']
            }));
        });

        it('should create a board and default columns', async () => {
            const mockBoard = { id: 'b1', title: 'New Board', user_id: 'u1' };
            // First DB execute is INSERT board
            mockDbClient.execute.mockResolvedValueOnce({ rowsAffected: 1 });
            // Then 4 for INSERT columns
            mockDbClient.execute.mockResolvedValueOnce({ rowsAffected: 1 });
            mockDbClient.execute.mockResolvedValueOnce({ rowsAffected: 1 });
            mockDbClient.execute.mockResolvedValueOnce({ rowsAffected: 1 });
            mockDbClient.execute.mockResolvedValueOnce({ rowsAffected: 1 });
            // Then getBoard returns the new board
            mockDbClient.execute.mockResolvedValueOnce({ rows: [mockBoard] });

            const result = await service.createBoard('New Board', 'u1');

            expect(result).toEqual(mockBoard);
            expect(mockDbClient.execute).toHaveBeenCalledTimes(6);
        });

        it('should delete a board completely', async () => {
            // Mock getColumns
            mockDbClient.execute.mockResolvedValueOnce({ rows: [{ id: 'c1' }, { id: 'c2' }] });
            // Mock DELETE cards for col c1, c2
            mockDbClient.execute.mockResolvedValueOnce({ rowsAffected: 1 });
            mockDbClient.execute.mockResolvedValueOnce({ rowsAffected: 1 });
            // Mock DELETE columns
            mockDbClient.execute.mockResolvedValueOnce({ rowsAffected: 2 });
            // Mock DELETE board
            mockDbClient.execute.mockResolvedValueOnce({ rowsAffected: 1 });

            const result = await service.deleteBoard('b1', 'u1');

            expect(result).toBe(true);
            expect(mockDbClient.execute).toHaveBeenCalledTimes(5);
        });
    });

    describe('Cards', () => {
        it('should create a card and calculate its position correctly', async () => {
            const mockCard = { id: 'card1', title: 'New Card', position: 2 };

            // maxPos query
            mockDbClient.execute.mockResolvedValueOnce({ rows: [{ maxPos: 1 }] });
            // insert query
            mockDbClient.execute.mockResolvedValueOnce({ rowsAffected: 1 });
            // return new card query
            mockDbClient.execute.mockResolvedValueOnce({ rows: [mockCard] });

            const result = await service.createCard('col1', 'New Card', 'desc', 'type', 'alta');

            expect(result).toEqual(mockCard);
            expect(mockDbClient.execute).toHaveBeenCalledWith(expect.objectContaining({
                sql: expect.stringContaining('INSERT INTO cards'),
                args: expect.arrayContaining(['col1', 'New Card', 'desc', 'type', 'alta', 2])
            }));
        });
    });
});
