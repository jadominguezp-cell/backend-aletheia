import { betterAuth } from 'better-auth';
import { Pool } from 'pg';

let authInstance: any = null;

export function getAuth() {
    if (!authInstance) {
        authInstance = betterAuth({
            baseURL: process.env.BASE_URL || 'http://localhost:3000',
            database: new Pool({
                connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aletheia'
            }),
            emailAndPassword: {
                enabled: true,
            },
            trustedOrigins: ['http://localhost:5173'],
            basePath: '/api/auth',
        });
    }
    return authInstance;
}
