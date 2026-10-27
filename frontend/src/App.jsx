import React, { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [mensagem, setMensagem] = useState('Carregando conexão com o backend...');

  // Testa a conexão com o backend assim que a tela carrega
  useEffect(() => {
    axios.get('http://localhost:3001/api/health')
      .then(response => {
        setMensagem(response.data.message);
      })
      .catch(error => {
        setMensagem('Erro: Não foi possível conectar ao backend. Certifique-se de que o servidor Node está rodando na porta 3001.');
      });
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#121212', color: '#fff', minHeight: '100vh' }}>
      <h1>Barbearia BlackSkull 💀</h1>
      <p style={{ color: '#00ff00', fontWeight: 'bold' }}>{mensagem}</p>
    </div>
  );
}

export default App;
