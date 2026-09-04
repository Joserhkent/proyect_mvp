import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CotizacionDetalle } from '@/types/erp';

// Función auxiliar para validar formato de UUID
const esUUIDValido = (str?: string) =>
  Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str));

// =======================================================
// GET: Obtener cotizaciones uniendo la tabla clientes y detalles
// =======================================================
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const busqueda = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const offset = (page - 1) * limit;

    // Relacionamos cotizaciones -> cliente y cotizacion_detalles -> productos
    let query = supabase
      .from('cotizaciones')
      .select('*, cliente:clientes(*), detalles:cotizacion_detalles(*, producto:productos(*))', { count: 'exact' });

    if (busqueda) {
      query = query.or(`codigo.ilike.%${busqueda}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      paginaActual: page,
      totalPaginas: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error al obtener cotizaciones de Supabase:', err);
    return NextResponse.json(
      { error: err.message || 'Error al obtener cotizaciones.' },
      { status: 500 }
    );
  }
}

// =======================================================
// POST: Crear/Recuperar cliente y registrar la cotización
// =======================================================
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      detalles,
      cliente_razon_social,
      cliente_num_doc,
      cliente_direccion,
      cliente_tipo_doc,
      cliente_email,
      cliente_telefono,
      cliente_estado,
      cliente_condicion,
      cliente_departamento,
      cliente_provincia,
      cliente_distrito,
      cliente_id,
      id,
      created_at,
      updated_at,
      ...datosRestantes
    } = body;

    let finalClienteId = cliente_id;

    // 1. LÓGICA DE GESTIÓN / AUTO-CREACIÓN DEL CLIENTE
    if (!esUUIDValido(finalClienteId) && cliente_num_doc) {
      // A. Buscar si el cliente ya existe por su RUC/DNI en la tabla 'clientes'
      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('id')
        .eq('num_doc', cliente_num_doc)
        .maybeSingle();

      if (clienteExistente) {
        finalClienteId = clienteExistente.id;
      } else {
        // B. Determinar el tipo de documento si no viene especificado
        const tipoDocCalculado =
          cliente_tipo_doc || (cliente_num_doc.length === 11 ? 'RUC' : cliente_num_doc.length === 8 ? 'DNI' : 'OTRO');

        // C. Crear el cliente con todas las columnas disponibles de SUNAT/RENIEC
        const { data: nuevoCliente, error: errorCliente } = await supabase
          .from('clientes')
          .insert({
            tipo_doc: tipoDocCalculado,
            num_doc: cliente_num_doc,
            razon_social: cliente_razon_social || 'CLIENTE VARIOS',
            direccion: cliente_direccion || null,
            email: cliente_email || null,
            telefono: cliente_telefono || null,
            estado_contribuyente: cliente_estado || 'ACTIVO',
            condicion: cliente_condicion || 'HABIDO',
            departamento: cliente_departamento || null,
            provincia: cliente_provincia || null,
            distrito: cliente_distrito || null,
          })
          .select('id')
          .single();

        if (errorCliente) throw new Error(`Error al auto-crear el cliente: ${errorCliente.message}`);
        finalClienteId = nuevoCliente.id;
      }
    }

    // 2. CREAR CABECERA DE LA COTIZACIÓN CON EL CLIENTE_ID FINAL
    const codigoGenerado = `COT-${Math.floor(1000 + Math.random() * 9000)}`;

    const payloadCabecera = {
      codigo: codigoGenerado,
      cliente_id: finalClienteId,
      vendedor_id: esUUIDValido(datosRestantes.vendedor_id) ? datosRestantes.vendedor_id : null,
      tipo_operacion: datosRestantes.tipo_operacion || 'VENTA',
      estado: datosRestantes.estado || 'PENDIENTE',
      moneda: datosRestantes.moneda || 'USD',
      subtotal: datosRestantes.subtotal ?? 0,
      igv: datosRestantes.igv ?? 0,
      total: datosRestantes.total ?? 0,
      validez_dias: datosRestantes.validez_dias ?? 15,
      fecha_emision: datosRestantes.fecha_emision || new Date().toISOString(),
      fecha_expiracion: datosRestantes.fecha_expiracion || null,
      fecha_entrega_estimada: datosRestantes.fecha_entrega_estimada || null,
      dias_entrega_estimados: datosRestantes.dias_entrega_estimados || null,
      ingreso_manual_fecha: datosRestantes.ingreso_manual_fecha ?? false,
    };

    const { data: cotizacion, error: errorCotizacion } = await supabase
      .from('cotizaciones')
      .insert(payloadCabecera)
      .select('*, cliente:clientes(*)')
      .single();

    if (errorCotizacion) throw errorCotizacion;

    // 3. INSERTAR DETALLES DE LA COTIZACIÓN
    let detallesGuardados: CotizacionDetalle[] = [];

    if (detalles && Array.isArray(detalles) && detalles.length > 0) {
      const detallesAInsertar = detalles.map((item: CotizacionDetalle) => ({
        cotizacion_id: cotizacion.id,
        producto_id: item.producto_id,
        cantidad: item.cantidad ?? 1,
        precio_unitario: item.precio_unitario ?? 0,
        subtotal: item.subtotal ?? 0,
      }));

      const { data: dataDetalles, error: errorDetalles } = await supabase
        .from('cotizacion_detalles')
        .insert(detallesAInsertar)
        .select('*, producto:productos(*)');

      if (errorDetalles) throw errorDetalles;

      detallesGuardados = (dataDetalles || []).map((d: any) => ({
        id: d.id,
        producto_id: d.producto_id,
        producto_nombre: d.producto?.nombre || 'Producto',
        producto_sku: d.producto?.sku || null,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
        subtotal: d.subtotal,
      }));
    }

    // 4. RETORNAR RESPUESTA UNIFICADA PARA EL FRONTEND
    return NextResponse.json(
      {
        ...cotizacion,
        cliente_razon_social: cotizacion.cliente?.razon_social || cliente_razon_social,
        cliente_num_doc: cotizacion.cliente?.num_doc || cliente_num_doc,
        detalles: detallesGuardados,
      },
      { status: 201 }
    );
  } catch (error) {
    const err = error as Error;
    console.error('Error al guardar en Supabase:', err);
    return NextResponse.json(
      { error: err.message || 'Error al registrar la cotización.' },
      { status: 500 }
    );
  }
}