import React from 'react';

export default function ClientView({
  clientToken,
  clientAuthMode,
  setClientAuthMode,
  clientForm,
  handleClientAuthChange,
  handleClientLogin,
  handleClientRegister,
  handleClientLogout,
  message,
  setMessage,
  formData,
  handleChange,
  handleSubmit,
  services
}) {
  return (
    <div className="card">
      {!clientToken ? (
        <div>
          <h2>{clientAuthMode === 'login' ? 'Login de Cliente' : 'Cadastro de Novo Cliente'}</h2>
          {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}
          
          <form onSubmit={clientAuthMode === 'login' ? handleClientLogin : handleClientRegister}>
            {clientAuthMode === 'register' && (
              <div className="form-group">
                <label>Nome:</label>
                <input type="text" name="name" value={clientForm.name} onChange={handleClientAuthChange} required />
              </div>
            )}
            <div className="form-group">
              <label>E-mail:</label>
              <input type="email" name="email" value={clientForm.email} onChange={handleClientAuthChange} required />
            </div>
            <div className="form-group">
              <label>Senha:</label>
              <input type="password" name="password" value={clientForm.password} onChange={handleClientAuthChange} required />
            </div>
            <button type="submit" className="btn">{clientAuthMode === 'login' ? 'Entrar' : 'Cadastrar'}</button>
          </form>

          <p style={{ marginTop: '15px', textAlign: 'center' }}>
            {clientAuthMode === 'login' ? 'Não tem uma conta?' : 'Já possui uma conta?'}{' '}
            <span 
              style={{ color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 'bold' }}
              onClick={() => {
                setClientAuthMode(clientAuthMode === 'login' ? 'register' : 'login');
                setMessage({ text: '', type: '' });
              }}
            >
              {clientAuthMode === 'login' ? 'Cadastre-se aqui' : 'Faça login'}
            </span>
          </p>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Faça o seu Agendamento</h2>
            <button className="btn btn-secondary" onClick={handleClientLogout}>Sair da Conta</button>
          </div>

          {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

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
    </div>
  );
}