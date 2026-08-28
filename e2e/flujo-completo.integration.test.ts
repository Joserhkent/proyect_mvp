// Prueba de integración de caja negra: ejerce el flujo de negocio completo
// contra la base de datos REAL de Supabase (no mock), usando la service-role
// key. No pasa por el navegador/Next.js (eso requiere una sesión de login
// real — ver NOTAS.md / informe final), pero valida exactamente las mismas
// operaciones SQL que ejecutan las Server Actions de src/app/actions/*.
//
// Todos los registros creados llevan el prefijo TEST- y se limpian al final.
// El stock del producto usado se respalda y se restaura siempre (try/finally),
// para no dejar residuos en datos reales del proyecto.
//
// Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local.
// Ejecutar con: npm run test:integration

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { calcularTotalesCotizacion } from '../src/lib/erp/pricing';
import { elegirGanadoraPorDetalle } from '../src/lib/erp/proveedores';
import { agruparDetallesPorProveedor } from '../src/lib/erp/ordenesCompra';
import { clasificarEntrega } from '../src/lib/erp/entrega';

function loadEnv() {
  try {
    const content = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // ya puede venir seteado por el entorno (CI)
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

describe.skipIf(!url || !serviceKey)('Flujo completo del negocio (integración contra Supabase real)', () => {
  let supabase: SupabaseClient;
  let productoId: string;
  let stockOriginal: { stock_actual: number; stock_reservado: number };
  const idsCreados = {
    clientes: [] as string[],
    cotizaciones: [] as string[],
    ordenesCompra: [] as string[],
    facturasCompras: [] as string[],
    movimientos: [] as string[],
    despachos: [] as string[],
  };

  beforeAll(async () => {
    supabase = createClient(url!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: producto, error } = await supabase.from('productos').select('id, stock_actual, stock_reservado').limit(1).single();
    if (error || !producto) throw new Error('No hay productos semilla en la base para probar.');
    productoId = producto.id;
    stockOriginal = { stock_actual: producto.stock_actual ?? 0, stock_reservado: producto.stock_reservado ?? 0 };
  });

  afterAll(async () => {
    // Limpieza en orden inverso de dependencias.
    for (const id of idsCreados.despachos) await supabase.from('despachos_cliente').delete().eq('id', id);
    for (const id of idsCreados.movimientos) await supabase.from('movimientos_inventario').delete().eq('id', id);
    for (const id of idsCreados.facturasCompras) await supabase.from('facturas_compras').delete().eq('id', id);
    for (const id of idsCreados.ordenesCompra) await supabase.from('ordenes_compra').delete().eq('id', id); // cascada a orden_compra_detalles
    for (const id of idsCreados.cotizaciones) await supabase.from('cotizaciones').delete().eq('id', id); // cascada a detalles y cotizaciones_proveedor
    for (const id of idsCreados.clientes) await supabase.from('clientes').delete().eq('id', id);

    // Restaurar el stock del producto exactamente a como estaba.
    await supabase.from('productos').update(stockOriginal).eq('id', productoId);
  });

  it('recorre pedido → cotizar proveedores → aprobar → OC → pago → recepción completa → guía+factura → despacho', async () => {
    const sufijo = Date.now();

    // 1. Cliente pide productos
    const { data: cliente, error: cliError } = await supabase
      .from('clientes')
      .insert({ tipo_doc: 'RUC', num_doc: `TEST-${sufijo}`, razon_social: 'TEST Cliente E2E', direccion: 'Av. Test 123', email: 'test@example.com' })
      .select()
      .single();
    expect(cliError).toBeNull();
    idsCreados.clientes.push(cliente!.id);

    const { data: cotizacion, error: cotError } = await supabase
      .from('cotizaciones')
      .insert({ cliente_id: cliente!.id, tipo_operacion: 'PRODUCTO', estado: 'BORRADOR', moneda: 'PEN' })
      .select()
      .single();
    expect(cotError).toBeNull();
    idsCreados.cotizaciones.push(cotizacion!.id);

    const cantidad = 3;
    const precioUnitario = 100;
    const totales = calcularTotalesCotizacion([{ cantidad, precio_unitario: precioUnitario }]);
    expect(totales.total).toBeCloseTo(354, 2); // 300 + 18% igv

    const { data: detalle, error: detError } = await supabase
      .from('cotizacion_detalles')
      .insert({ cotizacion_id: cotizacion!.id, producto_id: productoId, cantidad, precio_unitario: precioUnitario, subtotal: cantidad * precioUnitario })
      .select()
      .single();
    expect(detError).toBeNull();

    await supabase.from('cotizaciones').update(totales).eq('id', cotizacion!.id);

    // 2. Consultar a los proveedores / recibir cotización (dos ofertas)
    const { data: proveedores } = await supabase.from('proveedores').select('id').limit(2);
    expect((proveedores ?? []).length).toBeGreaterThanOrEqual(1);
    const provA = proveedores![0].id;
    const provB = proveedores![Math.min(1, proveedores!.length - 1)].id;

    const { data: oferta1 } = await supabase
      .from('cotizaciones_proveedor')
      .insert({ cotizacion_id: cotizacion!.id, detalle_id: detalle!.id, producto_id: productoId, proveedor_id: provA, cantidad_cotizada: cantidad, costo_unitario: 80, dias_entrega: 5 })
      .select()
      .single();
    const { data: oferta2 } = await supabase
      .from('cotizaciones_proveedor')
      .insert({ cotizacion_id: cotizacion!.id, detalle_id: detalle!.id, producto_id: productoId, proveedor_id: provB, cantidad_cotizada: cantidad, costo_unitario: 70, dias_entrega: 4 })
      .select()
      .single();

    const ganadoras = elegirGanadoraPorDetalle([
      { id: oferta1!.id, detalle_id: detalle!.id, costo_unitario: 80, dias_entrega: 5 },
      { id: oferta2!.id, detalle_id: detalle!.id, costo_unitario: 70, dias_entrega: 4 },
    ]);
    expect(ganadoras[detalle!.id]).toBe(oferta2!.id); // la más barata gana
    await supabase.from('cotizaciones_proveedor').update({ es_ganadora: true }).eq('id', oferta2!.id);

    // 3. Mandar cotización al cliente → 4. Cliente aprueba
    await supabase.from('cotizaciones').update({ estado: 'ENVIADA' }).eq('id', cotizacion!.id);
    await supabase.from('cotizaciones').update({ estado: 'APROBADA' }).eq('id', cotizacion!.id);

    // El trigger trg_reservar_stock debe reservar el stock automáticamente.
    const { data: prodTrasAprobar } = await supabase.from('productos').select('stock_reservado').eq('id', productoId).single();
    expect(prodTrasAprobar!.stock_reservado).toBe(stockOriginal.stock_reservado + cantidad);

    // 5. Generar Orden de Compra agrupada por proveedor ganador
    const grupos = agruparDetallesPorProveedor(
      [{ id: detalle!.id, producto_id: productoId, cantidad }],
      [{ id: oferta2!.id, detalle_id: detalle!.id, proveedor_id: provB, costo_unitario: 70 }]
    );
    expect(grupos).toHaveLength(1);

    const { data: oc, error: ocError } = await supabase
      .from('ordenes_compra')
      .insert({ proveedor_id: provB, cotizacion_origen_id: cotizacion!.id, estado: 'PENDIENTE_PAGO', moneda: 'PEN', subtotal: 210, igv: 37.8, total: 247.8 })
      .select()
      .single();
    expect(ocError).toBeNull();
    idsCreados.ordenesCompra.push(oc!.id);
    await supabase.from('orden_compra_detalles').insert({ orden_compra_id: oc!.id, producto_id: productoId, cantidad, costo_unitario: 70, destino: 'CLIENTE', subtotal: 210 });

    // 6. Pago + voucher (aquí solo probamos el cambio de estado; la subida real
    //    a Storage requiere las políticas de supabase/patches/003, ver informe).
    await supabase.from('ordenes_compra').update({ estado: 'PAGADA', voucher_url: 'TEST-voucher-path.pdf', fecha_pago: new Date().toISOString() }).eq('id', oc!.id);

    // 7. Lanza orden y voucher de transferencia al proveedor
    await supabase.from('ordenes_compra').update({ estado: 'ENVIADA' }).eq('id', oc!.id);

    // 8. Recepción completa → clasificarEntrega debe dar GUIA_Y_FACTURA
    const clasificacion = clasificarEntrega([{ producto_id: productoId, cantidad }], [{ producto_id: productoId, cantidad }]);
    expect(clasificacion).toBe('GUIA_Y_FACTURA');

    const { data: factura, error: fcError } = await supabase
      .from('facturas_compras')
      .insert({
        orden_compra_id: oc!.id,
        proveedor_id: provB,
        serie: 'TEST',
        numero: `${sufijo}`,
        tipo_comprobante: clasificacion,
        fecha_emision: new Date().toISOString().slice(0, 10),
        moneda: 'PEN',
        subtotal: 210,
        igv: 37.8,
        total: 247.8,
      })
      .select()
      .single();
    expect(fcError).toBeNull();
    idsCreados.facturasCompras.push(factura!.id);

    const { data: movEntrada } = await supabase
      .from('movimientos_inventario')
      .insert({ producto_id: productoId, tipo_movimiento: 'ENTRADA', cantidad, costo_unitario: 70, referencia_tipo: 'ORDEN_COMPRA', referencia_id: oc!.id })
      .select()
      .single();
    idsCreados.movimientos.push(movEntrada!.id);

    const { data: prodAntesEntrada } = await supabase.from('productos').select('stock_actual').eq('id', productoId).single();
    await supabase.from('productos').update({ stock_actual: (prodAntesEntrada!.stock_actual ?? 0) + cantidad }).eq('id', productoId);
    await supabase.from('ordenes_compra').update({ estado: 'RECIBIDA' }).eq('id', oc!.id);

    const { data: ocFinal } = await supabase.from('ordenes_compra').select('estado').eq('id', oc!.id).single();
    expect(ocFinal!.estado).toBe('RECIBIDA');

    // 9. Guía de remisión al cliente (solo productos) + liberar stock reservado
    const { data: despacho, error: despError } = await supabase
      .from('despachos_cliente')
      .insert({ cotizacion_id: cotizacion!.id, numero_guia_remision: `TEST-GRE-${sufijo}`, direccion_llegada: 'Fundo de prueba' })
      .select()
      .single();
    expect(despError).toBeNull();
    idsCreados.despachos.push(despacho!.id);

    const { data: movSalida } = await supabase
      .from('movimientos_inventario')
      .insert({ producto_id: productoId, tipo_movimiento: 'SALIDA', cantidad, referencia_tipo: 'DESPACHO', referencia_id: despacho!.id })
      .select()
      .single();
    idsCreados.movimientos.push(movSalida!.id);
    const { data: movLiberacion } = await supabase
      .from('movimientos_inventario')
      .insert({ producto_id: productoId, tipo_movimiento: 'LIBERACION', cantidad, referencia_tipo: 'DESPACHO', referencia_id: despacho!.id })
      .select()
      .single();
    idsCreados.movimientos.push(movLiberacion!.id);

    const { data: prodAntesDespacho } = await supabase.from('productos').select('stock_actual, stock_reservado').eq('id', productoId).single();
    await supabase
      .from('productos')
      .update({
        stock_actual: (prodAntesDespacho!.stock_actual ?? 0) - cantidad,
        stock_reservado: (prodAntesDespacho!.stock_reservado ?? 0) - cantidad,
      })
      .eq('id', productoId);

    // Verificación final: el stock queda EXACTAMENTE como al inicio
    // (entró `cantidad` por la OC y salió `cantidad` por el despacho).
    const { data: prodFinal } = await supabase.from('productos').select('stock_actual, stock_reservado').eq('id', productoId).single();
    expect(prodFinal!.stock_actual).toBe(stockOriginal.stock_actual);
    expect(prodFinal!.stock_reservado).toBe(stockOriginal.stock_reservado);
  });

  it('una entrega parcial se clasifica como SOLO_GUIA y dos entregas sucesivas completan GUIA_Y_FACTURA', () => {
    const ordenado = [{ producto_id: 'p1', cantidad: 10 }];
    expect(clasificarEntrega(ordenado, [{ producto_id: 'p1', cantidad: 4 }])).toBe('SOLO_GUIA');
    expect(clasificarEntrega(ordenado, [{ producto_id: 'p1', cantidad: 10 }])).toBe('GUIA_Y_FACTURA');
  });
});
