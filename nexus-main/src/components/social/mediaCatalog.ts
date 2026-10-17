function fluent(folder: string, skinned = false) {
  const base = folder.toLowerCase().replace(/ /g, '_');
  const file = skinned ? `${base}_3d_default.png` : `${base}_3d.png`;
  const tone = skinned ? '/Default/3D/' : '/3D/';
  return `https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/${encodeURIComponent(folder)}${tone}${file}`;
}

function noto(code: string) {
  return `https://fonts.gstatic.com/s/e/notoemoji/latest/${code}/512.webp`;
}

export const EMOJI_GROUPS = [
  { id: 'sorrisos', label: 'Sorrisos', items: ['😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😎', '🤩', '😉', '🤔', '😴', '😭', '😢', '😡', '😱', '🤗', '😇', '🥳', '😅', '🙄', '😬'] },
  { id: 'gestos', label: 'Gestos', items: ['👍', '👎', '👏', '🙏', '👋', '💪', '🤝', '✌️', '👌', '🤞', '🤘', '👊'] },
  { id: 'festa', label: 'Festa', items: ['🎉', '🎊', '🎂', '🎈', '🎁', '✨', '🔥', '⭐', '💯', '🏆', '🥳', '🍾'] },
  { id: 'coracoes', label: 'Corações', items: ['❤️', '💜', '💖', '💕', '🤍', '🖤', '💙', '💚', '💛', '💘', '💝', '💞'] },
];

const STICKER_NAMES: { folder: string; title: string; category: string; tags: string; skinned?: boolean }[] = [
  { folder: 'Grinning face', title: 'Sorriso', category: 'Sorrisos', tags: 'sorriso feliz' },
  { folder: 'Face with tears of joy', title: 'Risada', category: 'Sorrisos', tags: 'risada rir engraçado' },
  { folder: 'Rolling on the floor laughing', title: 'Gargalhada', category: 'Sorrisos', tags: 'risada gargalhada' },
  { folder: 'Smiling face with heart-eyes', title: 'Apaixonado', category: 'Sorrisos', tags: 'amor coração' },
  { folder: 'Face blowing a kiss', title: 'Beijo', category: 'Sorrisos', tags: 'beijo amor' },
  { folder: 'Winking face', title: 'Piscadela', category: 'Sorrisos', tags: 'piscadela' },
  { folder: 'Thinking face', title: 'Pensando', category: 'Reações', tags: 'pensando hmm' },
  { folder: 'Loudly crying face', title: 'Choro', category: 'Reações', tags: 'choro triste' },
  { folder: 'Pleading face', title: 'Por favor', category: 'Reações', tags: 'por favor vergonha' },
  { folder: 'Astonished face', title: 'Surpresa', category: 'Reações', tags: 'surpresa choque uau' },
  { folder: 'Face screaming in fear', title: 'Desespero', category: 'Reações', tags: 'desespero medo pânico' },
  { folder: 'Flushed face', title: 'Vergonha', category: 'Reações', tags: 'vergonha tímido' },
  { folder: 'Pouting face', title: 'Bravo', category: 'Reações', tags: 'bravo raiva' },
  { folder: 'Thumbs up', title: 'Joinha', category: 'Gestos', tags: 'joinha curtir legal', skinned: true },
  { folder: 'Clapping hands', title: 'Aplauso', category: 'Gestos', tags: 'aplauso parabéns', skinned: true },
  { folder: 'Folded hands', title: 'Obrigado', category: 'Gestos', tags: 'obrigado prece', skinned: true },
  { folder: 'Raising hands', title: 'Celebração', category: 'Comemoração', tags: 'festa comemoração', skinned: true },
  { folder: 'Party popper', title: 'Festa', category: 'Comemoração', tags: 'festa comemoração' },
  { folder: 'Birthday cake', title: 'Parabéns', category: 'Comemoração', tags: 'parabéns bolo aniversário' },
  { folder: 'Wrapped gift', title: 'Presente', category: 'Comemoração', tags: 'presente parabéns' },
  { folder: 'Red heart', title: 'Coração', category: 'Corações', tags: 'amor coração' },
  { folder: 'Sparkling heart', title: 'Coração brilhante', category: 'Corações', tags: 'amor coração' },
  { folder: 'Fire', title: 'Fogo', category: 'Reações', tags: 'fogo top' },
  { folder: 'Sparkles', title: 'Brilho', category: 'Comemoração', tags: 'brilho festa' },
];

export const STICKERS = STICKER_NAMES.map((item) => ({
  id: item.folder.toLowerCase().replace(/ /g, '-'),
  title: item.title,
  category: item.category,
  tags: item.tags,
  url: fluent(item.folder, item.skinned),
}));

const GIF_NAMES: { code: string; title: string; tags: string }[] = [
  { code: '1f602', title: 'Risada', tags: 'risada rir engraçado' },
  { code: '1f923', title: 'Gargalhada', tags: 'risada gargalhada' },
  { code: '1f62d', title: 'Choro', tags: 'choro triste' },
  { code: '1f97a', title: 'Por favor', tags: 'por favor vergonha' },
  { code: '1f633', title: 'Vergonha', tags: 'vergonha tímido' },
  { code: '1f631', title: 'Desespero', tags: 'desespero pânico medo' },
  { code: '1f389', title: 'Comemoração', tags: 'comemoração festa' },
  { code: '1f973', title: 'Festa', tags: 'festa comemoração' },
  { code: '1f382', title: 'Parabéns', tags: 'parabéns bolo aniversário' },
  { code: '1f44d', title: 'Joinha', tags: 'joinha curtir legal' },
  { code: '1f44f', title: 'Aplauso', tags: 'aplauso parabéns' },
  { code: '2764_fe0f', title: 'Coração', tags: 'amor coração' },
  { code: '1f525', title: 'Fogo', tags: 'fogo top' },
  { code: '1f381', title: 'Presente', tags: 'presente parabéns' },
];

export const GIFS = GIF_NAMES.map((item) => ({
  id: item.code,
  title: item.title,
  tags: item.tags,
  url: noto(item.code),
}));
