import Database from 'better-sqlite3';

const db = new Database('./sqlite.db');

console.log('--- USERS ---');
console.log(db.prepare('SELECT * FROM user').all());

console.log('\n--- ACCOUNTS (PASSWORDS) ---');
console.log(db.prepare('SELECT * FROM account').all());
