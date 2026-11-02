import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

export default function ModalConfirmacao({ aberto, titulo, mensagem, aoConfirmar, aoCancelar }) {
  // Gerencia o travamento e destravamento do scroll da página de forma segura
  useEffect(() => {
    if (aberto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Função de limpeza caso o componente seja desmontado abruptamente
    return () => {
      document.body.style.overflow = '';
    };
  }, [aberto]);

  if (!aberto) return null;

  return ReactDOM.createPortal(
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        margin: 0,
        padding: '20px'
      }}
    >
      <div 
        style={{
          backgroundColor: 'var(--card-bg, #131b2e)',
          border: '1px solid var(--border-color, #1f293d)',
          padding: '30px',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '400px',
          textAlign: 'center',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.7)',
          color: 'var(--text-color, #f3f4f6)',
          margin: 'auto'
        }}
      >
        <h3 
          style={{ 
            color: '#ef4444', 
            marginBottom: '15px', 
            fontFamily: 'Impact, sans-serif', 
            letterSpacing: '1px' 
          }}
        >
          {titulo || 'Confirmação'}
        </h3>

        <p 
          style={{ 
            fontSize: '0.95rem', 
            marginBottom: '25px', 
            opacity: 0.9, 
            lineHeight: '1.5' 
          }}
        >
          {mensagem || 'Tem certeza de que deseja realizar esta ação?'}
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button 
            type="button"
            onClick={aoCancelar}
            className="btn btn-secondary"
            style={{ flex: 1, padding: '10px' }}
          >
            Cancelar
          </button>
          
          <button 
            type="button"
            onClick={aoConfirmar}
            style={{
              flex: 1,
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '10px',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Sim, Excluir
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}