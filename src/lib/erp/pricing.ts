export const IGV_RATE = 0.18;

export interface LineaCalculable {
  cantidad: number;
  precio_unitario: number;
  descuento_pct?: number;
}

export interface Totales {
  subtotal: number;
  igv: number;
  total: number;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Calcula subtotal (neto de descuento), IGV y total de un set de líneas de cotización. */
export function calcularTotalesCotizacion(detalles: LineaCalculable[]): Totales {
  const subtotal = detalles.reduce((acc, d) => {
    const bruto = d.cantidad * d.precio_unitario;
    const descuento = bruto * ((d.descuento_pct ?? 0) / 100);
    return acc + (bruto - descuento);
  }, 0);

  const subtotalRedondeado = round2(subtotal);
  const igv = round2(subtotalRedondeado * IGV_RATE);
  const total = round2(subtotalRedondeado + igv);

  return { subtotal: subtotalRedondeado, igv, total };
}
