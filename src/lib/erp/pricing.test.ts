import { describe, it, expect } from 'vitest';
import { calcularTotalesCotizacion } from './pricing';

describe('calcularTotalesCotizacion', () => {
  it('calcula subtotal, igv (18%) y total sin descuentos', () => {
    const r = calcularTotalesCotizacion([{ cantidad: 2, precio_unitario: 100 }]);
    expect(r.subtotal).toBe(200);
    expect(r.igv).toBe(36);
    expect(r.total).toBe(236);
  });

  it('aplica descuento porcentual por línea antes del IGV', () => {
    const r = calcularTotalesCotizacion([{ cantidad: 1, precio_unitario: 1000, descuento_pct: 10 }]);
    expect(r.subtotal).toBe(900);
    expect(r.igv).toBe(162);
    expect(r.total).toBe(1062);
  });

  it('suma múltiples líneas', () => {
    const r = calcularTotalesCotizacion([
      { cantidad: 3, precio_unitario: 50 },
      { cantidad: 1, precio_unitario: 100, descuento_pct: 5 },
    ]);
    expect(r.subtotal).toBe(245);
  });

  it('devuelve ceros para un carrito vacío', () => {
    const r = calcularTotalesCotizacion([]);
    expect(r).toEqual({ subtotal: 0, igv: 0, total: 0 });
  });

  it('redondea correctamente a 2 decimales evitando errores de punto flotante', () => {
    const r = calcularTotalesCotizacion([{ cantidad: 3, precio_unitario: 19.99 }]);
    expect(r.subtotal).toBe(59.97);
  });
});
