const Database = require('better-sqlite3');

const db = new Database('./sqlite.db');

// Show latest boards
console.log('--- LATEST BOARDS ---');
const latestBoard = db.prepare('SELECT id, title FROM boards ORDER BY created_at DESC LIMIT 1').get();
console.log(latestBoard);

if (latestBoard) {
    console.log(`\n--- COLUMNS FOR BOARD ${latestBoard.id} ---`);
    const cols = db.prepare('SELECT id, title FROM columns WHERE board_id = ?').all(latestBoard.id);
    console.log(cols);

    const splaftCol = cols.find(c => c.title === 'Lista SPLAFT');
    if (splaftCol) {
        console.log(`\n--- CARDS IN SPLAFT COLUMN ${splaftCol.id} ---`);
        const cards = db.prepare('SELECT id, title, link FROM cards WHERE column_id = ?').all(splaftCol.id);
        console.log(cards);
    }
}
