const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'intellex.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database error:', err.message);
  } else {
    console.log('SQLite database connected');
  }
});

// Create EVENTS table (only this for now)
db.run(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    title TEXT,
    date TEXT,
    description TEXT,
    link TEXT,
    images TEXT
  )
`);
// TEAM table
db.run(`
  CREATE TABLE IF NOT EXISTS team (
    id INTEGER PRIMARY KEY,
    name TEXT,
    role TEXT,
    dept TEXT,
    photo TEXT
  )
`);

// PROJECTS table
db.run(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY,
    title TEXT,
    description TEXT,
    tech TEXT,
    repoLink TEXT
  )
`);

// SETTINGS table
db.run(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`);

// USERS table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    passwordHash TEXT
  )
`);
 
module.exports = db;
