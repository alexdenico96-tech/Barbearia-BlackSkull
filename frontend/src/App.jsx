import React, { useState, useEffect } from "react";
import "./App.css";
import VisaoCliente from "./components/VisaoCliente";
import VisaoAdmin from "./components/VisaoAdmin";

const API = 'http://localhost:3001/api';

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [currentView, setCurrentView] = useState('client');
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || '');
  const [clientToken, setClientToken] = useState(localStorage.getItem('clientToken') || '');
  const [clientName, setClientName] = useState(localStorage.getItem('clientName') || '');
  const [clientAuthMode, setClientAuthMode] = useState('login');
  
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [serviceMessage, setServiceMessage] = useState({ text: '', type: '' });

  const [formData, setFormData] = useState({ client_name: clientName, client_phone: '', service_id: '', date: '', time: '' });
  const [clientForm, setClientForm] = useState({ name: '', email: '', password: '' });
  const [newServiceData, setNewServiceData] = useState({ name: '', price: '', duration: '' });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    loadData();
  }, [theme]);

  const request = async (endpoint, method = 'GET', body = null, token = '') => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API}${endpoint}`, { method, headers, body: body ? JSON.stringify(body) : null });
    const data = await res.json();
    return { ok: res.ok, data };
  };

  const loadData = async () => {
    const [resServ, resApp] = await Promise.all([request('/services'), request('/appointments')]);
    if (resServ.ok) setServices(resServ.data);
    if (resApp.ok) setAppointments(resApp.data);
  };

  const handleClientAuth = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    const endpoint = clientAuthMode === 'login' ? '/auth/login' : '/auth/register';
    const { ok, data } = await request(endpoint, 'POST', clientForm);
    
    if (!ok) return setMessage({ text: data.error || 'Erro na autenticação', type: 'error' });
    
    if (clientAuthMode === 'login') {
      setClientToken(data.token);
      setClientName(data.name);
      localStorage.setItem('clientToken', data.token);
      localStorage.setItem('clientName', data.name);
      setFormData(prev => ({ ...prev, client_name: data.name }));
      setMessage({ text: '', type: '' });
    } else {
      setMessage({ text: 'Cadastro realizado com sucesso! Faça login.', type: 'success' });
      setClientAuthMode('login');
    }
    setClientForm({ name: '', email: '', password: '' });
  };

  const handleSubmitAppointment = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    const { ok, data } = await request('/appointments', 'POST', formData);
    if (ok) {
      setMessage({ text: 'Agendamento realizado com sucesso!', type: 'success' });
      setFormData({ client_name: clientName, client_phone: '', service_id: '', date: '', time: '' });
      loadData();
    } else {
      setMessage({ text: data.error || 'Erro ao agendar', type: 'error' });
    }
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
    if (ok) setAppointments(appointments.filter(a => a.id !== id));
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
            <h1 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--primary-color)', fontFamily: 'Impact, sans-serif', letterSpacing: '1px' }}>
              BARBEARIA BLACKSKULL
            </h1>
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

          {currentView === 'client' ? (
            <VisaoCliente 
              clientToken={clientToken}
              clientName={clientName}
              clientAuthMode={clientAuthMode}
              setClientAuthMode={setClientAuthMode}
              clientForm={clientForm}
              handleClientAuthChange={(e) => setClientForm({ ...clientForm, [e.target.name]: e.target.value })}
              handleClientLogin={handleClientAuth}
              handleClientRegister={handleClientAuth}
              handleClientLogout={() => { setClientToken(''); setClientName(''); localStorage.clear(); setMessage({ text: '', type: '' }); }}
              message={message}
              setMessage={setMessage}
              formData={formData}
              handleChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.value })}
              handleSubmit={handleSubmitAppointment}
              services={services}
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