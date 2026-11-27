const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { dbPath } = require('./env');

// Ensure the database directory exists before opening SQLite
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign key constraints for integrity and concurrency
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

module.exports = db;
