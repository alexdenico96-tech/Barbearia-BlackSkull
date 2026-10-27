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

// Inicializa o servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando com sucesso em http://localhost:${PORT}`);
});
