import React, { useState, useEffect } from "react";
import "./App.css";
import VisaoCliente from "./components/VisaoCliente";
import VisaoAdmin from "./components/VisaoAdmin";
import { API } from "./api";

const FORM_VAZIO = { client_name: '', client_phone: '', service_id: '', date: '', time: '' };

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [currentView, setCurrentView] = useState('client');
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || '');
  const [clientToken, setClientToken] = useState(localStorage.getItem('clientToken') || '');
  const [clientName, setClientName] = useState(localStorage.getItem('clientName') || '');
  const [clientAuthMode, setClientAuthMode] = useState('login');

  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [scheduleConfig, setScheduleConfig] = useState(null);
  const [bookingVersion, setBookingVersion] = useState(0); // muda sempre que agenda/cancela, para recarregar listas
  const [serverWaking, setServerWaking] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [serviceMessage, setServiceMessage] = useState({ text: '', type: '' });

  const [formData, setFormData] = useState({ ...FORM_VAZIO, client_name: clientName });
  const [clientForm, setClientForm] = useState({ name: '', email: '', password: '', consent: false });
  const [newServiceData, setNewServiceData] = useState({ name: '', price: '', duration: '' });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Carrega os dados ao abrir a página e sempre que o admin entra ou sai
  useEffect(() => {
    loadData();
  }, [adminToken]);

  const request = async (endpoint, method = 'GET', body = null, token = '') => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(`${API}${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : null });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (erro) {
      // status 0 = não conseguiu falar com o servidor
      return {
        ok: false,
        status: 0,
        data: { error: 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.' }
      };
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken('');
    setAppointments([]);
  };

  const handleClientLogout = () => {
    setClientToken('');
    setClientName('');
    localStorage.removeItem('clientToken');
    localStorage.removeItem('clientName');
    setFormData({ ...FORM_VAZIO });
    setMessage({ text: '', type: '' });
  };

  const loadData = async () => {
    // O Render (plano gratuito) "dorme" e a primeira requisição pode levar até 1 minuto
    const timer = setTimeout(() => setServerWaking(true), 2500);

    const requests = [request('/services'), request('/config')];
    // A lista de agendamentos só é pedida (e só é entregue) para o administrador
    if (adminToken) requests.push(request('/appointments', 'GET', null, adminToken));
    else setAppointments([]);

    const [resServ, resCfg, resApp] = await Promise.all(requests);
    clearTimeout(timer);
    setServerWaking(false);

    if (resServ.ok) setServices(resServ.data);
    else if (resServ.status === 0) setMessage({ text: resServ.data.error, type: 'error' });
    if (resCfg.ok) setScheduleConfig(resCfg.data);

    if (resApp) {
      if (resApp.ok) setAppointments(resApp.data);
      else if (resApp.status === 401 || resApp.status === 403) handleAdminLogout(); // token expirado
    }
  };

  const handleClientAuth = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    const isLogin = clientAuthMode === 'login';
    const body = isLogin ? { email: clientForm.email, password: clientForm.password } : clientForm;
    const { ok, data } = await request(isLogin ? '/auth/login' : '/auth/register', 'POST', body);

    if (!ok) return setMessage({ text: data.error || 'Erro na autenticação', type: 'error' });

    if (isLogin) {
      setClientToken(data.token);
      setClientName(data.name);
      localStorage.setItem('clientToken', data.token);
      localStorage.setItem('clientName', data.name);
      setFormData({ ...FORM_VAZIO, client_name: data.name });
      setMessage({ text: '', type: '' });
    } else {
      setMessage({ text: 'Cadastro realizado com sucesso! Faça login.', type: 'success' });
      setClientAuthMode('login');
    }
    setClientForm({ name: '', email: '', password: '', consent: false });
  };

  // Devolve true se o agendamento foi gravado (a tela só avisa o barbeiro nesse caso)
  const handleSubmitAppointment = async () => {
    setMessage({ text: '', type: '' });
    const { ok, status, data } = await request('/appointments', 'POST', formData, clientToken);

    if (status === 401 || status === 403) {
      handleClientLogout();
      setMessage({ text: 'Sua sessão expirou. Faça login novamente.', type: 'error' });
      return false;
    }
    if (ok) {
      setMessage({ text: 'Agendamento realizado com sucesso!', type: 'success' });
      setFormData({ ...FORM_VAZIO, client_name: clientName });
      setBookingVersion((v) => v + 1);
      return true;
    }
    setMessage({ text: data.error || 'Erro ao agendar', type: 'error' });
    if (status === 409) setBookingVersion((v) => v + 1); // horário foi ocupado: atualiza a grade
    return false;
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    setServiceMessage({ text: '', type: '' });
    const { ok, data } = await request('/services', 'POST', newServiceData, adminToken);
    if (ok) {
      setServiceMessage({ text: 'Serviço cadastrado com sucesso!', type: 'success' });
      setNewServiceData({ name: '', price: '', duration: '' });
      loadData();
    } else {
      setServiceMessage({ text: data.error || 'Erro ao cadastrar serviço', type: 'error' });
    }
  };

  const handleStatusChange = async (id, status) => {
    const { ok } = await request(`/appointments/${id}/status`, 'PATCH', { status }, adminToken);
    if (ok) loadData();
  };

  const handleDelete = async (id) => {
    const { ok } = await request(`/appointments/${id}`, 'DELETE', null, adminToken);
    if (ok) setAppointments((atual) => atual.filter((a) => a.id !== id));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClientAuthChange = (e) => {
    const { name, type, value, checked } = e.target;
    setClientForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const isWideCard = currentView === 'admin' && adminToken;

  return (
    <div>
      <button
        className="theme-toggle-btn"
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        title={theme === 'light' ? 'Mudar para Modo Escuro' : 'Mudar para Modo Claro'}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      <div className="container">
        <div className={`card ${isWideCard ? 'card-wide' : 'card-compact'}`}>
          <div className="app-header">
            <h1 className="app-title">BARBEARIA BLACKSKULL</h1>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className={`btn ${currentView === 'client' ? '' : 'btn-secondary'}`}
                onClick={() => { setCurrentView('client'); setMessage({ text: '', type: '' }); }}
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                Área do Cliente
              </button>
              <button
                className={`btn ${currentView === 'admin' ? '' : 'btn-secondary'}`}
                onClick={() => { setCurrentView('admin'); setMessage({ text: '', type: '' }); }}
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                Painel Admin
              </button>
            </div>
          </div>

          {serverWaking && (
            <div className="alert alert-warning">
              ⏳ O servidor está acordando. Na primeira visita isso pode levar até 1 minuto; aguarde um instante.
            </div>
          )}

          {currentView === 'client' ? (
            <VisaoCliente
              clientToken={clientToken}
              clientName={clientName}
              clientAuthMode={clientAuthMode}
              setClientAuthMode={setClientAuthMode}
              clientForm={clientForm}
              handleClientAuthChange={handleClientAuthChange}
              handleClientLogin={handleClientAuth}
              handleClientRegister={handleClientAuth}
              handleClientLogout={handleClientLogout}
              message={message}
              setMessage={setMessage}
              formData={formData}
              handleChange={handleFormChange}
              handleSubmit={handleSubmitAppointment}
              services={services}
              scheduleConfig={scheduleConfig}
              request={request}
              bookingVersion={bookingVersion}
              refresh={() => setBookingVersion((v) => v + 1)}
            />
          ) : (
            <VisaoAdmin
              adminToken={adminToken}
              setAdminToken={setAdminToken}
              message={message}
              newServiceData={newServiceData}
              handleServiceChange={(e) => setNewServiceData({ ...newServiceData, [e.target.name]: e.target.value })}
              handleServiceSubmit={handleServiceSubmit}
              serviceMessage={serviceMessage}
              appointments={appointments}
              handleStatusChange={handleStatusChange}
              handleDelete={handleDelete}
              services={services}
              loadData={loadData}
            />
          )}
        </div>
      </div>
    </div>
  );
}
