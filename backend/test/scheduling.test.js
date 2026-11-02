// Rode com: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const s = require('../scheduling');

const config = s.loadConfig({});
// 2026-11-02 é segunda-feira. 10:00 em São Paulo (UTC-3) = 13:00 UTC
const NOW = new Date('2026-11-02T13:00:00Z');

test('config padrão: seg-sáb, 09:00-19:00, slots de 30 min', () => {
  assert.equal(config.openTime, '09:00');
  assert.equal(config.closeTime, '19:00');
  assert.equal(config.slotMinutes, 30);
  assert.deepEqual(config.businessDays, [1, 2, 3, 4, 5, 6]);
});

test('isRealDate rejeita datas inexistentes', () => {
  assert.equal(s.isRealDate('2026-02-28'), true);
  assert.equal(s.isRealDate('2026-02-31'), false);
  assert.equal(s.isRealDate('2026-13-01'), false);
  assert.equal(s.isRealDate('02/11/2026'), false);
});

test('nowInTimezone usa o fuso de São Paulo, não o do servidor (UTC)', () => {
  const r = s.nowInTimezone('America/Sao_Paulo', new Date('2026-11-02T01:30:00Z'));
  assert.equal(r.date, '2026-11-01'); // ainda é domingo à noite no Brasil
  assert.equal(r.minutes, 22 * 60 + 30);
});

test('validateBookingDate: passado, domingo, longe demais e dia válido', () => {
  assert.match(s.validateBookingDate('2026-11-01', config, NOW), /passada/);
  assert.match(s.validateBookingDate('2026-11-08', config, NOW), /não atende/); // domingo
  assert.match(s.validateBookingDate('2027-06-01', config, NOW), /antecedência/);
  assert.equal(s.validateBookingDate('2026-11-03', config, NOW), null);
  assert.equal(s.validateBookingDate('2026-11-02', config, NOW), null); // hoje
  assert.match(s.validateBookingDate('2026-02-31', config, NOW), /inválida/);
});

test('getSlots: grade de 30 min respeitando o fechamento', () => {
  const slots = s.getSlots({ date: '2026-11-03', duration: 30, config, now: NOW });
  assert.equal(slots[0].time, '09:00');
  assert.equal(slots.at(-1).time, '18:30');
  assert.equal(slots.length, 20);

  const longo = s.getSlots({ date: '2026-11-03', duration: 90, config, now: NOW });
  assert.equal(longo.at(-1).time, '17:30'); // 17:30 + 90 min = 19:00
});

test('getSlots: serviço de 60 min às 14:00 bloqueia 13:30, 14:00 e 14:30', () => {
  const existing = [{ time: '14:00', duration: 60 }];
  const slots = s.getSlots({ date: '2026-11-03', duration: 30, existing, config, now: NOW });
  const livre = (t) => slots.find((x) => x.time === t).available;
  assert.equal(livre('13:30'), true);  // termina às 14:00, não colide
  assert.equal(livre('14:00'), false);
  assert.equal(livre('14:30'), false);
  assert.equal(livre('15:00'), true);  // o outro termina às 15:00
});

test('getSlots: serviço longo não pode invadir um agendamento seguinte', () => {
  const existing = [{ time: '10:00', duration: 30 }];
  const slots = s.getSlots({ date: '2026-11-03', duration: 60, existing, config, now: NOW });
  const livre = (t) => slots.find((x) => x.time === t).available;
  assert.equal(livre('09:00'), true);   // 09:00-10:00, encosta mas não colide
  assert.equal(livre('09:30'), false);  // 09:30-10:30 colide
  assert.equal(livre('10:30'), true);
});

test('getSlots: horários que já passaram hoje ficam indisponíveis', () => {
  const slots = s.getSlots({ date: '2026-11-02', duration: 30, config, now: NOW }); // são 10:00
  const livre = (t) => slots.find((x) => x.time === t).available;
  assert.equal(livre('09:30'), false);
  assert.equal(livre('10:00'), true);
  assert.equal(livre('10:30'), true);
});

test('minNoticeMinutes exige antecedência mínima', () => {
  const cfg = s.loadConfig({ MIN_NOTICE_MINUTES: '60' });
  const slots = s.getSlots({ date: '2026-11-02', duration: 30, config: cfg, now: NOW });
  const livre = (t) => slots.find((x) => x.time === t).available;
  assert.equal(livre('10:30'), false);
  assert.equal(livre('11:00'), true);
});
