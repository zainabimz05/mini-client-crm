import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB file path is in /database/crm.db relative to root
const dbDir = path.resolve(__dirname, '../../database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, 'crm.db');
const schemaPath = path.join(dbDir, 'schema.sql');
const seedPath = path.join(dbDir, 'seed.sql');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    return;
  }

  console.log('Connected to SQLite database at:', dbPath);

  // Enable foreign keys for relational integrity.
  db.run('PRAGMA foreign_keys = ON', (fkErr) => {
    if (fkErr) {
      console.error('Failed to enable foreign keys:', fkErr.message);
      return;
    }

    initializeDatabase();
  });
});

function initializeDatabase() {
  if (!fs.existsSync(schemaPath)) {
    console.error('schema.sql not found at:', schemaPath);
    return;
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  db.exec(schemaSql, (schemaErr) => {
    if (schemaErr) {
      console.error('Schema initialization error:', schemaErr.message);
      return;
    }

    db.get('SELECT COUNT(*) AS count FROM clients', (countErr, row) => {
      if (countErr) {
        console.error('Seed check error:', countErr.message);
        return;
      }

      if (row && row.count > 0) {
        console.log('Database already has data, skipping seed.');
        return;
      }

      if (!fs.existsSync(seedPath)) {
        console.log('seed.sql not found, skipping seed step.');
        return;
      }

      const seedSql = fs.readFileSync(seedPath, 'utf8');

      db.exec(seedSql, (seedErr) => {
        if (seedErr) {
          console.error('Seed initialization error:', seedErr.message);
        } else {
          console.log('Sample seed data inserted.');
        }
      });
    });
  });
}

// Helper to run queries with promises
export const query = {
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }
};

export default db;
