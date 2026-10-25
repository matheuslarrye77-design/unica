export const CLIP_CHOICES = [10, 15, 30, 45, 60];

export function initialClipSeconds(total: number) {
  if (!Number.isFinite(total) || total <= 0) return 0;
  if (total >= 30) return 30;
  const fit = [60, 45, 30, 15, 10].find((choice) => choice <= total);
  return fit ?? total;
}

export function clampClip(total: number, selected: number, start: number) {
  const duration = Math.min(Math.max(selected, 0), Math.max(total, 0));
  const maxStart = Math.max(0, total - duration);
  const nextStart = Math.min(Math.max(start, 0), maxStart);
  return { start: nextStart, duration, end: nextStart + duration };
}

export function peaksFromSamples(samples: Float32Array, bars: number) {
  const count = Math.max(1, Math.min(Math.floor(bars) || 1, samples.length || 1));
  if (samples.length === 0) return Array.from({ length: count }, () => 0.2);
  const peaks = new Array<number>(count);
  for (let index = 0; index < count; index += 1) {
    const from = Math.floor((index * samples.length) / count);
    const to = Math.max(from + 1, Math.floor(((index + 1) * samples.length) / count));
    let peak = 0;
    for (let cursor = from; cursor < to; cursor += 1) {
      const value = Math.abs(samples[cursor] ?? 0);
      if (value > peak) peak = value;
    }
    peaks[index] = peak;
  }
  const max = Math.max(...peaks, 0.001);
  return peaks.map((peak) => peak / max);
}

export function mixdown(buffer: AudioBuffer) {
  const mixed = new Float32Array(buffer.length);
  const channels = buffer.numberOfChannels;
  for (let channel = 0; channel < channels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < data.length; index += 1) mixed[index] += data[index] / channels;
  }
  return mixed;
}

export function encodeWavChannels(channels: Float32Array[], sampleRate: number) {
  const count = channels.length;
  const frames = channels[0]?.length ?? 0;
  const block = count * 2;
  const dataSize = frames * block;
  const out = new Uint8Array(44 + dataSize);
  const view = new DataView(out.buffer);
  const write = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, count, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * block, true);
  view.setUint16(32, block, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < count; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channels[channel][frame] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return out;
}

export function wavDuration(bytes: Uint8Array) {
  if (bytes.length < 44) return 0;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const rate = view.getUint32(24, true);
  const channels = view.getUint16(22, true);
  const dataSize = view.getUint32(40, true);
  if (!rate || !channels) return 0;
  return dataSize / (rate * channels * 2);
}

export async function clipToWavFile(sourceName: string, buffer: AudioBuffer, start: number, duration: number) {
  const clip = clampClip(buffer.duration, duration, start);
  const context = new AudioContext();
  try {
    const rate = buffer.sampleRate;
    const from = Math.max(0, Math.floor(clip.start * rate));
    const frames = Math.max(1, Math.min(buffer.length - from, Math.round(clip.duration * rate)));
    const sliced = context.createBuffer(buffer.numberOfChannels, frames, rate);
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      sliced.getChannelData(channel).set(buffer.getChannelData(channel).subarray(from, from + frames));
    }
    const actual = sliced.length / rate;
    if (actual <= 0 || Math.abs(actual - clip.duration) > 0.08) throw new Error('clip');
    const channels = Array.from({ length: sliced.numberOfChannels }, (_, index) => sliced.getChannelData(index));
    const wav = encodeWavChannels(channels, rate);
    if (Math.abs(wavDuration(wav) - actual) > 0.08) throw new Error('clip');
    const base = sourceName.replace(/\.[^.]+$/, '') || 'audio';
    return { file: new File([wav], `${base}.wav`, { type: 'audio/wav' }), duration: actual };
  } finally {
    await context.close();
  }
}
