export interface CantidadProducto {
  producto_id: string;
  cantidad: number;
}

export type ClasificacionEntrega = 'SOLO_GUIA' | 'GUIA_Y_FACTURA';

/**
 * Compara lo ordenado contra lo recibido acumulado (de todas las recepciones
 * hechas hasta ahora sobre esa Orden de Compra, incluyendo la actual) y
 * decide el documento correspondiente:
 *   - GUIA_Y_FACTURA si TODOS los productos llegaron completos.
 *   - SOLO_GUIA si falta cualquier cantidad de cualquier producto.
 */
export function clasificarEntrega(ordenado: CantidadProducto[], recibidoAcumulado: CantidadProducto[]): ClasificacionEntrega {
  const recibidoPorProducto = new Map(recibidoAcumulado.map((r) => [r.producto_id, r.cantidad]));
  const completo = ordenado.every((o) => (recibidoPorProducto.get(o.producto_id) ?? 0) >= o.cantidad);
  return completo ? 'GUIA_Y_FACTURA' : 'SOLO_GUIA';
}
