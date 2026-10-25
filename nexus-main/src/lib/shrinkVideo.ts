const DIRECT = 4 * 1024 * 1024;

function durationOf(file: File) {
  return new Promise<number>((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    const finish = (value: number) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () => finish(video.duration);
    video.onerror = () => finish(0);
    video.src = url;
  });
}

function recordSmaller(file: File, duration: number) {
  return new Promise<File>((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      video.pause();
      URL.revokeObjectURL(url);
      callback();
    };
    video.preload = 'auto';
    video.playsInline = true;
    video.volume = 0;
    video.src = url;
    video.onerror = () => finish(() => reject(new Error('video')));
    video.onloadeddata = () => {
      void (async () => {
        try {
          const capture = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.bind(video);
          if (!capture) throw new Error('capture');
          await video.play();
          const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus' : 'video/webm';
          const recorder = new MediaRecorder(capture(), {
            mimeType: mime,
            videoBitsPerSecond: 900_000,
            audioBitsPerSecond: 64_000,
          });
          const chunks: Blob[] = [];
          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) chunks.push(event.data);
          };
          recorder.onerror = () => finish(() => reject(new Error('record')));
          recorder.onstop = () => finish(() => {
            const type = 'video/webm';
            const name = file.name.replace(/\.[^.]+$/, '') || 'video';
            resolve(new File(chunks, `${name}.webm`, { type }));
          });
          recorder.start();
          window.setTimeout(() => {
            if (recorder.state !== 'inactive') recorder.stop();
          }, Math.ceil(duration * 1000) + 400);
        } catch (error) {
          finish(() => reject(error));
        }
      })();
    };
  });
}

export async function shrinkVideo(file: File) {
  if (!file.type.startsWith('video/') || file.size <= DIRECT) return file;
  const duration = await durationOf(file);
  if (!Number.isFinite(duration) || duration <= 0 || duration > 20) return file;
  if (file.size / duration < 400 * 1024) return file;
  try {
    const smaller = await recordSmaller(file, duration);
    if (smaller.size > 0 && smaller.size < file.size) return smaller;
  } catch {
    return file;
  }
  return file;
}
