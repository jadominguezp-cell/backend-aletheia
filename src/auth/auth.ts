import { betterAuth } from 'better-auth';
import { Pool } from 'pg';

export const auth: any = betterAuth({
    database: new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aletheia'
    }),
    emailAndPassword: {
        enabled: true,
    },
    trustedOrigins: ['http://localhost:5173'],
    basePath: '/api/auth',
});
