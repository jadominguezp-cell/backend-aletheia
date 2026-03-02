import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth/auth';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        rawBody: true,
    });

    // Enable CORS for frontend
    app.enableCors({
        origin: 'http://localhost:5173',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    });

    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`🚀 Aletheia Server running on http://localhost:${port}`);
}
bootstrap();
