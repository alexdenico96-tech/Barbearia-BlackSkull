const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');
const {
  DATE_REGEX, TIME_REGEX, loadConfig, timeToMinutes, nowInTimezone,
  validateBookingDate, getSlots
} = require('./scheduling');

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';
const BCRYPT_ROUNDS = 10;
const schedule = loadConfig();

/* ==========================================
   SEGREDO DO JWT (sempre via variável de ambiente)
   ========================================== */
let SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
  if (IS_PROD) {
    console.error('❌ JWT_SECRET não definido. Configure essa variável de ambiente no Render.');
    process.exit(1);
  }
  // Em desenvolvimento: segredo aleatório (os tokens deixam de valer ao reiniciar)
  SECRET_KEY = crypto.randomBytes(48).toString('hex');
  console.warn('⚠️  JWT_SECRET não definido: usando um segredo temporário (apenas desenvolvimento).');
}

/* ==========================================
   MIDDLEWARES GLOBAIS
   ========================================== */
app.set('trust proxy', 1); // Render fica atrás de um proxy; necessário para o rate limit ver o IP real
app.use(helmet());
app.use(cors({
  origin: [
    'https://barbearia-black-skull.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true
}));
app.use(express.json({ limit: '10kb' }));

const limiter = (windowMs, limit, error, extra = {}) => rateLimit({
  windowMs, limit, standardHeaders: true, legacyHeaders: false, message: { error }, ...extra
});

// Login: só conta as tentativas que falham
const authLimiter = limiter(15 * 60 * 1000, 10,
  'Muitas tentativas. Aguarde alguns minutos e tente novamente.', { skipSuccessfulRequests: true });
const registerLimiter = limiter(60 * 60 * 1000, 10,
  'Muitos cadastros a partir deste endereço. Tente novamente mais tarde.');
const bookingLimiter = limiter(60 * 60 * 1000, 20,
  'Muitos agendamentos em pouco tempo. Tente novamente mais tarde.');
const readLimiter = limiter(60 * 1000, 120,
  'Muitas requisições. Aguarde um instante.');

/* ==========================================
   AUXILIARES DE VALIDAÇÃO
   ========================================== */
// Hash falso: iguala o tempo de resposta quando o usuário não existe
const DUMMY_HASH = bcrypt.hashSync('senha-falsa-para-igualar-tempo', BCRYPT_ROUNDS);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9()+\-\s]{8,20}$/;
const VALID_STATUS = ['pending', 'confirmed', 'completed', 'cancelled'];

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const cleanText = (value) => String(value || '').trim();
const isValidPassword = (value, min) =>
  typeof value === 'string' && value.length >= min && value.length <= 72; // 72 = limite do bcrypt

/* ==========================================
   AUTENTICAÇÃO E AUTORIZAÇÃO
   ========================================== */
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  }

  jwt.verify(token, SECRET_KEY, { algorithms: ['HS256'] }, (err, payload) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido ou expirado.' });
    }
    req.user = payload;
    next();
  });
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Você não tem permissão para esta ação.' });
  }
  next();
};

const verifyAdmin = [verifyJWT, requireRole('admin')];
const verifyClient = [verifyJWT, requireRole('client')];

/* ==========================================
   ROTAS PÚBLICAS BÁSICAS
   ========================================== */
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'O backend da barbearia está rodando!' });
});

// Regras de funcionamento (o frontend usa para montar o formulário)
app.get('/api/config', readLimiter, (req, res) => {
  res.json({
    openTime: schedule.openTime,
    closeTime: schedule.closeTime,
    slotMinutes: schedule.slotMinutes,
    businessDays: schedule.businessDays,
    maxAdvanceDays: schedule.maxAdvanceDays,
    today: nowInTimezone(schedule.timezone).date
  });
});

/* ==========================================
   ROTAS DO ADMINISTRADOR
   ========================================== */

// Configura o único administrador (só funciona se ainda não existir um)
app.post('/api/admin/setup', authLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!EMAIL_REGEX.test(email) || !isValidPassword(password, 8)) {
      return res.status(400).json({ error: 'Informe um e-mail válido e uma senha de 8 a 72 caracteres.' });
    }

    const existente = db.prepare('SELECT id FROM admin WHERE id = 1').get();
    if (existente) {
      return res.status(400).json({ error: 'O administrador já se encontra configurado no sistema.' });
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    db.prepare('INSERT INTO admin (id, email, password) VALUES (1, ?, ?)').run(email, hash);

    res.status(201).json({ message: 'Administrador configurado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao configurar o administrador.' });
  }
});

app.post('/api/admin/login', authLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    const admin = db.prepare('SELECT * FROM admin WHERE id = 1').get();

    // Sempre executa o compare (mesmo sem admin) para não revelar nada pelo tempo de resposta
    const senhaOk = await bcrypt.compare(password, admin ? admin.password : DUMMY_HASH);
    const emailOk = admin && normalizeEmail(admin.email) === email;

    if (!admin || !emailOk || !senhaOk) {
      return res.status(401).json({ error: 'E-mail ou palavra-passe de administrador incorretos.' });
    }

    const token = jwt.sign({ role: 'admin' }, SECRET_KEY, { algorithm: 'HS256', expiresIn: '4h' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Erro no início de sessão do administrador.' });
  }
});

app.get('/api/admin/check', (req, res) => {
  try {
    const admin = db.prepare('SELECT id FROM admin WHERE id = 1').get();
    res.json({ needsSetup: !admin });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar status do administrador.' });
  }
});

app.post('/api/admin/change-password', verifyAdmin, authLimiter, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== 'string' || !isValidPassword(newPassword, 8)) {
      return res.status(400).json({ error: 'A nova senha deve ter de 8 a 72 caracteres.' });
    }

    const admin = db.prepare('SELECT * FROM admin WHERE id = 1').get();
    if (!admin || !(await bcrypt.compare(currentPassword, admin.password))) {
      return res.status(401).json({ error: 'A senha atual está incorreta.' });
    }

    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    db.prepare('UPDATE admin SET password = ? WHERE id = 1').run(hash);
    res.json({ message: 'Senha alterada com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao alterar a senha.' });
  }
});

/* ==========================================
   ROTAS DE SERVIÇOS
   ========================================== */
app.get('/api/services', (req, res) => {
  try {
    const services = db.prepare('SELECT * FROM services').all();
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar serviços.' });
  }
});

// Somente administrador
app.post('/api/services', verifyAdmin, (req, res) => {
  try {
    const name = cleanText(req.body.name);
    const price = Number(req.body.price);
    const duration = Number(req.body.duration);

    if (!name || name.length > 100 ||
        !Number.isFinite(price) || price <= 0 ||
        !Number.isInteger(duration) || duration <= 0) {
      return res.status(400).json({ error: 'Informe nome, preço (> 0) e duração em minutos (inteiro > 0).' });
    }

    const result = db.prepare('INSERT INTO services (name, price, duration) VALUES (?, ?, ?)')
      .run(name, price, duration);
    res.status(201).json({ id: result.lastInsertRowid, name, price, duration });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar o serviço.' });
  }
});

/* ==========================================
   DISPONIBILIDADE E AGENDAMENTOS
   ========================================== */

// Agendamentos ativos do dia, com a duração de cada serviço
const existingFor = (date) => db.prepare(`
  SELECT a.time, COALESCE(s.duration, ?) AS duration
  FROM appointments a
  LEFT JOIN services s ON s.id = a.service_id
  WHERE a.date = ? AND COALESCE(a.status, 'pending') != 'cancelled'
`).all(schedule.slotMinutes, date);

// Horários livres de um dia para um serviço (público: não expõe dados de clientes)
app.get('/api/availability', readLimiter, (req, res) => {
  try {
    const date = cleanText(req.query.date);
    const serviceId = Number(req.query.service_id);

    if (!DATE_REGEX.test(date) || !Number.isInteger(serviceId)) {
      return res.status(400).json({ error: 'Informe a data (AAAA-MM-DD) e o serviço.' });
    }

    const service = db.prepare('SELECT duration FROM services WHERE id = ?').get(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Serviço não encontrado.' });
    }

    const dateError = validateBookingDate(date, schedule);
    if (dateError) {
      return res.json({ date, slots: [], unavailable: true, message: dateError });
    }

    const slots = getSlots({ date, duration: service.duration, existing: existingFor(date), config: schedule });
    res.json({ date, slots });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao consultar horários.' });
  }
});

// Qualquer cliente logado pode agendar
app.post('/api/appointments', bookingLimiter, verifyClient, (req, res) => {
  try {
    const client_name = cleanText(req.body.client_name);
    const client_phone = cleanText(req.body.client_phone);
    const service_id = Number(req.body.service_id);
    const date = cleanText(req.body.date);
    const time = cleanText(req.body.time);

    if (!client_name || client_name.length > 100 ||
        !PHONE_REGEX.test(client_phone) ||
        !Number.isInteger(service_id) ||
        !DATE_REGEX.test(date) ||
        !TIME_REGEX.test(time)) {
      return res.status(400).json({ error: 'Dados inválidos. Confira nome, telefone, serviço, data e horário.' });
    }

    const service = db.prepare('SELECT id, duration FROM services WHERE id = ?').get(service_id);
    if (!service) {
      return res.status(400).json({ error: 'Serviço não encontrado.' });
    }

    const dateError = validateBookingDate(date, schedule);
    if (dateError) {
      return res.status(400).json({ error: dateError });
    }

    // Esta checagem e o INSERT abaixo rodam de forma síncrona (sem await entre eles),
    // então dois pedidos simultâneos não conseguem reservar o mesmo horário.
    const slots = getSlots({ date, duration: service.duration, existing: existingFor(date), config: schedule });
    const slot = slots.find((s) => s.time === time);

    if (!slot) {
      return res.status(400).json({ error: 'Horário fora do expediente para a duração deste serviço.' });
    }
    if (!slot.available) {
      return res.status(409).json({ error: 'Este horário não está mais disponível. Escolha outro.' });
    }

    const result = db.prepare(`
      INSERT INTO appointments (client_name, client_phone, service_id, date, time, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(client_name, client_phone, service_id, date, time, req.user.id);

    res.status(201).json({ id: result.lastInsertRowid, client_name, client_phone, service_id, date, time });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar o agendamento.' });
  }
});

// Somente administrador (contém nome e telefone dos clientes)
app.get('/api/appointments', verifyAdmin, (req, res) => {
  try {
    const appointments = db.prepare(`
      SELECT appointments.*, services.name as service_name, services.price as service_price
      FROM appointments
      JOIN services ON appointments.service_id = services.id
      ORDER BY date ASC, time ASC
    `).all();
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar agendamentos.' });
  }
});

app.delete('/api/appointments/:id', verifyAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'ID inválido.' });
    }

    const result = db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }
    res.json({ message: 'Agendamento excluído com sucesso!', id });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir o agendamento.' });
  }
});

app.patch('/api/appointments/:id/status', verifyAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'ID inválido.' });
    }
    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json({ error: `Status inválido. Use: ${VALID_STATUS.join(', ')}.` });
    }

    const result = db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }
    res.json({ message: 'Status atualizado com sucesso!', status });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar status.' });
  }
});

app.patch('/api/appointments/:id/service', verifyAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const service_id = Number(req.body.service_id);

    if (!Number.isInteger(id) || !Number.isInteger(service_id)) {
      return res.status(400).json({ error: 'Dados inválidos.' });
    }

    const service = db.prepare('SELECT id FROM services WHERE id = ?').get(service_id);
    if (!service) {
      return res.status(404).json({ error: 'Serviço não encontrado.' });
    }

    const result = db.prepare('UPDATE appointments SET service_id = ? WHERE id = ?').run(service_id, id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }
    res.json({ message: 'Serviço atualizado com sucesso!', service_id });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar o serviço.' });
  }
});

/* ==========================================
   ÁREA DO CLIENTE: "MEUS AGENDAMENTOS"
   ========================================== */
app.get('/api/my-appointments', verifyClient, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT a.id, a.date, a.time, a.status, a.client_name,
             s.name AS service_name, s.price AS service_price
      FROM appointments a
      LEFT JOIN services s ON s.id = a.service_id
      WHERE a.user_id = ?
      ORDER BY a.date DESC, a.time DESC
      LIMIT 50
    `).all(req.user.id);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar seus agendamentos.' });
  }
});

app.patch('/api/my-appointments/:id/cancel', verifyClient, (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'ID inválido.' });
    }

    // Só encontra se o agendamento for DESTE cliente
    const appt = db.prepare('SELECT * FROM appointments WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!appt) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }
    if (!['pending', 'confirmed', null].includes(appt.status)) {
      return res.status(400).json({ error: 'Este agendamento não pode mais ser cancelado.' });
    }

    const now = nowInTimezone(schedule.timezone);
    const jaPassou = appt.date < now.date || (appt.date === now.date && timeToMinutes(appt.time) <= now.minutes);
    if (jaPassou) {
      return res.status(400).json({ error: 'Não é possível cancelar um horário que já passou.' });
    }

    db.prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ?").run(id);
    res.json({ message: 'Agendamento cancelado.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao cancelar o agendamento.' });
  }
});

/* ==========================================
   AUTENTICAÇÃO DE CLIENTES
   ========================================== */
app.post('/api/auth/register', registerLimiter, async (req, res) => {
  try {
    const name = cleanText(req.body.name);
    const email = normalizeEmail(req.body.email);
    const { password, consent } = req.body;

    if (!name || name.length > 100 || !EMAIL_REGEX.test(email) || !isValidPassword(password, 6)) {
      return res.status(400).json({ error: 'Informe nome, e-mail válido e uma senha de 6 a 72 caracteres.' });
    }
    if (consent !== true) {
      return res.status(400).json({ error: 'É necessário aceitar o aviso de privacidade para se cadastrar.' });
    }

    const existente = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(email);
    if (existente) {
      return res.status(409).json({ error: 'Este e-mail já está em uso.' });
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = db.prepare('INSERT INTO users (name, email, password, consent_at) VALUES (?, ?, ?, ?)')
      .run(name, email, hash, new Date().toISOString());

    res.status(201).json({ id: result.lastInsertRowid, name, email });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao cadastrar. Tente novamente.' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(email);

    const senhaOk = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
    if (!user || !senhaOk) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: 'client' },
      SECRET_KEY,
      { algorithm: 'HS256', expiresIn: '4h' }
    );
    res.json({ token, name: user.name });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao realizar login.' });
  }
});

// LGPD: o cliente pode excluir a própria conta (exige a senha)
app.post('/api/auth/delete-account', verifyClient, authLimiter, async (req, res) => {
  try {
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Senha incorreta.' });
    }

    const hoje = nowInTimezone(schedule.timezone).date;

    db.transaction(() => {
      // Libera os horários futuros que ainda estavam reservados
      db.prepare(`
        UPDATE appointments SET status = 'cancelled'
        WHERE user_id = ? AND COALESCE(status, 'pending') IN ('pending', 'confirmed') AND date >= ?
      `).run(user.id, hoje);
      // Mantém o histórico (faturamento) sem dados pessoais
      db.prepare(`
        UPDATE appointments SET client_name = 'Cliente removido', client_phone = '-', user_id = NULL
        WHERE user_id = ?
      `).run(user.id);
      db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    })();

    res.json({ message: 'Sua conta e seus dados pessoais foram excluídos.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir a conta.' });
  }
});

/* ==========================================
   TRATAMENTO DE ERROS
   ========================================== */
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

app.use((err, req, res, next) => {
  // Ex.: JSON malformado ou corpo grande demais
  const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 500;
  res.status(status).json({ error: status === 500 ? 'Erro interno do servidor.' : 'Requisição inválida.' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`🕘 Atendimento: ${schedule.openTime}–${schedule.closeTime}, dias ${schedule.businessDays.join(',')} (${schedule.timezone})`);
});
