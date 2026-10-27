const express = require('express');
const cors = require('cors');
const db = require('./database'); // Importa o banco de dados

const app = express();
const PORT = 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Rota de teste
app.get('/api/health', (req, res) => {
  res.json({ status: "OK", message: "O backend da barbearia está rodando!" });
});

// Inicializa o servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando com sucesso em http://localhost:${PORT}`);
});
