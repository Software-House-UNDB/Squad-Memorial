/**
 * QR Code gerado no próprio aparelho (qrcode-generator, ~20 kB, sem rede): funciona offline.
 * Desenhado como um único <path> SVG, nítido em qualquer escala do palco.
 */
import qrcode from 'qrcode-generator';
import { useMemo } from 'react';

export function QrCode({ texto, tamanho = 320, rotulo }: { texto: string; tamanho?: number; rotulo: string }) {
  const { n, d } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(texto, 'Byte');
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) d += `M${x} ${y}h1v1h-1z`;
    return { n, d };
  }, [texto]);
  const margem = 2;
  return (
    <svg
      className="m-qr"
      width={tamanho}
      height={tamanho}
      viewBox={`${-margem} ${-margem} ${n + 2 * margem} ${n + 2 * margem}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={rotulo}
    >
      <rect x={-margem} y={-margem} width={n + 2 * margem} height={n + 2 * margem} fill="#fff" />
      <path d={d} fill="#2B2A28" />
    </svg>
  );
}
