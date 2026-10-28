import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:3001/api';

export default function App() {
  const [theme, setTheme] = useState('light');
  const [currentView, setCurrentView] = useState('client'); 
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || '');
  const [adminPassword, setAdminPassword] = useState('');
  
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    service_id: '',
    date: '',
    time: ''
  });

  const [newServiceData, setNewServiceData] = useState({
    name: '',
    price: '',
    duration: ''
  });

  const [message, setMessage] = useState({ text: '', type: '' });
  const [serviceMessage, setServiceMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    fetchServices();
    fetchAppointments();
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const fetchServices = async () => {
    try {
      const res = await fetch(`${API_URL}/services`);
      if (res.ok) setServices(await res.json());
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await fetch(`${API_URL}/appointments`);
      if (res.ok) setAppointments(await res.json());
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleServiceChange = (e) => {
    setNewServiceData({ ...newServiceData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    try {
      const response = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ text: '¡Agendamento realizado com sucesso!', type: 'success' });
        setFormData({ client_name: '', client_phone: '', service_id: '', date: '', time: '' });
        fetchAppointments();
      } else {
        setMessage({ text: result.error || 'Erro ao realizar agendamento.', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Erro de conexão com o servidor.', type: 'error' });
    }
  };

  // Login de Admin com JWT
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      });

      const result = await response.json();

      if (response.ok) {
        setAdminToken(result.token);
        localStorage.setItem('adminToken', result.token);
        setMessage({ text: '', type: '' });
        setAdminPassword('');
      } else {
        setMessage({ text: result.error || 'Erro na autenticação.', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Erro de conexão com o servidor.', type: 'error' });
    }
  };

  // Cadastrar Serviço (Protegido por JWT)
  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    setServiceMessage({ text: '', type: '' });

    try {
      const response = await fetch(`${API_URL}/services`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(newServiceData)
      });

      const result = await response.json();

      if (response.ok) {
        setServiceMessage({ text: '¡Serviço cadastrado com sucesso!', type: 'success' });
        setNewServiceData({ name: '', price: '', duration: '' });
        fetchServices();
      } else {
        setServiceMessage({ text: result.error || 'Erro ao cadastrar serviço.', type: 'error' });
      }
    } catch (error) {
      setServiceMessage({ text: 'Erro de conexão com o servidor.', type: 'error' });
    }
  };

  // Excluir Agendamento (Protegido por JWT)
  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este agendamiento?')) return;

    try {
      const response = await fetch(`${API_URL}/appointments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (response.ok) {
        setAppointments(appointments.filter((item) => item.id !== id));
      } else {
        const result = await response.json();
        alert(result.error || 'Erro ao excluir agendamento.');
      }
    } catch (error) {
      console.error('Erro de conexão:', error);
      alert('Erro de conexão com o servidor.');
    }
  };

  const handleAdminLogout = () => {
    setAdminToken('');
    localStorage.removeItem('adminToken');
  };

  return (
    <div className="container">
      <div className="nav-bar">
        <h1>Barbearia BlackSkull</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={toggleTheme}>
            {theme === 'light' ? '🌙 Modo Escuro' : '☀️ Modo Claro'}
          </button>
          <button 
            className={`btn ${currentView === 'client' ? '' : 'btn-secondary'}`}
            onClick={() => setCurrentView('client')}
          >
            Área do Cliente
          </button>
          <button 
            className={`btn ${currentView === 'admin' ? '' : 'btn-secondary'}`}
            onClick={() => {
              setCurrentView('admin');
              setMessage({ text: '', type: '' });
            }}
          >
            Painel Admin
          </button>
        </div>
      </div>

      {/* ÁREA DO CLIENTE */}
      {currentView === 'client' && (
        <div className="card">
          <h2>Faça o seu Agendamento</h2>
          <p>Escolha o serviço desejado e o melhor horário para ser atendido.</p>

          {message.text && (
            <div className={`alert alert-${message.type}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Seu Nome:</label>
              <input type="text" name="client_name" value={formData.client_name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Telefone:</label>
              <input type="text" name="client_phone" value={formData.client_phone} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Serviço:</label>
              <select name="service_id" value={formData.service_id} onChange={handleChange} required>
                <option value="">Selecione um serviço...</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} - R$ {s.price} ({s.duration} min)</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Data:</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Horário:</label>
              <input type="time" name="time" value={formData.time} onChange={handleChange} required />
            </div>
            <button type="submit" className="btn">Confirmar Agendamento</button>
          </form>
        </div>
      )}

      {/* ÁREA DO ADMINISTRADOR */}
      {currentView === 'admin' && (
        <div className="card">
          {!adminToken ? (
            <div>
              <h2>Acesso Restrito ao Administrador</h2>
              <p>Digite a senha de acesso para gerar o token de gerenciamento.</p>
              
              {message.text && (
                <div className="alert alert-error">
                  {message.text}
                </div>
              )}

              <form onSubmit={handleAdminLogin}>
                <div className="form-group">
                  <label>Senha Admin:</label>
                  <input 
                    type="password" 
                    value={adminPassword} 
                    onChange={(e) => setAdminPassword(e.target.value)} 
                    required 
                  />
                </div>
                <button type="submit" className="btn">Entrar com JWT</button>
              </form>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Painel de Gestão (Autenticado via JWT)</h2>
                <button className="btn btn-secondary" onClick={handleAdminLogout}>
                  Sair / Limpar Token
                </button>
              </div>

              {/* Cadastrar Novo Serviço */}
              <div style={{ marginBottom: '40px', paddingBottom: '20px', borderBottom: '2px solid var(--border-color)' }}>
                <h3>Cadastrar Novo Serviço</h3>
                {serviceMessage.text && (
                  <div className={`alert alert-${serviceMessage.type}`}>
                    {serviceMessage.text}
                  </div>
                )}
                <form onSubmit={handleServiceSubmit}>
                  <div className="form-group">
                    <label>Nome do Serviço:</label>
                    <input type="text" name="name" value={newServiceData.name} onChange={handleServiceChange} required />
                  </div>
                  <div className="form-group">
                    <label>Preço (R$):</label>
                    <input type="number" step="0.01" name="price" value={newServiceData.price} onChange={handleServiceChange} required />
                  </div>
                  <div className="form-group">
                    <label>Duração (minutos):</label>
                    <input type="number" name="duration" value={newServiceData.duration} onChange={handleServiceChange} required />
                  </div>
                  <button type="submit" className="btn" style={{ backgroundColor: '#10b981' }}>Salvar Novo Serviço</button>
                </form>
              </div>

              {/* Lista de Agendamentos */}
              <div>
                <h3>Agendamentos Cadastrados</h3>
                {appointments.length === 0 ? (
                  <p>Nenhum agendamento cadastrado no momento.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Cliente</th>
                        <th>Telefone</th>
                        <th>Data</th>
                        <th>Horário</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((item) => (
                        <tr key={item.id}>
                          <td>{item.id}</td>
                          <td>{item.client_name}</td>
                          <td>{item.client_phone}</td>
                          <td>{item.date}</td>
                          <td>{item.time}</td>
                          <td>
                            <button 
                              onClick={() => handleDelete(item.id)}
                              style={{ 
                                backgroundColor: '#ef4444', 
                                color: 'white', 
                                border: 'none', 
                                padding: '6px 10px', 
                                borderRadius: '4px', 
                                cursor: 'pointer',
                                fontWeight: '600'
                              }}
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}