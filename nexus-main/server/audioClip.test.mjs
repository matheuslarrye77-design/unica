import assert from 'node:assert/strict';
import test from 'node:test';
import { clampClip, clipChoices, encodeWavChannels, initialClipSeconds, peaksFromSamples, wavDuration } from '../src/lib/audioClip.ts';

test('the clip window matches the chosen seconds', () => {
  assert.equal(initialClipSeconds(80), 30);
  assert.equal(initialClipSeconds(20), 15);
  assert.equal(initialClipSeconds(12), 10);
  assert.equal(initialClipSeconds(8), 8);
  assert.deepEqual(clampClip(120, 30, 40), { start: 40, duration: 30, end: 70 });
  assert.deepEqual(clampClip(120, 15, 65), { start: 65, duration: 15, end: 80 });
  assert.deepEqual(clampClip(50, 45, 20), { start: 5, duration: 45, end: 50 });
  assert.deepEqual(clampClip(8, 30, 0), { start: 0, duration: 8, end: 8 });
  assert.equal(clampClip(30, 10, -4).start, 0);
  const choices = clipChoices(200);
  assert.deepEqual(choices.filter((choice) => choice.available && !choice.full).map((choice) => choice.label), ['10s', '15s', '30s', '45s', '60s', '1:30', '2:00', '2:30', '3:00']);
  assert.equal(choices.at(-1)?.label, 'Completo');
  assert.equal(choices.find((choice) => choice.label === '60s')?.available, true);
  assert.equal(clipChoices(40).find((choice) => choice.label === '60s')?.available, false);
  assert.equal(clipChoices(40).some((choice) => choice.label === '1:30'), false);
});

test('the waveform follows the samples and the wav lasts the chosen length', () => {
  const quiet = new Float32Array(1000);
  const loud = new Float32Array(1000);
  loud.fill(0.8);
  const samples = new Float32Array(2000);
  samples.set(quiet, 0);
  samples.set(loud, 1000);
  const peaks = peaksFromSamples(samples, 2);
  assert.equal(peaks.length, 2);
  assert.ok(peaks[1] > peaks[0]);
  const tone = new Float32Array(8000);
  for (let index = 0; index < tone.length; index += 1) tone[index] = Math.sin(index / 12) * 0.4;
  const wav = encodeWavChannels([tone], 8000);
  assert.equal(String.fromCharCode(...wav.slice(0, 4)), 'RIFF');
  assert.ok(Math.abs(wavDuration(wav) - 1) < 0.001);
});
