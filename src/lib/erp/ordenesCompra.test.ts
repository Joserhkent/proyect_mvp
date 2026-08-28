import { describe, it, expect } from 'vitest';
import { agruparDetallesPorProveedor } from './ordenesCompra';

describe('agruparDetallesPorProveedor', () => {
  it('agrupa líneas de distintos proveedores en distintas órdenes', () => {
    const grupos = agruparDetallesPorProveedor(
      [
        { id: 'd1', producto_id: 'p1', cantidad: 2 },
        { id: 'd2', producto_id: 'p2', cantidad: 5 },
      ],
      [
        { id: 'o1', detalle_id: 'd1', proveedor_id: 'provA', costo_unitario: 10 },
        { id: 'o2', detalle_id: 'd2', proveedor_id: 'provB', costo_unitario: 20 },
      ]
    );
    expect(grupos).toHaveLength(2);
    expect(grupos.find((g) => g.proveedor_id === 'provA')?.lineas).toEqual([{ producto_id: 'p1', cantidad: 2, costo_unitario: 10 }]);
    expect(grupos.find((g) => g.proveedor_id === 'provB')?.lineas).toEqual([{ producto_id: 'p2', cantidad: 5, costo_unitario: 20 }]);
  });

  it('agrupa dos líneas del mismo proveedor en una sola orden', () => {
    const grupos = agruparDetallesPorProveedor(
      [
        { id: 'd1', producto_id: 'p1', cantidad: 2 },
        { id: 'd2', producto_id: 'p2', cantidad: 5 },
      ],
      [
        { id: 'o1', detalle_id: 'd1', proveedor_id: 'provA', costo_unitario: 10 },
        { id: 'o2', detalle_id: 'd2', proveedor_id: 'provA', costo_unitario: 20 },
      ]
    );
    expect(grupos).toHaveLength(1);
    expect(grupos[0].lineas).toHaveLength(2);
  });

  it('omite líneas sin oferta ganadora', () => {
    const grupos = agruparDetallesPorProveedor([{ id: 'd1', producto_id: 'p1', cantidad: 2 }], []);
    expect(grupos).toHaveLength(0);
  });
});
