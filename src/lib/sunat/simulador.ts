// Simulador de emisión SUNAT (sin integración real a un PSE/OSE). El hash y el
// QR son deterministas a partir de los datos ya persistidos en
// comprobantes_sunat (esa tabla no tiene columnas propias para guardarlos),
// así se pueden reconstruir en cualquier momento para descargar XML/CDR/PDF.

export function generarCorrelativo(): string {
  return Math.floor(100 + Math.random() * 900)
    .toString()
    .padStart(8, '0');
}

export interface CalcularHashQrInput {
  tipo_comprobante: 'FACTURA' | 'BOLETA';
  serie: string;
  numero: string;
  cliente_num_doc: string;
  total: number;
  igv: number;
  fecha_emision: string; // YYYY-MM-DD
}

export function calcularHashQr(input: CalcularHashQrInput): { hash: string; qrData: string } {
  const fullNumero = `${input.serie}-${input.numero}`;
  const hash =
    Buffer.from(`${fullNumero}|${input.cliente_num_doc}|${input.total}`)
      .toString('base64')
      .substring(0, 24) + '=';
  const qrData = `20601234567|${input.tipo_comprobante === 'FACTURA' ? '01' : '03'}|${input.serie}|${input.numero}|${input.igv}|${input.total}|${input.fecha_emision}|6|${input.cliente_num_doc}|${hash}`;
  return { hash, qrData };
}
