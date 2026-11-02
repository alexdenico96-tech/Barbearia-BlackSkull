import React, { useState, useEffect } from 'react';
import ModalConfirmacao from './ModalConfirmacao';
import { CONFIG } from '../config';
import { hojeLocal, somarDias, formatarData, descreverDias, STATUS_LABEL } from '../utils';

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
  services,
  scheduleConfig,
  request,
  bookingVersion,
  refresh
}) {
  const [statusNotificacao, setStatusNotificacao] = useState('');
  const [ultimoAgendamento, setUltimoAgendamento] = useState(null);

  // Resultados das consultas, guardados junto com a "chave" da consulta que os gerou.
  // Enquanto a chave atual for diferente da guardada, a tela mostra "carregando".
  const [slotsResult, setSlotsResult] = useState({ key: '', list: [], message: '' });
  const [mineResult, setMineResult] = useState({ key: '', list: [] });

  const [cancelId, setCancelId] = useState(null);
  const [senhaExclusao, setSenhaExclusao] = useState('');
  const [erroExclusao, setErroExclusao] = useState('');

  const slotsKey = clientToken && formData.date && formData.service_id
    ? `${formData.date}|${formData.service_id}|${bookingVersion}` : '';
  const mineKey = clientToken ? `${clientToken}|${bookingVersion}` : '';
  const slotsLoading = slotsKey !== '' && slotsResult.key !== slotsKey;
  const mineLoading = mineKey !== '' && mineResult.key !== mineKey;

  // Horários livres para o serviço e a data escolhidos
  useEffect(() => {
    if (!slotsKey) return;
    let cancelado = false;
    request(`/availability?date=${formData.date}&service_id=${formData.service_id}`).then(({ ok, data }) => {
      if (cancelado) return;
      setSlotsResult(ok
        ? { key: slotsKey, list: data.slots || [], message: data.message || '' }
        : { key: slotsKey, list: [], message: data.error || 'Não foi possível carregar os horários.' });
    });
    return () => { cancelado = true; };
  }, [slotsKey]);

  // Agendamentos do próprio cliente
  useEffect(() => {
    if (!mineKey) return;
    let cancelado = false;
    request('/my-appointments', 'GET', null, clientToken).then(({ ok, data }) => {
      if (!cancelado) setMineResult({ key: mineKey, list: ok ? data : [] });
    });
    return () => { cancelado = true; };
  }, [mineKey]);

  const escolher = (name, value) => handleChange({ target: { name, value } });

  // Trocar data ou serviço invalida o horário que estava escolhido
  const aoMudarDataOuServico = (e) => {
    handleChange(e);
    escolher('time', '');
  };

  /* ---------- Notificação ao barbeiro (só depois de agendar com sucesso) ---------- */
  const notificarBarbeiro = async (dados) => {
    const payload = {
      cliente: dados.cliente,
      telefone: dados.telefone,
      servico: dados.servico,
      data: dados.data,
      horario: dados.horario,
      _subject: `Novo Agendamento: ${dados.cliente} - BlackSkull`
    };

    if (CONFIG.formEndpoint && CONFIG.formEndpoint.trim() !== '') {
      try {
        const resposta = await fetch(CONFIG.formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload)
        });
        setStatusNotificacao(resposta.ok
          ? 'Aviso enviado com sucesso ao barbeiro!'
          : 'Agendamento salvo, mas houve erro ao notificar por e-mail.');
      } catch (erro) {
        console.error('Erro ao enviar notificação:', erro);
        setStatusNotificacao('Agendamento salvo, mas não foi possível notificar por e-mail.');
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

  const lidarComAgendamentoEEmail = async (e) => {
    e.preventDefault();
    setStatusNotificacao('');
    setUltimoAgendamento(null);

    if (!formData.time) {
      setMessage({ text: 'Selecione um horário disponível.', type: 'error' });
      return;
    }

    const dadosEnviados = { ...formData }; // o formulário é limpo após o sucesso
    const sucesso = await handleSubmit(e);
    if (!sucesso) return; // não avisa o barbeiro de um agendamento que não foi gravado

    const servico = services.find((s) => String(s.id) === String(dadosEnviados.service_id));
    const dados = {
      cliente: dadosEnviados.client_name || clientName,
      telefone: dadosEnviados.client_phone,
      servico: servico ? `${servico.name} (R$ ${Number(servico.price).toFixed(2)})` : 'Serviço',
      data: formatarData(dadosEnviados.date),
      horario: dadosEnviados.time
    };
    setUltimoAgendamento(dados);
    await notificarBarbeiro(dados);
  };

  const linkWhatsapp = () => {
    if (!CONFIG.whatsappBarbeiro || !ultimoAgendamento) return '';
    const texto =
      `Olá! Acabei de agendar na Barbearia BlackSkull.\n` +
      `Cliente: ${ultimoAgendamento.cliente}\n` +
      `Serviço: ${ultimoAgendamento.servico}\n` +
      `Data: ${ultimoAgendamento.data} às ${ultimoAgendamento.horario}`;
    return `https://wa.me/${CONFIG.whatsappBarbeiro}?text=${encodeURIComponent(texto)}`;
  };

  /* ---------- Cancelar agendamento e excluir conta ---------- */
  const executarCancelamento = async () => {
    const id = cancelId;
    setCancelId(null);
    const { ok, status, data } = await request(`/my-appointments/${id}/cancel`, 'PATCH', null, clientToken);
    if (status === 401 || status === 403) {
      handleClientLogout();
      return setMessage({ text: 'Sua sessão expirou. Faça login novamente.', type: 'error' });
    }
    setMessage(ok
      ? { text: 'Agendamento cancelado.', type: 'success' }
      : { text: data.error || 'Não foi possível cancelar.', type: 'error' });
    if (ok) refresh();
  };

  const excluirConta = async (e) => {
    e.preventDefault();
    setErroExclusao('');
    const { ok, status, data } = await request('/auth/delete-account', 'POST', { password: senhaExclusao }, clientToken);
    if (ok) {
      setSenhaExclusao('');
      handleClientLogout();
      setMessage({ text: 'Sua conta e seus dados pessoais foram excluídos.', type: 'success' });
    } else if (status === 403) {
      handleClientLogout();
      setMessage({ text: 'Sua sessão expirou. Faça login novamente.', type: 'error' });
    } else {
      setErroExclusao(data.error || 'Não foi possível excluir a conta.');
    }
  };

  const podeCancelar = (a) => {
    const status = a.status || 'pending';
    return ['pending', 'confirmed'].includes(status) && new Date(`${a.date}T${a.time}:00`) > new Date();
  };

  const dataMinima = scheduleConfig?.today || hojeLocal();
  const dataMaxima = somarDias(dataMinima, scheduleConfig?.maxAdvanceDays || 60);
  const nenhumLivre = slotsResult.list.length > 0 && !slotsResult.list.some((s) => s.available);
  const linkZap = linkWhatsapp();

  const linkBtn = {
    background: 'none', border: 'none', color: 'var(--primary-color)',
    cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline'
  };

  return (
    <div className="client-container">
      {!clientToken ? (
        <div className="auth-box">
          <img src="/logo.webp" alt="Logotipo" className="auth-logo" />

          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
            {clientAuthMode === 'login' ? 'Login de Cliente' : 'Cadastro de Cliente'}
          </h2>

          {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

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
                  maxLength={100}
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
                placeholder={clientAuthMode === 'register' ? 'Mínimo de 6 caracteres' : 'Sua senha'}
                minLength={clientAuthMode === 'register' ? 6 : undefined}
                maxLength={72}
                required
              />
            </div>

            {clientAuthMode === 'register' && (
              <label className="consent">
                <input
                  type="checkbox"
                  name="consent"
                  checked={!!clientForm.consent}
                  onChange={handleClientAuthChange}
                  required
                />
                <span>
                  Aceito que meu nome, e-mail e telefone sejam usados somente para gerenciar meus
                  agendamentos na Barbearia BlackSkull. Posso excluir minha conta e meus dados a qualquer momento.
                </span>
              </label>
            )}

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
                  onClick={() => { setClientAuthMode('register'); setMessage({ text: '', type: '' }); }}
                  style={linkBtn}
                >
                  Cadastre-se aqui
                </button>
              </span>
            ) : (
              <span>
                Já tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => { setClientAuthMode('login'); setMessage({ text: '', type: '' }); }}
                  style={linkBtn}
                >
                  Faça login aqui
                </button>
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="booking-box">
          <div className="welcome-bar">
            <div>
              <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Bem-vindo(a),</span>
              <h3 style={{ margin: 0, color: 'var(--primary-color)' }}>{clientName}</h3>
            </div>
            <button className="btn btn-secondary" onClick={handleClientLogout} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              Sair
            </button>
          </div>

          <h2>Novo Agendamento</h2>

          {scheduleConfig && (
            <p className="hint">
              Atendemos de {descreverDias(scheduleConfig.businessDays)}, das {scheduleConfig.openTime} às {scheduleConfig.closeTime}.
            </p>
          )}

          {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}
          {statusNotificacao && <div className="alert alert-success">{statusNotificacao}</div>}
          {linkZap && (
            <a className="btn btn-whatsapp" href={linkZap} target="_blank" rel="noopener noreferrer">
              Avisar o barbeiro no WhatsApp
            </a>
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
                maxLength={100}
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
                pattern="[0-9()+\-\s]{8,20}"
                title="Use apenas números, espaços, parênteses, + e - (8 a 20 caracteres)"
                required
              />
            </div>

            <div className="form-group">
              <label>Serviço Desejado:</label>
              <select
                name="service_id"
                value={formData.service_id}
                onChange={aoMudarDataOuServico}
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

            <div className="form-group">
              <label>Data:</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={aoMudarDataOuServico}
                min={dataMinima}
                max={dataMaxima}
                required
              />
            </div>

            <div className="form-group">
              <label>Horário:</label>
              {!formData.date || !formData.service_id ? (
                <small className="hint">Escolha o serviço e a data para ver os horários livres.</small>
              ) : slotsLoading ? (
                <small className="hint">Carregando horários…</small>
              ) : slotsResult.message ? (
                <div className="alert alert-warning" style={{ marginBottom: 0 }}>{slotsResult.message}</div>
              ) : (
                <>
                  <div className="slot-grid">
                    {slotsResult.list.map((s) => (
                      <button
                        type="button"
                        key={s.time}
                        className={`slot-btn ${formData.time === s.time ? 'selected' : ''}`}
                        disabled={!s.available}
                        onClick={() => escolher('time', s.time)}
                      >
                        {s.time}
                      </button>
                    ))}
                  </div>
                  {nenhumLivre && <small className="hint">Todos os horários deste dia estão ocupados. Tente outra data.</small>}
                </>
              )}
            </div>

            <button type="submit" className="btn" style={{ width: '100%', marginTop: '15px', backgroundColor: '#10b981' }}>
              Confirmar Agendamento e Notificar
            </button>
          </form>

          <h2 style={{ marginTop: '35px' }}>Meus Agendamentos</h2>
          {mineLoading ? (
            <p className="hint">Carregando…</p>
          ) : mineResult.list.length === 0 ? (
            <p className="hint">Você ainda não tem agendamentos.</p>
          ) : (
            <ul className="my-list">
              {mineResult.list.map((a) => (
                <li key={a.id} className="my-item">
                  <div>
                    <strong>{formatarData(a.date)} às {a.time}</strong>
                    <br />
                    <small style={{ opacity: 0.8 }}>{a.service_name || 'Serviço'}</small>
                  </div>
                  <div className="my-item-right">
                    <span className={`badge badge-${a.status || 'pending'}`}>{STATUS_LABEL[a.status || 'pending']}</span>
                    {podeCancelar(a) && (
                      <button type="button" className="link-danger" onClick={() => setCancelId(a.id)}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <details className="privacy-box">
            <summary>Privacidade e meus dados</summary>
            <p>
              Guardamos seu nome, e-mail e telefone apenas para gerenciar seus agendamentos. Se quiser,
              você pode excluir sua conta: seus dados pessoais são removidos, os horários futuros são
              cancelados e o histórico é mantido sem identificação.
            </p>
            <form onSubmit={excluirConta}>
              {erroExclusao && <div className="alert alert-error">{erroExclusao}</div>}
              <div className="form-group">
                <label>Confirme sua senha para excluir a conta:</label>
                <input
                  type="password"
                  value={senhaExclusao}
                  onChange={(e) => setSenhaExclusao(e.target.value)}
                  maxLength={72}
                  required
                />
              </div>
              <button type="submit" className="btn" style={{ backgroundColor: '#ef4444' }}>
                Excluir minha conta
              </button>
            </form>
          </details>
        </div>
      )}

      <ModalConfirmacao
        aberto={cancelId !== null}
        titulo="Cancelar agendamento"
        mensagem="Tem certeza de que deseja cancelar este agendamento? O horário ficará livre para outros clientes."
        aoConfirmar={executarCancelamento}
        aoCancelar={() => setCancelId(null)}
      />
    </div>
  );
}
