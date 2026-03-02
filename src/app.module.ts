import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { BoardsModule } from './boards/boards.module';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth/auth';

import { OperationsModule } from './operations/operations.module';

@Module({
    imports: [BoardsModule, OperationsModule],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(toNodeHandler(auth))
            .forRoutes({ path: '/api/auth/*', method: RequestMethod.ALL });
    }
}
