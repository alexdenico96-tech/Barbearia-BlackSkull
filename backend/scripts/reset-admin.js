// Redefine (ou cria) o e-mail e a senha do administrador.
// Útil se a senha for esquecida. Uso (dentro da pasta backend):
//   node scripts/reset-admin.js novo@email.com NovaSenhaForte123
process.env.BACKUP_ENABLED = 'false';

const bcrypt = require('bcryptjs');
const db = require('../database');

const [emailArg, password] = process.argv.slice(2);
const email = String(emailArg || '').trim().toLowerCase();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 8 || password.length > 72) {
  console.error('Uso: node scripts/reset-admin.js <email> <senha com 8 a 72 caracteres>');
  process.exit(1);
}

db.prepare(`
  INSERT INTO admin (id, email, password) VALUES (1, ?, ?)
  ON CONFLICT(id) DO UPDATE SET email = excluded.email, password = excluded.password
`).run(email, bcrypt.hashSync(password, 10));

console.log(`✅ Administrador atualizado: ${email}`);
