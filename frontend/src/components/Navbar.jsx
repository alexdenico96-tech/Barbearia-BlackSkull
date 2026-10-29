import React from 'react';

export default function Navbar({ theme, toggleTheme, currentView, setCurrentView }) {
  return (
    <div className="nav-bar">
      <h1>Barbearia Style</h1>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button className="btn btn-secondary" onClick={toggleTheme}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <button 
          className={`btn ${currentView === 'client' ? '' : 'btn-secondary'}`}
          onClick={() => setCurrentView('client')}
        >
          Área do Cliente
        </button>
        <button 
          className={`btn ${currentView === 'admin' ? '' : 'btn-secondary'}`}
          onClick={() => setCurrentView('admin')}
        >
          Painel Admin
        </button>
      </div>
    </div>
  );
}