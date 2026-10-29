const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
const PORT = 3001;
const SECRET_KEY = 'sua_chave_secreta_super_segura_jwt'; // Em produção, use variáveis de ambiente (.env)

// Middlewares
app.use(cors());
app.use(express.json());

// Rota de teste
app.get('/api/health', (req, res) => {
  res.json({ status: "OK", message: "O backend da barbearia está rodando!" });
});

/* ==========================================
   ROTA DE AUTENTICAÇÃO ADMIN (JWT)
   ========================================== */
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  
  // Senha simples para exemplo (em produção, usar hash no banco)
  if (password === 'admin123') {
    // Gera um token válido por 2 horas
    const token = jwt.sign({ role: 'admin' }, SECRET_KEY, { expiresIn: '2h' });
    return res.json({ token });
  }
  
  return res.status(401).json({ error: "Senha de administrador incorreta." });
});

// Middleware para verificar o Token JWT
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: "Acesso negado. Token não fornecido." });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token inválido ou expirado." });
    }
    req.user = user;
    next();
  });
};

/* ==========================================
   ROTAS DE SERVIÇOS
   ========================================== */
app.get('/api/services', (req, res) => {
  try {
    const services = db.prepare('SELECT * FROM services').all();
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar serviços." });
  }
});

// Rota protegida com JWT
app.post('/api/services', verifyJWT, (req, res) => {
  try {
    const { name, price, duration } = req.body;
    if (!name || !price || !duration) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios." });
    }
    const insert = db.prepare('INSERT INTO services (name, price, duration) VALUES (?, ?, ?)');
    const result = insert.run(name, price, duration);
    res.status(201).json({ id: result.lastInsertRowid, name, price, duration });
  } catch (error) {
    res.status(500).json({ error: "Erro ao salvar o serviço." });
  }
});

/* ==========================================
   ROTAS DE AGENDAMENTOS
   ========================================== */
app.post('/api/appointments', (req, res) => {
  try {
    const { client_name, client_phone, service_id, date, time } = req.body;
    if (!client_name || !client_phone || !service_id || !date || !time) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios." });
    }

    const conflict = db.prepare(`
      SELECT * FROM appointments 
      WHERE date = ? AND time = ? AND status != 'cancelled'
    `).get(date, time);

    if (conflict) {
      return res.status(400).json({ error: "Este horário já foi preenchido. Escolha outro." });
    }

    const insert = db.prepare(`
      INSERT INTO appointments (client_name, client_phone, service_id, date, time) 
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = insert.run(client_name, client_phone, service_id, date, time);

    res.status(201).json({ id: result.lastInsertRowid, client_name, client_phone, service_id, date, time });
  } catch (error) {
    res.status(500).json({ error: "Erro ao processar o agendamento." });
  }
});

app.get('/api/appointments', (req, res) => {
  try {
    const appointments = db.prepare(`
      SELECT appointments.*, services.name as service_name, services.price as service_price
      FROM appointments
      JOIN services ON appointments.service_id = services.id
      ORDER BY date ASC, time ASC
    `).all();
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar agendamentos." });
  }
});

// Rota protegida com JWT
app.delete('/api/appointments/:id', verifyJWT, (req, res) => {
  try {
    const { id } = req.params;
    const deleteStmt = db.prepare('DELETE FROM appointments WHERE id = ?');
    const result = deleteStmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Agendamento não encontrado." });
    }
    res.json({ message: "Agendamento excluído com sucesso!", id });
  } catch (error) {
    res.status(500).json({ error: "Erro ao excluir o agendamento." });
  }
});

// Cadastro de Cliente
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios." });
    }

    const insert = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
    const result = insert.run(name, email, password);

    res.status(201).json({ id: result.lastInsertRowid, name, email });
  } catch (error) {
    res.status(400).json({ error: "Erro ao cadastrar. O e-mail já pode estar em uso." });
  }
});

// Login de Cliente
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, password);

    if (!user) {
      return res.status(401).json({ error: "E-mail ou senha incorretos." });
    }

    // Gera um token JWT para o cliente
    const token = jwt.sign({ id: user.id, name: user.name, role: 'client' }, SECRET_KEY, { expiresIn: '4h' });
    res.json({ token, name: user.name });
  } catch (error) {
    res.status(500).json({ error: "Erro ao realizar login." });
  }
});

app.patch('/api/appointments/:id/status', verifyJWT, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // ex: 'pending', 'completed', 'cancelled'

    const update = db.prepare('UPDATE appointments SET status = ? WHERE id = ?');
    const result = update.run(status, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Agendamento não encontrado." });
    }

    res.json({ message: "Status atualizado com sucesso!", status });
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar status." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});