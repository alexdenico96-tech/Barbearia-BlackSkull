const express = require('express');
const cors = require('cors');
const db = require('./database'); // Importa a nossa conexão do SQLite

const app = express();
const PORT = 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Rota de teste
app.get('/api/health', (req, res) => {
  res.json({ status: "OK", message: "O backend da barbearia está rodando!" });
});

/* ==========================================
   ROTAS DE SERVIÇOS
   ========================================== */

// 1. Listar todos os serviços
app.get('/api/services', (req, res) => {
  try {
    // Busca todos os registros da tabela 'services'
    const services = db.prepare('SELECT * FROM services').all();
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar serviços no banco de dados." });
  }
});

// 2. Cadastrar um novo serviço (Painel do Administrador)
app.post('/api/services', (req, res) => {
  try {
    const { name, price, duration } = req.body;

    // Validação simples de campos obrigatórios
    if (!name || !price || !duration) {
      return res.status(400).json({ error: "Todos os campos (name, price, duration) são obrigatórios." });
    }

    // Prepara a inserção no SQLite
    const insert = db.prepare('INSERT INTO services (name, price, duration) VALUES (?, ?, ?)');
    const result = insert.run(name, price, duration);

    // Retorna o serviço criado junto com o ID gerado pelo banco
    res.status(201).json({
      id: result.lastInsertRowid,
      name,
      price,
      duration
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao salvar o novo serviço." });
  }
});

/* ==========================================
   ROTAS DE AGENDAMENTOS
   ========================================== */

// 1. Criar um novo agendamento (Com validação de conflito de horário)
app.post('/api/appointments', (req, res) => {
  try {
    const { client_name, client_phone, service_id, date, time } = req.body;

    // Validação de campos obrigatórios
    if (!client_name || !client_phone || !service_id || !date || !time) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios." });
    }

    // REGRA DE NEGÓCIO PRINCIPAL: Verifica se já existe um agendamento ativo para a mesma data e hora
    const conflict = db.prepare(`
      SELECT * FROM appointments 
      WHERE date = ? AND time = ? AND status != 'cancelled'
    `).get(date, time);

    // Se encontrou algum registro, bloqueia o agendamento imediatamente
    if (conflict) {
      return res.status(400).json({ 
        error: "Desculpe, este horário já foi preenchido por outro cliente. Por favor, escolha outro momento." 
      });
    }

    // Se o horário estiver livre, faz a inserção no banco de dados
    const insert = db.prepare(`
      INSERT INTO appointments (client_name, client_phone, service_id, date, time) 
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = insert.run(client_name, client_phone, service_id, date, time);

    // Retorna o agendamento criado com sucesso
    res.status(201).json({
      id: result.lastInsertRowid,
      client_name,
      client_phone,
      service_id,
      date,
      time,
      status: 'pending'
    });

  } catch (error) {
    res.status(500).json({ error: "Erro ao processar o agendamento no servidor." });
  }
});

// 2. Listar todos os agendamentos (Painel do Administrador)
app.get('/api/appointments', (req, res) => {
  try {
    // Fazemos um JOIN com a tabela de serviços para trazer o nome e o preço do serviço no mesmo pacote
    const appointments = db.prepare(`
      SELECT appointments.*, services.name as service_name, services.price as service_price
      FROM appointments
      JOIN services ON appointments.service_id = services.id
      ORDER BY date ASC, time ASC
    `).all();

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar a lista de agendamentos." });
  }
});

/* ==========================================
   ROTA PARA EXCLUIR AGENDAMENTO (ADMIN)
   ========================================== */
app.delete('/api/appointments/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Prepara a instrução para deletar o agendamento pelo ID
    const deleteStmt = db.prepare('DELETE FROM appointments WHERE id = ?');
    const result = deleteStmt.run(id);

    // Verifica se encontrou e removeu o registro
    if (result.changes === 0) {
      return res.status(404).json({ error: "Agendamento não encontrado." });
    }

    res.json({ message: "Agendamento excluído com sucesso!", id });
  } catch (error) {
    res.status(500).json({ error: "Erro ao excluir o agendamento no servidor." });
  }
});


// Inicializa o servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando com sucesso em http://localhost:${PORT}`);
});
