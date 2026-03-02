const Database = require('better-sqlite3');
const db = new Database('./sqlite.db');

try {
    db.exec("ALTER TABLE boards ADD COLUMN company_type TEXT DEFAULT 'peruana' CHECK(company_type IN ('peruana', 'extranjera'))");
    console.log("Added company_type column");
} catch (e) {
    console.log("Error adding company_type (might already exist):", e.message);
}

try {
    db.exec("ALTER TABLE boards ADD COLUMN country TEXT");
    console.log("Added country column");
} catch (e) {
    console.log("Error adding country (might already exist):", e.message);
}
