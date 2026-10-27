import assert from 'node:assert/strict';
import test from 'node:test';
import { canSeeMood, canSeePost, cleanAudience, moodForViewer } from './postPrivacy.mjs';

const staff = { id: 'ana', role: 'Colaborador', department: 'Design' };
const leader = { id: 'helena', role: 'Gerente', department: 'Gestão' };
const author = { id: '1', role: 'Colaborador', department: 'Design' };

test('posts antigos continuam visíveis para a equipe', () => {
  const post = { id: 'old', authorId: '1', body: 'oi' };
  assert.equal(canSeePost(post, staff), true);
  assert.equal(cleanAudience(undefined), 'team');
});

test('publicação da gestão não aparece para quem não é da gestão', () => {
  const post = { id: 'privado', authorId: '1', audience: 'management', body: 'reserva' };
  const newsroom = { id: 'camila', role: 'Colaborador', department: 'Comunicação' };
  assert.equal(canSeePost(post, staff), false);
  assert.equal(canSeePost(post, newsroom), false);
  assert.equal(canSeePost(post, author), true);
  assert.equal(canSeePost(post, leader), true);
});

test('sentimento privado não volta para colegas nem para a gestão quando é só do autor', () => {
  const mine = { authorId: '1', mood: '😔', moodAudience: 'self' };
  const management = { authorId: '1', mood: '😔', moodAudience: 'management' };
  const team = { authorId: '1', mood: '😊', moodAudience: 'team' };
  assert.equal(canSeeMood(mine, staff), false);
  assert.equal(canSeeMood(mine, leader), false);
  assert.equal(canSeeMood(mine, author), true);
  assert.equal(canSeeMood(management, staff), false);
  assert.equal(canSeeMood(management, leader), true);
  assert.equal(canSeeMood(team, staff), true);
  assert.equal(canSeeMood({ authorId: '1' }, staff), false);
});

test('humor coletivo mantém o último estado compartilhado quando o novo é privado', () => {
  const record = { emoji: '😔', visibility: 'self', shared: '😊' };
  assert.equal(moodForViewer(record, '1', '1', false), '😔');
  assert.equal(moodForViewer(record, 'ana', '1', false), '😊');
  assert.equal(moodForViewer(record, 'helena', '1', true), '😊');
  const management = { emoji: '😴', visibility: 'management', shared: '😊' };
  assert.equal(moodForViewer(management, 'ana', '1', false), '😊');
  assert.equal(moodForViewer(management, 'helena', '1', true), '😴');
  assert.equal(moodForViewer('🚀', 'ana', '1', false), '🚀');
});
