export function duracao(segundos: number | null | undefined) {
  if (!segundos && segundos !== 0) return "";
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
