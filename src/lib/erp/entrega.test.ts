import { describe, it, expect } from 'vitest';
import { clasificarEntrega } from './entrega';

describe('clasificarEntrega', () => {
  it('clasifica como GUIA_Y_FACTURA cuando todo llega completo', () => {
    const r = clasificarEntrega(
      [
        { producto_id: 'p1', cantidad: 10 },
        { producto_id: 'p2', cantidad: 5 },
      ],
      [
        { producto_id: 'p1', cantidad: 10 },
        { producto_id: 'p2', cantidad: 5 },
      ]
    );
    expect(r).toBe('GUIA_Y_FACTURA');
  });

  it('clasifica como SOLO_GUIA cuando falta cantidad de un producto', () => {
    const r = clasificarEntrega(
      [
        { producto_id: 'p1', cantidad: 10 },
        { producto_id: 'p2', cantidad: 5 },
      ],
      [
        { producto_id: 'p1', cantidad: 10 },
        { producto_id: 'p2', cantidad: 3 },
      ]
    );
    expect(r).toBe('SOLO_GUIA');
  });

  it('clasifica como SOLO_GUIA cuando un producto no llegó en absoluto', () => {
    const r = clasificarEntrega([{ producto_id: 'p1', cantidad: 10 }], []);
    expect(r).toBe('SOLO_GUIA');
  });

  it('trata una sobre-entrega como completa (GUIA_Y_FACTURA)', () => {
    const r = clasificarEntrega([{ producto_id: 'p1', cantidad: 10 }], [{ producto_id: 'p1', cantidad: 12 }]);
    expect(r).toBe('GUIA_Y_FACTURA');
  });

  it('acumula entregas parciales sucesivas hasta completar', () => {
    const ordenado = [{ producto_id: 'p1', cantidad: 10 }];
    const primeraEntrega = [{ producto_id: 'p1', cantidad: 4 }];
    expect(clasificarEntrega(ordenado, primeraEntrega)).toBe('SOLO_GUIA');

    const acumuladoTrasSegunda = [{ producto_id: 'p1', cantidad: 10 }];
    expect(clasificarEntrega(ordenado, acumuladoTrasSegunda)).toBe('GUIA_Y_FACTURA');
  });
});
