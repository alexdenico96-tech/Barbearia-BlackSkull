import React, { useState } from 'react';

const CONFIG = {
  formEndpoint: "https://formspree.io/f/maeqwdrw",
};

export default function VisaoCliente({
  clientToken,
  clientName,
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
  const [statusNotificacao, setStatusNotificacao] = useState('');

  const lidarComAgendamentoEEmail = async (e) => {
    e.preventDefault();
    await handleSubmit(e);

    const servicoSelecionado = services.find(s => String(s.id) === String(formData.service_id));
    const nomeServico = servicoSelecionado ? `${servicoSelecionado.name} (R$ ${Number(servicoSelecionado.price).toFixed(2)})` : 'Serviço';

    const payload = {
      cliente: formData.client_name || clientName,
      telefone: formData.client_phone,
      servico: nomeServico,
      data: formData.date,
      horario: formData.time,
      _subject: `Novo Agendamento: ${formData.client_name || clientName} - BlackSkull`
    };

    if (CONFIG.formEndpoint && CONFIG.formEndpoint.trim() !== "") {
      try {
        const resposta = await fetch(CONFIG.formEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (resposta.ok) {
          setStatusNotificacao('Aviso enviado com sucesso ao barbeiro!');
        } else {
          setStatusNotificacao('Agendamento salvo, mas houve erro ao notificar por e-mail.');
        }
      } catch (erro) {
        console.error("Erro ao enviar notificação:", erro);
      }
    } else {
      const assunto = encodeURIComponent(payload._subject);
      const corpo = encodeURIComponent(
        `Novo agendamento realizado na Barbearia BlackSkull!\n\n` +
        `Cliente: ${payload.cliente}\n` +
        `Telefone: ${payload.telefone}\n` +
        `Serviço: ${payload.servico}\n` +
        `Data: ${payload.data} às ${payload.horario}`
      );
      window.location.href = `mailto:${CONFIG.emailBarbeiro}?subject=${assunto}&body=${corpo}`;
    }
  };

  return (
    <div className="client-container">
      {!clientToken ? (
        <div className="auth-box">
          <img src="/Logotipo.png" alt="Skull Dourado" className="auth-logo" />

          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
            {clientAuthMode === 'login' ? 'Login de Cliente' : 'Cadastro de Cliente'}
          </h2>

          {message.text && message.type === 'error' && (
            <div className={`alert alert-${message.type}`}>{message.text}</div>
          )}

          <form onSubmit={clientAuthMode === 'login' ? handleClientLogin : handleClientRegister}>
            {clientAuthMode === 'register' && (
              <div className="form-group">
                <label>Nome Completo:</label>
                <input
                  type="text"
                  name="name"
                  value={clientForm.name}
                  onChange={handleClientAuthChange}
                  placeholder="Digite seu nome"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>E-mail:</label>
              <input
                type="email"
                name="email"
                value={clientForm.email}
                onChange={handleClientAuthChange}
                placeholder="seu.email@exemplo.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Senha:</label>
              <input
                type="password"
                name="password"
                value={clientForm.password}
                onChange={handleClientAuthChange}
                placeholder="Sua senha"
                required
              />
            </div>

            <button type="submit" className="btn" style={{ width: '100%', marginTop: '10px' }}>
              {clientAuthMode === 'login' ? 'Entrar' : 'Cadastrar'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem' }}>
            {clientAuthMode === 'login' ? (
              <span>
                Não tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setClientAuthMode('register');
                    setMessage({ text: '', type: '' });
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-color)',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    textDecoration: 'underline'
                  }}
                >
                  Cadastre-se aqui
                </button>
              </span>
            ) : (
              <span>
                Já tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setClientAuthMode('login');
                    setMessage({ text: '', type: '' });
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-color)',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    textDecoration: 'underline'
                  }}
                >
                  Faça login aqui
                </button>
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="booking-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <div>
              <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Bem-vindo(a),</span>
              <h3 style={{ margin: 0, color: 'var(--primary-color)' }}>{clientName}</h3>
            </div>
            <button className="btn btn-secondary" onClick={handleClientLogout} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              Sair
            </button>
          </div>

          <h2>Novo Agendamento</h2>

          {message.text && (
            <div className={`alert alert-${message.type}`}>{message.text}</div>
          )}

          {statusNotificacao && (
            <div className="alert alert-success">{statusNotificacao}</div>
          )}

          <form onSubmit={lidarComAgendamentoEEmail}>
            <div className="form-group">
              <label>Nome do Cliente / Dependente:</label>
              <input
                type="text"
                name="client_name"
                value={formData.client_name}
                onChange={handleChange}
                placeholder="Nome de quem vai cortar"
                required
              />
            </div>

            <div className="form-group">
              <label>Telefone / WhatsApp:</label>
              <input
                type="tel"
                name="client_phone"
                value={formData.client_phone}
                onChange={handleChange}
                placeholder="(11) 99999-9999"
                required
              />
            </div>

            <div className="form-group">
              <label>Serviço Desejado:</label>
              <select
                name="service_id"
                value={formData.service_id}
                onChange={handleChange}
                required
              >
                <option value="">Selecione um serviço...</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} - R$ {Number(s.price).toFixed(2)} ({s.duration} min)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label>Data:</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Horário:</label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn" style={{ width: '100%', marginTop: '15px', backgroundColor: '#10b981' }}>
              Confirmar Agendamento e Notificar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}