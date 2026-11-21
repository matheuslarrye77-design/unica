import { ImageCrop } from '@/components/journal/ImageCrop';
import type { FC } from 'react';

export const ImageAdjust: FC<{ file: File; onCancel: () => void; onConfirm: (file: File) => void; aspect?: number }> = ({ file, onCancel, onConfirm }) => (
  <ImageCrop file={file} onCancel={onCancel} onConfirm={onConfirm} />
);
