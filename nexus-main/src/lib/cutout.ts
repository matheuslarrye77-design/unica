function distance(r: number, g: number, b: number, bg: number[]) {
  return Math.hypot(r - bg[0], g - bg[1], b - bg[2]);
}

export async function fitPhoto(file: File) {
  const bitmap = await createImageBitmap(file);
  const max = 960;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error('png')), 'image/jpeg', 0.9);
  });
  return new File([blob], 'figurinha.jpg', { type: 'image/jpeg' });
}

export async function removePhotoBackground(file: File) {
  const bitmap = await createImageBitmap(file);
  const max = 640;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('canvas');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const image = context.getImageData(0, 0, width, height);
  const data = image.data;
  const samples: number[][] = [];
  const take = (x: number, y: number) => {
    const index = (y * width + x) * 4;
    samples.push([data[index], data[index + 1], data[index + 2]]);
  };
  for (let x = 0; x < width; x += 2) {
    take(x, 0);
    take(x, height - 1);
  }
  for (let y = 0; y < height; y += 2) {
    take(0, y);
    take(width - 1, y);
  }
  const bg = [0, 1, 2].map((channel) => {
    const values = samples.map((pixel) => pixel[channel]).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)] ?? 255;
  });
  const spread = samples.reduce((max, pixel) => Math.max(max, distance(pixel[0], pixel[1], pixel[2], bg)), 0);
  const loose = Math.min(78, Math.max(34, spread * 0.65 + 28));
  const background = new Uint8Array(width * height);
  const queue: number[] = [];
  const push = (x: number, y: number) => {
    const slot = y * width + x;
    if (background[slot]) return;
    const index = slot * 4;
    const edge = Math.max(Math.abs(x / (width - 1) - 0.5) * 2, Math.abs(y / (height - 1) - 0.5) * 2);
    const limit = 16 + edge * (loose - 16);
    if (distance(data[index], data[index + 1], data[index + 2], bg) > limit) return;
    background[slot] = 1;
    queue.push(slot);
  };
  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const slot = queue[cursor];
    const x = slot % width;
    const y = Math.floor(slot / width);
    if (x > 0) push(x - 1, y);
    if (x + 1 < width) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y + 1 < height) push(x, y + 1);
  }
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let kept = 0;
  for (let slot = 0; slot < background.length; slot += 1) {
    const index = slot * 4;
    if (background[slot]) {
      data[index + 3] = 0;
      continue;
    }
    const x = slot % width;
    const y = Math.floor(slot / width);
    const near = (x > 0 && background[slot - 1]) || (x + 1 < width && background[slot + 1]) || (y > 0 && background[slot - width]) || (y + 1 < height && background[slot + width]);
    if (near) data[index + 3] = Math.min(data[index + 3], 150);
    kept += 1;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  if (kept < width * height * 0.04) throw new Error('empty');
  context.putImageData(image, 0, 0);
  const pad = 8;
  const crop = document.createElement('canvas');
  crop.width = Math.max(1, maxX - minX + 1 + pad * 2);
  crop.height = Math.max(1, maxY - minY + 1 + pad * 2);
  crop.getContext('2d')?.drawImage(canvas, minX - pad, minY - pad, crop.width, crop.height, 0, 0, crop.width, crop.height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    crop.toBlob((result) => result ? resolve(result) : reject(new Error('png')), 'image/png');
  });
  return new File([blob], 'figurinha.png', { type: 'image/png' });
}
