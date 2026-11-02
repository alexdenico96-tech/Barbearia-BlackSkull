import React, { useState, useEffect } from 'react';
import ModalConfirmacao from './ModalConfirmacao';
import { API } from '../api';
import { hojeLocal, inicioDaSemana, formatarData, STATUS_LABEL } from '../utils';

const POR_PAGINA = 20;
const brl = (valor) => `R$ ${Number(valor).toFixed(2)}`;
const selectStyle = {
  padding: '6px', borderRadius: '6px', background: 'var(--input-bg)',
  color: 'var(--text-color)', border: '1px solid var(--border-color)', fontSize: '0.85rem'
};

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

  const [actionMessage, setActionMessage] = useState({ text: '', type: '' });
  const [periodo, setPeriodo] = useState('proximos'); // proximos | passados | todos
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [limite, setLimite] = useState(POR_PAGINA);

  const [senhaForm, setSenhaForm] = useState({ atual: '', nova: '', confirmar: '' });
  const [senhaMessage, setSenhaMessage] = useState({ text: '', type: '' });

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
        setAdminPassword('');
      } else {
        setLoginError(data.error || 'E-mail ou senha incorretos.');
      }
    } catch (error) {
      setLoginError('Erro de conexão com o servidor.');
    }
  };

  const handleAppointmentServiceChange = async (appointmentId, newServiceId) => {
    setActionMessage({ text: '', type: '' });
    try {
      const res = await fetch(`${API}/appointments/${appointmentId}/service`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({ service_id: Number(newServiceId) })
      });
      if (res.ok) {
        if (loadData) loadData();
      } else {
        const data = await res.json().catch(() => ({}));
        setActionMessage({ text: data.error || 'Não foi possível alterar o serviço.', type: 'error' });
      }
    } catch (error) {
      setActionMessage({ text: 'Erro de conexão com o servidor.', type: 'error' });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSenhaMessage({ text: '', type: '' });
    if (senhaForm.nova !== senhaForm.confirmar) {
      return setSenhaMessage({ text: 'A confirmação não é igual à nova senha.', type: 'error' });
    }
    try {
      const res = await fetch(`${API}/admin/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({ currentPassword: senhaForm.atual, newPassword: senhaForm.nova })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSenhaForm({ atual: '', nova: '', confirmar: '' });
        setSenhaMessage({ text: 'Senha alterada com sucesso!', type: 'success' });
      } else {
        setSenhaMessage({ text: data.error || 'Não foi possível alterar a senha.', type: 'error' });
      }
    } catch (error) {
      setSenhaMessage({ text: 'Erro de conexão com o servidor.', type: 'error' });
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

  /* ---------- Faturamento (somente serviços Concluídos) ---------- */
  const precoDe = (item) => {
    const servico = services.find((s) => String(s.id) === String(item.service_id));
    return Number(servico ? servico.price : (item.service_price || 0));
  };

  const hoje = hojeLocal();
  const semanaInicio = inicioDaSemana(hoje);
  const mesPrefixo = hoje.slice(0, 7);
  const concluidos = appointments.filter((item) => (item.status || 'pending') === 'completed');
  const somar = (lista) => lista.reduce((acc, item) => acc + precoDe(item), 0);

  const faturamento = {
    hoje: somar(concluidos.filter((i) => i.date === hoje)),
    semana: somar(concluidos.filter((i) => i.date >= semanaInicio && i.date <= hoje)),
    mes: somar(concluidos.filter((i) => i.date.startsWith(mesPrefixo))),
    total: somar(concluidos)
  };

  /* ---------- Filtros da lista ---------- */
  const termo = busca.trim().toLowerCase();
  const filtrados = appointments
    .filter((i) => periodo === 'todos' || (periodo === 'proximos' ? i.date >= hoje : i.date < hoje))
    .filter((i) => statusFiltro === 'todos' || (i.status || 'pending') === statusFiltro)
    .filter((i) => !termo || `${i.client_name} ${i.client_phone}`.toLowerCase().includes(termo));
  if (periodo === 'passados') filtrados.reverse(); // mais recentes primeiro
  const visiveis = filtrados.slice(0, limite);

  const aoFiltrar = (setter) => (e) => { setter(e.target.value); setLimite(POR_PAGINA); };

  return (
    <div>
      {needsSetup ? (
        <div>
          <img src="/logo.webp" alt="Logotipo" className="auth-logo" />
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
              <label>Senha do Administrador (mínimo de 8 caracteres):</label>
              <input
                type="password"
                value={setupData.password}
                onChange={(e) => setSetupData({ ...setupData, password: e.target.value })}
                minLength={8}
                maxLength={72}
                required
              />
            </div>
            <button type="submit" className="btn">Cadastrar Administrador</button>
          </form>
        </div>
      ) : !adminToken ? (
        <div>
          <img src="/logo.webp" alt="Logotipo" className="auth-logo" />
          <h2>Painel Administrativo</h2>
          <p style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '15px' }}>
            Acesso restrito ao administrador do sistema.
          </p>
          {setupMessage.text && setupMessage.type === 'success' && (
            <div className="alert alert-success">{setupMessage.text}</div>
          )}
          {loginError && <div className="alert alert-error">{loginError}</div>}
          {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

          <form onSubmit={handleAdminLoginSubmit}>
            <div className="form-group">
              <label>E-mail:</label>
              <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Senha:</label>
              <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn">Entrar no Painel</button>
          </form>
        </div>
      ) : (
        <div>
          <div className="welcome-bar">
            <h2 style={{ margin: 0 }}>Gestão BlackSkull</h2>
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

          <div className="stats-grid">
            {[
              ['Hoje', faturamento.hoje],
              ['Esta semana', faturamento.semana],
              ['Este mês', faturamento.mes],
              ['Total', faturamento.total]
            ].map(([titulo, valor]) => (
              <div className="stat-card" key={titulo}>
                <span>{titulo}</span>
                <strong>{brl(valor)}</strong>
              </div>
            ))}
          </div>
          <p className="hint" style={{ marginTop: '-8px' }}>Faturamento considera apenas agendamentos Concluídos.</p>

          <div style={{ marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
            <h3>Cadastrar Novo Serviço</h3>
            {serviceMessage.text && <div className={`alert alert-${serviceMessage.type}`}>{serviceMessage.text}</div>}
            <form onSubmit={handleServiceSubmit}>
              <div className="form-group">
                <label>Nome do Serviço:</label>
                <input type="text" name="name" value={newServiceData.name} onChange={handleServiceChange} maxLength={100} required />
              </div>
              <div className="form-group">
                <label>Preço (R$):</label>
                <input type="number" step="0.01" min="0.01" name="price" value={newServiceData.price} onChange={handleServiceChange} required />
              </div>
              <div className="form-group">
                <label>Duração (minutos):</label>
                <input type="number" min="1" step="1" name="duration" value={newServiceData.duration} onChange={handleServiceChange} required />
              </div>
              <button type="submit" className="btn" style={{ backgroundColor: '#10b981' }}>Salvar Serviço</button>
            </form>
          </div>

          <div>
            <h3>Agendamentos</h3>

            <div className="filters-bar">
              <select value={periodo} onChange={aoFiltrar(setPeriodo)} style={selectStyle}>
                <option value="proximos">Hoje em diante</option>
                <option value="passados">Anteriores a hoje</option>
                <option value="todos">Todos</option>
              </select>
              <select value={statusFiltro} onChange={aoFiltrar(setStatusFiltro)} style={selectStyle}>
                <option value="todos">Todos os status</option>
                {Object.entries(STATUS_LABEL).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>{rotulo}</option>
                ))}
              </select>
              <input
                type="search"
                placeholder="Buscar por nome ou telefone"
                value={busca}
                onChange={aoFiltrar(setBusca)}
                style={{ ...selectStyle, flex: '1 1 180px' }}
              />
            </div>

            {actionMessage.text && <div className={`alert alert-${actionMessage.type}`}>{actionMessage.text}</div>}

            {filtrados.length === 0 ? (
              <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Nenhum agendamento encontrado.</p>
            ) : (
              <>
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
                      {visiveis.map((item) => (
                        <tr key={item.id}>
                          <td>{item.client_name}<br /><small style={{ opacity: 0.7 }}>{item.client_phone}</small></td>
                          <td>{formatarData(item.date)} às {item.time}</td>
                          <td>
                            <select
                              value={item.service_id}
                              onChange={(e) => handleAppointmentServiceChange(item.id, e.target.value)}
                              style={selectStyle}
                            >
                              {services.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({brl(s.price)})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              value={item.status || 'pending'}
                              onChange={(e) => handleStatusChange(item.id, e.target.value)}
                              style={selectStyle}
                            >
                              {Object.entries(STATUS_LABEL).map(([valor, rotulo]) => (
                                <option key={valor} value={valor}>{rotulo}</option>
                              ))}
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
                <p className="hint">
                  Mostrando {visiveis.length} de {filtrados.length}.
                  {filtrados.length > visiveis.length && (
                    <>
                      {' '}
                      <button type="button" className="link-btn" onClick={() => setLimite((l) => l + POR_PAGINA)}>
                        Mostrar mais
                      </button>
                    </>
                  )}
                </p>
              </>
            )}
          </div>

          <details className="privacy-box" style={{ marginTop: '25px' }}>
            <summary>Alterar minha senha</summary>
            <form onSubmit={handleChangePassword} style={{ marginTop: '12px' }}>
              {senhaMessage.text && <div className={`alert alert-${senhaMessage.type}`}>{senhaMessage.text}</div>}
              <div className="form-group">
                <label>Senha atual:</label>
                <input type="password" value={senhaForm.atual} onChange={(e) => setSenhaForm({ ...senhaForm, atual: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Nova senha (mínimo de 8 caracteres):</label>
                <input type="password" minLength={8} maxLength={72} value={senhaForm.nova} onChange={(e) => setSenhaForm({ ...senhaForm, nova: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Confirmar nova senha:</label>
                <input type="password" minLength={8} maxLength={72} value={senhaForm.confirmar} onChange={(e) => setSenhaForm({ ...senhaForm, confirmar: e.target.value })} required />
              </div>
              <button type="submit" className="btn">Salvar nova senha</button>
            </form>
          </details>
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
