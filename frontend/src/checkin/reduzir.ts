/**
 * Reduz a foto no próprio celular antes do envio (lado maior 2560 px, JPEG): fotos de celular
 * passam fácil de 10 MB, e o envio pelo 4G fica lento. O servidor confere e reencoda de novo.
 * Se o navegador não conseguir decodificar, envia o arquivo original.
 */
const LADO_MAXIMO = 2560;
const SEM_REDUZIR_ATE = 1.5 * 1024 * 1024;

export async function reduzirFoto(arquivo: File): Promise<File> {
  if (!arquivo.type.startsWith('image/')) return arquivo;
  try {
    const bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
    if (escala === 1 && arquivo.size <= SEM_REDUZIR_ATE && /jpe?g|png|webp/.test(arquivo.type)) {
      bitmap.close();
      return arquivo;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', 0.88));
    if (!blob) return arquivo;
    return new File([blob], arquivo.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return arquivo;
  }
}
