import assert from 'node:assert/strict';
import test from 'node:test';
import { activeBirthdayYear, birthdayWindow, canReadMessage, canWrite, expiredIds, phase } from './rules.mjs';

test('a preparação do aniversário abre no dia 1 do mês', () => {
  const window = birthdayWindow(10, 15, 2026, 2);
  assert.equal(window.prepareFrom, '2026-10-01');
  assert.equal(phase('2026-10-01', window), 'preparing');
  assert.equal(canWrite('2026-10-01', window), true);
  assert.equal(canReadMessage('2026-10-01', window, { leader: false, author: false, recipient: true }), false);
});

test('novos recados fecham depois do dia do aniversário', () => {
  const window = birthdayWindow(10, 15, 2026, 2);
  assert.equal(canWrite('2026-10-15', window), true);
  assert.equal(canWrite('2026-10-16', window), false);
  assert.equal(phase('2026-10-16', window), 'open');
});

test('o aniversariante lê a partir do dia e perde o acesso dois meses depois', () => {
  const window = birthdayWindow(10, 15, 2026, 2);
  assert.equal(window.viewUntil, '2026-12-15');
  assert.equal(canReadMessage('2026-10-15', window, { leader: false, author: false, recipient: true }), true);
  assert.equal(canReadMessage('2026-12-15', window, { leader: false, author: false, recipient: true }), true);
  assert.equal(phase('2026-12-16', window), 'expired');
  assert.equal(canReadMessage('2026-12-16', window, { leader: true, author: true, recipient: true }), false);
});

test('cada ano é uma edição separada', () => {
  assert.equal(activeBirthdayYear(10, 15, '2026-10-17', 2), 2026);
  assert.equal(activeBirthdayYear(10, 15, '2026-12-15', 2), 2026);
  assert.equal(activeBirthdayYear(10, 15, '2027-01-02', 2), 2027);
  assert.equal(activeBirthdayYear(10, 15, '2027-10-01', 2), 2027);
  assert.notEqual(birthdayWindow(12, 25, 2026).celebration, birthdayWindow(12, 25, 2027).celebration);
});

test('a limpeza remove só a edição vencida', () => {
  const editions = [
    { id: 'natal-2025', viewUntil: '2026-01-06' },
    { id: 'natal-2026', viewUntil: '2027-01-06' },
    { id: 'bday-ana-2026', viewUntil: '2026-12-15' },
  ];
  assert.deepEqual(expiredIds(editions, '2026-10-17'), ['natal-2025']);
});

test('celebração coletiva respeita a data de abertura', () => {
  const window = { prepareFrom: '2026-11-01', messageUntil: '2026-12-24', openAt: '2026-12-25', viewUntil: '2027-01-06' };
  assert.equal(phase('2026-10-17', window), 'upcoming');
  assert.equal(canWrite('2026-11-02', window), true);
  assert.equal(canReadMessage('2026-12-24', window, { leader: false, author: false, recipient: false }), false);
  assert.equal(canReadMessage('2026-12-25', window, { leader: false, author: false, recipient: false }), true);
});
