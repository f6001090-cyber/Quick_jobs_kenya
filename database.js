const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "quickjobs.db");

async function setupDatabase() {
    const SQL = await initSqlJs({
        locateFile: file =>
            path.join(__dirname, "node_modules/sql.js/dist", file)
    });

    let db;

    // Load existing database if it exists
    if (fs.existsSync(dbPath)) {
        const file = fs.readFileSync(dbPath);
        db = new SQL.Database(file);
    } else {
        db = new SQL.Database();
    }

    // USERS
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            phone TEXT NOT NULL UNIQUE,
            email TEXT UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'worker',
            wallet_balance REAL NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // JOBS
    db.run(`
        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT,
            budget REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'open',
            hired_worker_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // APPLICATIONS
    db.run(`
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id INTEGER NOT NULL,
            worker_id INTEGER NOT NULL,
            message TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            UNIQUE(job_id, worker_id)
        )
    `);

    // TRANSACTIONS
    db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            reference TEXT,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'completed',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // WITHDRAWALS
    db.run(`
        CREATE TABLE IF NOT EXISTS withdrawals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            phone TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            processed_at DATETIME
        )
    `);

    // Save database
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));

    console.log("");
    console.log("=================================");
    console.log("     QUICK JOBS KENYA DATABASE");
    console.log("=================================");
    console.log("Database initialized successfully.");
    console.log("Database file: quickjobs.db");
    console.log("");
    console.log("Tables created:");
    console.log("- users");
    console.log("- jobs");
    console.log("- applications");
    console.log("- transactions");
    console.log("- withdrawals");
    console.log("=================================");
    console.log("");

    db.close();
}

setupDatabase().catch(error => {
    console.error("");
    console.error("DATABASE ERROR:");
    console.error(error);
    console.error("");
    process.exit(1);
});
