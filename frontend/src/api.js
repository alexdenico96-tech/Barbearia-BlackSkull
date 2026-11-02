// URL base da API. Configure VITE_API_URL para trocar de ambiente (veja .env.example).
export const API = (import.meta.env.VITE_API_URL || 'https://barbearia-blackskull.onrender.com/api')
  .replace(/\/$/, '');
