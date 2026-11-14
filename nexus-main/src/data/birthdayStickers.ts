export type BirthdayStickerArt = {
  id: string;
  src: string;
};

const files = [
  '2400_3104---1.svg',
  '2400_3104---2.svg',
  '2400_3104---3.svg',
  '2400_3104---4.svg',
  '2400_3104---5.svg',
  '2400_3104---6.svg',
  '2400_3104---7.svg',
  '2400_3104---8.svg',
  '2400_3104---9.svg',
  '2400_3104---10.svg',
  '2400_3104---11.svg',
  '2400_3104---12.svg',
  '2400_3104---13.svg',
  '2400_3104---14.svg',
  '2400_3104---15.svg',
  '2400_3104---16.svg',
  '2400_3104---17.svg',
  '2400_3104---18.svg',
  '2400_3104---19.svg',
  '2400_3104---20.svg',
  '2400_3104---21.svg',
  '2400_3104---22.svg',
  '2400_3104---23.svg',
  '2400_3104---24.svg',
  '2400_3104---25.svg',
  '2400_3104---26.svg',
  '2400_3104.svg',
];

export const BIRTHDAY_STICKERS: BirthdayStickerArt[] = files.map((file) => ({
  id: file,
  src: `/aniversario/stickers/${file}`,
}));

export function birthdayStickerArt(id: string) {
  return BIRTHDAY_STICKERS.find((item) => item.id === id) ?? null;
}
