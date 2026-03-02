import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

// Mock better-auth to avoid ESM compilation errors in Jest
jest.mock('better-auth', () => ({
    betterAuth: jest.fn(() => ({
        handler: jest.fn(),
        api: {
            getSession: jest.fn().mockResolvedValue({ user: { id: 'test-user-id' } })
        }
    })),
}));

jest.mock('better-auth/node', () => ({
    toNodeHandler: jest.fn(),
    fromNodeHeaders: jest.fn(),
}));

import { AppModule } from '../src/app.module';

describe.skip('App Use Cases (e2e) [Requires live PostgreSQL DB]', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    let boardId: string;

    it('Use Case 1: Creating a board automatically creates default columns and an initial operation record', async () => {
        // 1. Create a board
        const createBoardRes = await request(app.getHttpServer())
            .post('/api/boards')
            .send({
                title: 'Test Board Auto',
                company_type: 'peruana',
            })
            .expect(201);

        expect(createBoardRes.body.id).toBeDefined();
        boardId = createBoardRes.body.id;

        // 2. Fetch the board to verify it was created
        const getBoardRes = await request(app.getHttpServer())
            .get(`/api/boards/${boardId}`)
            .expect(200);

        expect(getBoardRes.body.title).toBe('Test Board Auto');

        // 3. Verify columns were auto-created
        expect(getBoardRes.body.columns).toBeDefined();
        expect(getBoardRes.body.columns.length).toBeGreaterThan(0);
        expect(getBoardRes.body.columns.some((c: any) => c.title.includes('Lista'))).toBe(true);

        // 4. Verify an operation record was created
        const getOpRes = await request(app.getHttpServer())
            .get(`/api/operations/board/${boardId}`)
            .expect(200);

        expect(getOpRes.body.board_id).toBe(boardId);
    });

    it('Use Case 2: Deleting a board cascade deletes its operations', async () => {
        // 1. Ensure operation exists before delete
        await request(app.getHttpServer())
            .get(`/api/operations/board/${boardId}`)
            .expect(200);

        // 2. Delete the board
        await request(app.getHttpServer())
            .delete(`/api/boards/${boardId}`)
            .expect(200);

        // 3. Try to fetch the operation again - should be not found
        await request(app.getHttpServer())
            .get(`/api/operations/board/${boardId}`)
            .expect(404);
    });
});
