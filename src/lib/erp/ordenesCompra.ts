export interface DetalleParaAgrupar {
  id: string; // cotizacion_detalle id
  producto_id: string;
  cantidad: number;
}

export interface OfertaGanadora {
  id: string;
  detalle_id: string;
  proveedor_id: string;
  costo_unitario: number;
}

export interface LineaAgrupada {
  producto_id: string;
  cantidad: number;
  costo_unitario: number;
}

export interface GrupoOrdenCompra {
  proveedor_id: string;
  lineas: LineaAgrupada[];
}

/**
 * Agrupa las líneas de una cotización por el proveedor que ganó cada una
 * (cotizaciones_proveedor.es_ganadora), para generar una Orden de Compra por
 * proveedor. Una línea sin oferta ganadora se omite (no se puede comprar algo
 * que no se cotizó con ningún proveedor).
 */
export function agruparDetallesPorProveedor(
  detalles: DetalleParaAgrupar[],
  ofertasGanadoras: OfertaGanadora[]
): GrupoOrdenCompra[] {
  const ofertaPorDetalle = new Map(ofertasGanadoras.map((o) => [o.detalle_id, o]));
  const grupos = new Map<string, GrupoOrdenCompra>();

  for (const d of detalles) {
    const oferta = ofertaPorDetalle.get(d.id);
    if (!oferta) continue;

    let grupo = grupos.get(oferta.proveedor_id);
    if (!grupo) {
      grupo = { proveedor_id: oferta.proveedor_id, lineas: [] };
      grupos.set(oferta.proveedor_id, grupo);
    }
    grupo.lineas.push({ producto_id: d.producto_id, cantidad: d.cantidad, costo_unitario: oferta.costo_unitario });
  }

  return Array.from(grupos.values());
}
