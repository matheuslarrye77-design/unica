const COLOR_KEY = 'unica-platform-color';
const PHOTO_KEY = 'unica-profile-photo';
const HEX = /^#[0-9a-fA-F]{6}$/;

export function storedColor() {
  try {
    const value = localStorage.getItem(COLOR_KEY) ?? '';
    return HEX.test(value) ? value : '';
  } catch {
    return '';
  }
}

export function applyStoredAppearance() {
  const color = storedColor();
  if (!color) return;
  const root = document.documentElement;
  root.style.setProperty('--unica-brand', color);
  root.style.setProperty('--unica-rail', color);
  root.style.setProperty('--primary', color);
  root.style.setProperty('--ds-purple', color);
  root.style.setProperty('--ring', color);
  root.style.setProperty('--sidebar-primary', color);
}

export function setPlatformColor(color: string) {
  if (!HEX.test(color)) return;
  localStorage.setItem(COLOR_KEY, color);
  applyStoredAppearance();
}

export function profilePhoto() {
  try {
    const value = localStorage.getItem(PHOTO_KEY) ?? '';
    return value.startsWith('data:image/') ? value : '';
  } catch {
    return '';
  }
}

export function setProfilePhoto(value: string) {
  if (value && !value.startsWith('data:image/')) return;
  if (value) localStorage.setItem(PHOTO_KEY, value);
  else localStorage.removeItem(PHOTO_KEY);
}
