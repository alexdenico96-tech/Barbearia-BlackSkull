// backend/database.js
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Caminho do banco:
// - Em produção (Render com Disk persistente): defina DB_PATH=/var/data/barbearia.db
// - Em desenvolvimento: usa backend/barbearia.db
const dbPath = process.env.DB_PATH || path.resolve(__dirname, 'barbearia.db');

// Garante que a pasta do banco existe (útil para o caminho do disco persistente)
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

/* ==========================================
   SCHEMA (idêntico ao barbearia.db original)
   O IF NOT EXISTS só cria as tabelas se o arquivo estiver vazio;
   num banco já existente nada é alterado.
   ========================================== */
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
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    email TEXT NOT NULL,
    password TEXT NOT NULL
  );
`);

/* ==========================================
   MIGRAÇÕES ADITIVAS (seguras: só adicionam, nunca removem dados)
   ========================================== */
const columnExists = (table, column) =>
  db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);

// Quem fez o agendamento (permite "Meus agendamentos" e exclusão de conta - LGPD)
if (!columnExists('appointments', 'user_id')) {
  db.exec('ALTER TABLE appointments ADD COLUMN user_id INTEGER REFERENCES users(id)');
}
// Data/hora em que o cliente aceitou o aviso de privacidade
if (!columnExists('users', 'consent_at')) {
  db.exec('ALTER TABLE users ADD COLUMN consent_at TEXT');
}
db.exec('CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(date, time)');
db.exec('CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments(user_id)');

/* ==========================================
   MIGRAÇÃO: senhas em texto puro -> bcrypt
   Roda a cada inicialização, mas só age sobre senhas que ainda NÃO são hash
   bcrypt. Antes de alterar, salva uma cópia do banco ao lado do original.
   ========================================== */
const BCRYPT_ROUNDS = 10;
const BCRYPT_REGEX = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

function migrarSenhasParaHash() {
  const pendentesUsers = db.prepare('SELECT id, password FROM users').all()
    .filter((u) => !BCRYPT_REGEX.test(u.password));
  const pendentesAdmin = db.prepare('SELECT id, password FROM admin').all()
    .filter((a) => !BCRYPT_REGEX.test(a.password));

  if (pendentesUsers.length === 0 && pendentesAdmin.length === 0) return;

  const backupPath = `${dbPath}.backup-antes-hash-${Date.now()}`;
  fs.copyFileSync(dbPath, backupPath);
  console.log(`💾 Backup criado antes da migração de senhas: ${backupPath}`);

  const atualizarUser = db.prepare('UPDATE users SET password = ? WHERE id = ?');
  const atualizarAdmin = db.prepare('UPDATE admin SET password = ? WHERE id = ?');

  db.transaction(() => {
    for (const u of pendentesUsers) {
      atualizarUser.run(bcrypt.hashSync(u.password, BCRYPT_ROUNDS), u.id);
    }
    for (const a of pendentesAdmin) {
      atualizarAdmin.run(bcrypt.hashSync(a.password, BCRYPT_ROUNDS), a.id);
    }
  })();

  console.log(`🔐 Senhas convertidas para hash: ${pendentesUsers.length} cliente(s), ${pendentesAdmin.length} admin.`);
}

migrarSenhasParaHash();

/* ==========================================
   BACKUP AUTOMÁTICO DIÁRIO
   Guarda uma cópia por dia em <pasta do banco>/backups e mantém as últimas N.
   Desative com BACKUP_ENABLED=false. ATENÇÃO: fica no mesmo disco do banco;
   baixe uma cópia de vez em quando para um lugar seguro.
   ========================================== */
const backupDir = process.env.BACKUP_DIR || path.join(path.dirname(dbPath), 'backups');
const BACKUP_KEEP = Number(process.env.BACKUP_KEEP) || 7;
const BACKUP_FILE_REGEX = /^barbearia-\d{4}-\d{2}-\d{2}\.db$/;

async function fazerBackup() {
  try {
    fs.mkdirSync(backupDir, { recursive: true });
    const dia = new Date().toISOString().slice(0, 10);
    await db.backup(path.join(backupDir, `barbearia-${dia}.db`));

    const arquivos = fs.readdirSync(backupDir).filter((f) => BACKUP_FILE_REGEX.test(f)).sort();
    arquivos.slice(0, Math.max(0, arquivos.length - BACKUP_KEEP))
      .forEach((f) => fs.unlinkSync(path.join(backupDir, f)));
  } catch (error) {
    console.error('❌ Falha no backup automático:', error.message);
  }
}

if (process.env.BACKUP_ENABLED !== 'false') {
  setTimeout(fazerBackup, 10 * 1000).unref();
  setInterval(fazerBackup, 24 * 60 * 60 * 1000).unref();
}

console.log('✅ Banco de dados em uso:', dbPath);

module.exports = db;
