import React, { useState, useEffect } from 'react';
import ModalConfirmacao from './ModalConfirmacao';

const API = 'https://barbearia-blackskull.onrender.com/api';

export default function VisaoAdmin({
  adminToken,
  setAdminToken,
  message,
  newServiceData,
  handleServiceChange,
  handleServiceSubmit,
  serviceMessage,
  appointments,
  handleStatusChange,
  handleDelete,
  services,
  loadData
}) {
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupData, setSetupData] = useState({ email: '', password: '' });
  const [setupMessage, setSetupMessage] = useState({ text: '', type: '' });
  
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [modalExclusaoAberto, setModalExclusaoAberto] = useState(false);
  const [agendamentoParaExcluir, setAgendamentoParaExcluir] = useState(null);

  useEffect(() => {
    verificarAdminCadastrado();
  }, []);

  const verificarAdminCadastrado = async () => {
    try {
      const res = await fetch(`${API}/admin/check`);
      const data = await res.json();
      if (data.needsSetup) {
        setNeedsSetup(true);
      }
    } catch (error) {
      console.error('Erro ao verificar admin:', error);
    }
  };

  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/admin/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setupData)
      });
      const data = await res.json();
      if (res.ok) {
        setSetupMessage({ text: 'Administrador configurado com sucesso! Faça login abaixo.', type: 'success' });
        setNeedsSetup(false);
      } else {
        setSetupMessage({ text: data.error || 'Erro ao configurar.', type: 'error' });
      }
    } catch (error) {
      setSetupMessage({ text: 'Erro de conexão com o servidor.', type: 'error' });
    }
  };

  const handleAdminLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${API}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('adminToken', data.token);
        setAdminToken(data.token);
      } else {
        setLoginError(data.error || 'E-mail ou senha incorretos.');
      }
    } catch (error) {
      setLoginError('Erro de conexão com o servidor.');
    }
  };

  const handleAppointmentServiceChange = async (appointmentId, newServiceId) => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API}/appointments/${appointmentId}/service`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ service_id: newServiceId })
      });
      if (res.ok && loadData) {
        loadData();
      }
    } catch (error) {
      console.error('Erro ao atualizar serviço do agendamento:', error);
    }
  };

  const confirmarExclusao = (id) => {
    setAgendamentoParaExcluir(id);
    setModalExclusaoAberto(true);
  };

  const executarExclusao = () => {
    if (agendamentoParaExcluir) {
      handleDelete(agendamentoParaExcluir);
      setModalExclusaoAberto(false);
      setAgendamentoParaExcluir(null);
    }
  };

  const faturamentoTotal = appointments
    .filter(item => (item.status || 'pending') === 'completed')
    .reduce((acc, item) => {
      const servicoEncontrado = services.find(s => String(s.id) === String(item.service_id));
      const preco = servicoEncontrado ? servicoEncontrado.price : (item.service_price || 0);
      return acc + Number(preco);
    }, 0);

  return (
    <div>
      {needsSetup ? (
        <div>
          <img src="/Skull Dourado.png" alt="Skull Dourado" className="auth-logo" />
          <h2>Configuração Inicial do Admin</h2>
          <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '15px' }}>
            Defina o e-mail e a senha do único administrador do sistema.
          </p>
          {setupMessage.text && (
            <div className={`alert alert-${setupMessage.type}`}>{setupMessage.text}</div>
          )}
          <form onSubmit={handleSetupSubmit}>
            <div className="form-group">
              <label>E-mail do Administrador:</label>
              <input 
                type="email" 
                value={setupData.email} 
                onChange={(e) => setSetupData({ ...setupData, email: e.target.value })} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Senha do Administrador:</label>
              <input 
                type="password" 
                value={setupData.password} 
                onChange={(e) => setSetupData({ ...setupData, password: e.target.value })} 
                required 
              />
            </div>
            <button type="submit" className="btn">Cadastrar Administrador</button>
          </form>
        </div>
      ) : !adminToken ? (
        <div>
          <img src="/Logotipo.png" alt="Logotipo" className="auth-logo" />
          <h2>Painel Administrativo</h2>
          <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '15px' }}>
            Acesso restrito ao administrador do sistema.
          </p>
          {loginError && <div className="alert alert-error">{loginError}</div>}
          {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}
          
          <form onSubmit={handleAdminLoginSubmit}>
            <div className="form-group">
              <label>E-mail:</label>
              <input 
                type="email" 
                value={adminEmail} 
                onChange={(e) => setAdminEmail(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Senha:</label>
              <input 
                type="password" 
                value={adminPassword} 
                onChange={(e) => setAdminPassword(e.target.value)} 
                required 
              />
            </div>
            <button type="submit" className="btn">Entrar no Painel</button>
          </form>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <h2>Gestão BlackSkull</h2>
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                setAdminToken('');
                localStorage.removeItem('adminToken');
              }}
            >
              Sair
            </button>
          </div>

          <div style={{ background: 'var(--input-bg)', padding: '14px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.9rem' }}>Faturamento Total (Concluídos): </span>
            <strong style={{ fontSize: '1.2rem', color: '#10b981', display: 'block', marginTop: '4px' }}>
              R$ {faturamentoTotal.toFixed(2)}
            </strong>
          </div>

          <div style={{ marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
            <h3>Cadastrar Novo Serviço</h3>
            {serviceMessage.text && <div className={`alert alert-${serviceMessage.type}`}>{serviceMessage.text}</div>}
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
              <button type="submit" className="btn" style={{ backgroundColor: '#10b981' }}>Salvar Serviço</button>
            </form>
          </div>

          <div>
            <h3>Agendamentos</h3>
            {appointments.length === 0 ? (
              <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Nenhum agendamento encontrado.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Data/Hora</th>
                      <th>Serviço (Editar)</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((item) => (
                      <tr key={item.id}>
                        <td>{item.client_name}<br/><small style={{ opacity: 0.7 }}>{item.client_phone}</small></td>
                        <td>{item.date} às {item.time}</td>
                        <td>
                          <select
                            value={item.service_id}
                            onChange={(e) => handleAppointmentServiceChange(item.id, e.target.value)}
                            style={{ padding: '6px', borderRadius: '6px', background: 'var(--input-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                          >
                            {services.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} (R$ {Number(s.price).toFixed(2)})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select 
                            value={item.status || 'pending'} 
                            onChange={(e) => handleStatusChange(item.id, e.target.value)}
                            style={{ padding: '6px', borderRadius: '6px', background: 'var(--input-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}
                          >
                            <option value="pending">Pendente</option>
                            <option value="completed">Concluído</option>
                            <option value="cancelled">Cancelado</option>
                          </select>
                        </td>
                        <td>
                          <button 
                            onClick={() => confirmarExclusao(item.id)}
                            style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <ModalConfirmacao 
        aberto={modalExclusaoAberto}
        titulo="Confirmar Exclusão"
        mensagem="Tem certeza de que deseja excluir este agendamento permanentemente?"
        aoConfirmar={executarExclusao}
        aoCancelar={() => setModalExclusaoAberto(false)}
      />
    </div>
  );
}