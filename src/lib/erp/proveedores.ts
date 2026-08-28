export interface OfertaProveedor {
  id: string;
  detalle_id: string;
  costo_unitario: number;
  dias_entrega: number;
}

/**
 * De todas las ofertas de proveedores recibidas para una cotización, elige la
 * ganadora de cada línea (detalle_id): la de menor costo_unitario; en caso de
 * empate, la de menor dias_entrega; si sigue empatada, la primera recibida.
 */
export function elegirGanadoraPorDetalle(ofertas: OfertaProveedor[]): Record<string, string> {
  const mejorPorDetalle = new Map<string, OfertaProveedor>();

  for (const oferta of ofertas) {
    const actual = mejorPorDetalle.get(oferta.detalle_id);
    if (!actual) {
      mejorPorDetalle.set(oferta.detalle_id, oferta);
      continue;
    }
    const esMejor =
      oferta.costo_unitario < actual.costo_unitario ||
      (oferta.costo_unitario === actual.costo_unitario && oferta.dias_entrega < actual.dias_entrega);
    if (esMejor) mejorPorDetalle.set(oferta.detalle_id, oferta);
  }

  const resultado: Record<string, string> = {};
  for (const [detalleId, oferta] of mejorPorDetalle) {
    resultado[detalleId] = oferta.id;
  }
  return resultado;
}
