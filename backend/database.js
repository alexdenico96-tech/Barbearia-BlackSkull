const Database = require('better-sqlite3');
const path = require('path');

// Cria ou conecta ao arquivo físico do banco de dados na pasta atual
const db = new Database(path.join(__dirname, 'barbearia.db'));

// Habilita chaves estrangeiras no SQLite
db.pragma('foreign_keys = ON');

// Criação das tabelas
db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    duration INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    service_id INTEGER NOT NULL,
    date TEXT NOT NULL,       -- Formato: YYYY-MM-DD
    time TEXT NOT NULL,       -- Formato: HH:MM
    status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id)
  );
`);
// Tabela de usuários (clientes)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )
`);
// Inserir alguns serviços padrão
const row = db.prepare('SELECT COUNT(*) as count FROM services').get();
if (row.count === 0) {
  const insert = db.prepare('INSERT INTO services (name, price, duration) VALUES (?, ?, ?)');
  insert.run('Corte de Cabelo', 45.00, 30);
  insert.run('Barba Completa', 35.00, 30);
  insert.run('Combo (Cabelo + Barba)', 70.00, 60);
  console.log('🌱 Serviços iniciais inseridos com sucesso!');
}

module.exports = db;
