import { describe, it, expect } from 'vitest';
import { elegirGanadoraPorDetalle } from './proveedores';

describe('elegirGanadoraPorDetalle', () => {
  it('elige la oferta más barata por línea', () => {
    const r = elegirGanadoraPorDetalle([
      { id: 'o1', detalle_id: 'd1', costo_unitario: 100, dias_entrega: 3 },
      { id: 'o2', detalle_id: 'd1', costo_unitario: 90, dias_entrega: 5 },
      { id: 'o3', detalle_id: 'd1', costo_unitario: 95, dias_entrega: 2 },
    ]);
    expect(r.d1).toBe('o2');
  });

  it('desempata por menor tiempo de entrega si el costo es igual', () => {
    const r = elegirGanadoraPorDetalle([
      { id: 'o1', detalle_id: 'd1', costo_unitario: 100, dias_entrega: 5 },
      { id: 'o2', detalle_id: 'd1', costo_unitario: 100, dias_entrega: 2 },
    ]);
    expect(r.d1).toBe('o2');
  });

  it('maneja varias líneas independientemente', () => {
    const r = elegirGanadoraPorDetalle([
      { id: 'o1', detalle_id: 'd1', costo_unitario: 50, dias_entrega: 3 },
      { id: 'o2', detalle_id: 'd2', costo_unitario: 30, dias_entrega: 1 },
      { id: 'o3', detalle_id: 'd2', costo_unitario: 30, dias_entrega: 4 },
    ]);
    expect(r.d1).toBe('o1');
    expect(r.d2).toBe('o2');
  });

  it('devuelve objeto vacío si no hay ofertas', () => {
    expect(elegirGanadoraPorDetalle([])).toEqual({});
  });
});
