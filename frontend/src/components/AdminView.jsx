import React from 'react';

export default function AdminView({
  adminToken,
  adminPassword,
  setAdminPassword,
  handleAdminLogin,
  handleAdminLogout,
  message,
  newServiceData,
  handleServiceChange,
  handleServiceSubmit,
  serviceMessage,
  appointments,
  handleStatusChange,
  handleDelete
}) {
  return (
    <div className="card">
      {!adminToken ? (
        <div>
          <h2>Acesso Restrito ao Administrador</h2>
          {message.text && <div className="alert alert-error">{message.text}</div>}
          <form onSubmit={handleAdminLogin}>
            <div className="form-group">
              <label>Senha Admin:</label>
              <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn">Entrar no Painel</button>
          </form>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Painel de Gestão</h2>
            <button className="btn btn-secondary" onClick={handleAdminLogout}>Sair</button>
          </div>

          {/* Novo Serviço */}
          <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid var(--border-color)' }}>
            <h3>Cadastrar Novo Serviço</h3>
            {serviceMessage.text && <div className={`alert alert-${serviceMessage.type}`}>{serviceMessage.text}</div>}
            <form onSubmit={handleServiceSubmit}>
              <div className="form-group">
                <label>Nome:</label>
                <input type="text" name="name" value={newServiceData.name} onChange={handleServiceChange} required />
              </div>
              <div className="form-group">
                <label>Preço (R$):</label>
                <input type="number" step="0.01" name="price" value={newServiceData.price} onChange={handleServiceChange} required />
              </div>
              <div className="form-group">
                <label>Duração (min):</label>
                <input type="number" name="duration" value={newServiceData.duration} onChange={handleServiceChange} required />
              </div>
              <button type="submit" className="btn" style={{ backgroundColor: '#10b981' }}>Salvar Serviço</button>
            </form>
          </div>

          {/* Lista de Agendamentos */}
          <div>
            <h3>Gerenciar Agendamentos</h3>
            {appointments.length === 0 ? (
              <p>Nenhum agendamento encontrado.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Data/Hora</th>
                    <th>Serviço</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((item) => (
                    <tr key={item.id}>
                      <td>{item.client_name}<br/><small>{item.client_phone}</small></td>
                      <td>{item.date} às {item.time}</td>
                      <td>{item.service_name}</td>
                      <td>
                        <select 
                          value={item.status || 'pending'} 
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          style={{ padding: '5px', borderRadius: '4px', background: 'var(--card-bg)', color: 'var(--text-color)' }}
                        >
                          <option value="pending">Pendente</option>
                          <option value="completed">Concluído</option>
                          <option value="cancelled">Cancelado</option>
                        </select>
                      </td>
                      <td>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}
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
  );
}