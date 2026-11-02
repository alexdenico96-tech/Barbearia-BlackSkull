// backend/scheduling.js
// Regras de agendamento (horário de funcionamento, duração dos serviços,
// sobreposição de horários, datas passadas). Sem dependências externas,
// para poder ser testado isoladamente (veja test/scheduling.test.js).

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function loadConfig(env = process.env) {
  const openTime = env.OPEN_TIME || '09:00';
  const closeTime = env.CLOSE_TIME || '19:00';
  return {
    timezone: env.TIMEZONE || 'America/Sao_Paulo',
    openTime,
    closeTime,
    slotMinutes: Number(env.SLOT_MINUTES) || 30,
    // 0 = domingo ... 6 = sábado. Padrão: segunda a sábado
    businessDays: (env.BUSINESS_DAYS || '1,2,3,4,5,6')
      .split(',')
      .map((d) => Number(d.trim()))
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
    maxAdvanceDays: Number(env.MAX_ADVANCE_DAYS) || 60,
    minNoticeMinutes: Number(env.MIN_NOTICE_MINUTES) || 0
  };
}

const timeToMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (total) =>
  `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

// Confere se "2026-02-31" é uma data que realmente existe
function isRealDate(dateStr) {
  if (!DATE_REGEX.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function dayOfWeek(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// Data e hora atuais NO FUSO da barbearia (o servidor do Render roda em UTC)
function nowInTimezone(timezone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type).value;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute'))
  };
}

// Retorna uma mensagem de erro se a DATA não puder receber agendamentos; senão null
function validateBookingDate(dateStr, config, now = new Date()) {
  if (!isRealDate(dateStr)) return 'Data inválida.';
  const today = nowInTimezone(config.timezone, now).date;
  if (dateStr < today) return 'Não é possível agendar em uma data passada.';
  if (dateStr > addDays(today, config.maxAdvanceDays)) {
    return `Só é possível agendar com até ${config.maxAdvanceDays} dias de antecedência.`;
  }
  if (!config.businessDays.includes(dayOfWeek(dateStr))) {
    return 'A barbearia não atende neste dia da semana.';
  }
  return null;
}

const overlaps = (startA, durA, startB, durB) => startA < startB + durB && startB < startA + durA;

/**
 * Lista todos os horários possíveis do dia para um serviço de `duration` minutos.
 * `existing` = [{ time: 'HH:MM', duration: minutos }] dos agendamentos NÃO cancelados.
 * Cada item: { time, available }.
 */
function getSlots({ date, duration, existing = [], config, now = new Date() }) {
  const open = timeToMinutes(config.openTime);
  const close = timeToMinutes(config.closeTime);
  const today = nowInTimezone(config.timezone, now);
  const busy = existing.map((e) => ({ start: timeToMinutes(e.time), duration: e.duration }));

  const slots = [];
  for (let start = open; start + duration <= close; start += config.slotMinutes) {
    const isPast = date === today.date && start < today.minutes + config.minNoticeMinutes;
    const isBusy = busy.some((b) => overlaps(start, duration, b.start, b.duration));
    slots.push({ time: minutesToTime(start), available: !isPast && !isBusy });
  }
  return slots;
}

module.exports = {
  DATE_REGEX, TIME_REGEX,
  loadConfig, timeToMinutes, minutesToTime, isRealDate, dayOfWeek, addDays,
  nowInTimezone, validateBookingDate, overlaps, getSlots
};
