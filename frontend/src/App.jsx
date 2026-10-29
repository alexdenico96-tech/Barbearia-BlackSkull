import React, { useState, useEffect } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import ClientView from './components/ClientView';
import AdminView from './components/AdminView';

const API_URL = 'http://localhost:3001/api';

export default function App() {
  const [theme, setTheme] = useState('light');
  const [currentView, setCurrentView] = useState('client');
  
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || '');
  const [adminPassword, setAdminPassword] = useState('');

  const [clientToken, setClientToken] = useState(localStorage.getItem('clientToken') || '');
  const [clientAuthMode, setClientAuthMode] = useState('login');
  const [clientForm, setClientForm] = useState({ name: '', email: '', password: '' });

  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    service_id: '',
    date: '',
    time: ''
  });

  const [newServiceData, setNewServiceData] = useState({ name: '', price: '', duration: '' });

  const [message, setMessage] = useState({ text: '', type: '' });
  const [serviceMessage, setServiceMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    fetchServices();
    fetchAppointments();
  }, []);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

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

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleServiceChange = (e) => setNewServiceData({ ...newServiceData, [e.target.name]: e.target.value });
  const handleClientAuthChange = (e) => setClientForm({ ...clientForm, [e.target.name]: e.target.value });

  const handleClientRegister = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientForm)
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: 'Cadastro realizado com sucesso! Faça login.', type: 'success' });
        setClientAuthMode('login');
        setClientForm({ name: '', email: '', password: '' });
      } else {
        setMessage({ text: data.error || 'Erro ao cadastrar.', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Erro de conexão com o servidor.', type: 'error' });
    }
  };

  const handleClientLogin = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clientForm.email, password: clientForm.password })
      });
      const data = await res.json();
      if (res.ok) {
        setClientToken(data.token);
        localStorage.setItem('clientToken', data.token);
        setMessage({ text: `Bem-vindo, ${data.name}!`, type: 'success' });
        setClientForm({ name: '', email: '', password: '' });
      } else {
        setMessage({ text: data.error || 'Erro no login.', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Erro de conexão com o servidor.', type: 'error' });
    }
  };

  const handleClientLogout = () => {
    setClientToken('');
    localStorage.removeItem('clientToken');
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
        setMessage({ text: 'Agendamento realizado com sucesso!', type: 'success' });
        setFormData({ client_name: '', client_phone: '', service_id: '', date: '', time: '' });
        fetchAppointments();
      } else {
        setMessage({ text: result.error || 'Erro ao realizar agendamento.', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Erro de conexão com o servidor.', type: 'error' });
    }
  };

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
        setServiceMessage({ text: 'Serviço cadastrado com sucesso!', type: 'success' });
        setNewServiceData({ name: '', price: '', duration: '' });
        fetchServices();
      } else {
        setServiceMessage({ text: result.error || 'Erro ao cadastrar serviço.', type: 'error' });
      }
    } catch (error) {
      setServiceMessage({ text: 'Erro de conexão com o servidor.', type: 'error' });
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/appointments/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) fetchAppointments();
      else alert('Erro ao atualizar status.');
    } catch (error) {
      console.error('Erro de conexão:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja realmente excluir este agendamento?')) return;
    try {
      const response = await fetch(`${API_URL}/appointments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (response.ok) setAppointments(appointments.filter((item) => item.id !== id));
      else alert('Erro ao excluir agendamento.');
    } catch (error) {
      console.error('Erro de conexão:', error);
    }
  };

  return (
    <div className="container">
      <Navbar 
        theme={theme} 
        toggleTheme={toggleTheme} 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
      />

      {currentView === 'client' && (
        <ClientView 
          clientToken={clientToken}
          clientAuthMode={clientAuthMode}
          setClientAuthMode={setClientAuthMode}
          clientForm={clientForm}
          handleClientAuthChange={handleClientAuthChange}
          handleClientLogin={handleClientLogin}
          handleClientRegister={handleClientRegister}
          handleClientLogout={handleClientLogout}
          message={message}
          setMessage={setMessage}
          formData={formData}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
          services={services}
        />
      )}

      {currentView === 'admin' && (
        <AdminView 
          adminToken={adminToken}
          adminPassword={adminPassword}
          setAdminPassword={setAdminPassword}
          handleAdminLogin={handleAdminLogin}
          handleAdminLogout={() => { setAdminToken(''); localStorage.removeItem('adminToken'); }}
          message={message}
          newServiceData={newServiceData}
          handleServiceChange={handleServiceChange}
          handleServiceSubmit={handleServiceSubmit}
          serviceMessage={serviceMessage}
          appointments={appointments}
          handleStatusChange={handleStatusChange}
          handleDelete={handleDelete}
        />
      )}
    </div>
  );
}