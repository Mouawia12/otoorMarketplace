export interface CompressOptions {
  maxBytes?: number;
  maxWidth?: number;
  maxHeight?: number;
  qualityStep?: number;
}

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });

export const compressImageFile = async (
  file: File,
  { maxBytes = 3 * 1024 * 1024, maxWidth = 2000, maxHeight = 2000, qualityStep = 0.06 }: CompressOptions = {}
): Promise<File> => {
  if (typeof window === 'undefined' || !file.type.startsWith('image/')) {
    return file;
  }

  if (file.size <= maxBytes) {
    return file;
  }

  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);

  let { width, height } = image;
  const ratio = Math.min(1, maxWidth / width || 1, maxHeight / height || 1);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(image, 0, 0, width, height);

  let quality = 0.92;
  let blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality)
  );

  while (blob && blob.size > maxBytes && quality > 0.4) {
    quality = Math.max(0.1, quality - qualityStep);
    blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality)
    );
  }

  if (!blob || blob.size >= file.size) {
    return file;
  }

  return new File([blob], file.name.replace(/\.(png|jpg|jpeg|webp)$/i, '.jpg'), {
    type: blob.type,
    lastModified: Date.now(),
  });
};
