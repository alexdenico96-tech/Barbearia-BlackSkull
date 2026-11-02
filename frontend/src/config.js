// Configuração de notificações ao barbeiro (veja .env.example)
export const CONFIG = {
  // Formspree: deixe VITE_FORM_ENDPOINT vazio ("") para usar o mailto: como alternativa
  formEndpoint: import.meta.env.VITE_FORM_ENDPOINT ?? 'https://formspree.io/f/maeqwdrw',
  emailBarbeiro: import.meta.env.VITE_EMAIL_BARBEIRO || 'barbeiro@blackskull.com',
  // Só dígitos, com DDI+DDD. Vazio = botão de WhatsApp escondido
  whatsappBarbeiro: (import.meta.env.VITE_WHATSAPP || '').replace(/\D/g, '')
};
