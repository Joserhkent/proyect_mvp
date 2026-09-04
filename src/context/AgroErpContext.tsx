'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Cotizacion,
  OrdenCompra,
  FacturaCompra,
  ComprobanteSunat,
  OrdenTrabajo,
  Producto,
  Proveedor,
  Cliente,
  Usuario,
  CotizacionEstado,
  OrdenCompraEstado,
  OrdenTrabajoEstado,
  ConsultaSunatResult,
} from '@/types/erp';
import confetti from 'canvas-confetti';
import { createClient } from '@/lib/supabase/client';

interface AgroErpContextType {
  usuarioActual: Usuario;
  usuarios: Usuario[];
  setUsuarioActual: (usuario: Usuario) => void;
  iniciarSesion: (email: string) => boolean;
  cerrarSesion: () => void;
  cotizaciones: Cotizacion[];
  ordenesCompra: OrdenCompra[];
  facturasCompras: FacturaCompra[];
  comprobantesSunat: ComprobanteSunat[];
  ordenesTrabajo: OrdenTrabajo[];
  productos: Producto[];
  proveedores: Proveedor[];
  clientes: Cliente[];

  // Cotizaciones Actions
  crearCotizacion: (data: Omit<Cotizacion, 'id' | 'numero' | 'fecha'>) => Promise<Cotizacion>;
  editarCotizacion: (id: string, data: Pick<Cotizacion, 'tipo_operacion' | 'subtotal' | 'igv' | 'total' | 'detalles'>) => Promise<boolean>;
  aprobarCotizacion: (id: string) => Promise<boolean>;
  generarOrdenesCompraDesdeCotizacion: (cotizacionId: string) => Promise<{ creadas: number; ordenes: OrdenCompra[]; error?: string }>;
  asignarOrdenTrabajo: (cotizacionId: string, tecnicoId: string, tecnicoNombre: string, fechaProgramada: string) => OrdenTrabajo;
  emitirFacturaSunatDesdeCotizacion: (cotizacionId: string, tipo: 'FACTURA' | 'BOLETA') => Promise<ComprobanteSunat>;

  // Compras Actions
  actualizarEstadoOC: (id: string, nuevoEstado: OrdenCompraEstado) => void;
  registrarPagoOC: (id: string, voucherFile: File) => Promise<boolean>;
  recepcionarOCYFacturaProveedor: (ordenCompraId: string, numeroFacturaProveedor: string, montoTotal: number) => void;

  // Técnico de Campo Actions
  actualizarEstadoOT: (id: string, nuevoEstado: OrdenTrabajoEstado) => void;
  agregarHitoBitacora: (ordenTrabajoId: string, hito: string, nota: string, fotoUrl?: string, materialesExtra?: string) => void;
  finalizarOTConFirma: (ordenTrabajoId: string, firmaDataUrl: string, nombreFirmante: string) => void;

  // Consulta RUC / DNI SUNAT
  consultarRucDniSunat: (numero: string, tipo?: 'RUC' | 'DNI') => Promise<ConsultaSunatResult>;

  // Métricas
  metricas: {
    totalVentasFacturadas: number;
    cotizacionesPendientesCount: number;
    ordenesCompraEnTransito: number;
    ordenesTrabajoActivas: number;
    totalComprasProveedores: number;
  };
}

const AgroErpContext = createContext<AgroErpContextType | undefined>(undefined);

export function AgroErpProvider({ children }: { children: React.ReactNode }) {
  const [usuarioActual, setUsuarioActual] = useState<Usuario>({
    id: '',
    nombre: '',
    email: '',
    rol: 'ADMIN',
  });
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [ordenesCompra, setOrdenesCompra] = useState<OrdenCompra[]>([]);
  const [facturasCompras, setFacturasCompras] = useState<FacturaCompra[]>([]);
  const [comprobantesSunat, setComprobantesSunat] = useState<ComprobanteSunat[]>([]);
  const [ordenesTrabajo, setOrdenesTrabajo] = useState<OrdenTrabajo[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  useEffect(() => {
    const supabase = createClient();

    const loadCatalogos = async () => {
      try {
        const [
          { data: usuariosData },
          { data: clientesData },
          { data: proveedoresData },
          { data: productosData },
          { data: cotizacionesData },
          { data: cotizacionDetallesData },
          { data: ordenesCompraData },
          { data: ordenCompraDetallesData },
          { data: facturasComprasData },
          { data: comprobantesSunatData },
          { data: ordenesTrabajoData },
          { data: bitacoraData },
        ] = await Promise.all([
          supabase.from('usuarios').select('*'),
          supabase.from('clientes').select('*'),
          supabase.from('proveedores').select('*'),
          supabase.from('productos').select('*'),
          supabase.from('cotizaciones').select('*'),
          supabase.from('cotizacion_detalles').select('*'),
          supabase.from('ordenes_compra').select('*'),
          supabase.from('orden_compra_detalles').select('*'),
          supabase.from('facturas_compras').select('*'),
          supabase.from('comprobantes_sunat').select('*'),
          supabase.from('ordenes_trabajo').select('*'),
          supabase.from('bitacora_tecnica').select('*'),
        ]);

        const usuariosNormalizados = (usuariosData ?? []).map((u: any) => ({
          id: u.id,
          nombre: u.nombre,
          email: u.email,
          rol: (u.rol as Usuario['rol']) ?? 'ADMIN',
          telefono: u.telefono,
          avatarUrl: u.avatar_url,
        }));

        const clientesNormalizados = (clientesData ?? []).map((c: any) => ({
          id: c.id,
          tipo_doc: c.tipo_doc,
          num_doc: c.num_doc,
          razon_social: c.razon_social,
          direccion: c.direccion,
          email: c.email,
          telefono: c.telefono,
          estado_contribuyente: c.estado_contribuyente,
          condicion: c.condicion,
          departamento: c.departamento,
          provincia: c.provincia,
          distrito: c.distrito,
        }));

        const proveedoresNormalizados = (proveedoresData ?? []).map((p: any) => ({
          id: p.id,
          ruc: p.ruc,
          razon_social: p.razon_social,
          email: p.email,
          telefono: p.telefono ?? '',
          contacto: p.contacto ?? '',
          direccion: p.direccion ?? '',
          departamento: p.departamento,
          provincia: p.provincia,
          dias_entrega_estimados: p.dias_entrega_estimados,
          costo_flete_base: p.costo_flete_base,
        }));

        const productosNormalizados = (productosData ?? []).map((p: any) => ({
          id: p.id,
          codigo: p.sku ?? p.codigo ?? '',
          nombre: p.nombre,
          descripcion: p.descripcion ?? '',
          categoria: (p.categoria ?? 'OTRO') as Producto['categoria'],
          precio_venta: Number(p.precio_venta ?? 0),
          costo_compra: Number(p.ultimo_costo_compra ?? p.costo_promedio ?? 0),
          proveedor_id: p.proveedor_id ?? '',
          proveedor_nombre: p.proveedor_nombre ?? '',
          stock: Number(p.stock_actual ?? 0),
          unidad_medida: p.unidad_medida ?? 'UNIDAD',
        }));

        const clientesMap = new Map((clientesNormalizados ?? []).map((c) => [c.id, c]));
        const productosMap = new Map((productosNormalizados ?? []).map((p) => [p.id, p]));
        const proveedoresMap = new Map((proveedoresNormalizados ?? []).map((p) => [p.id, p]));

        const cotizacionesNormalizadas = (cotizacionesData ?? []).map((c: any) => {
          const cliente = clientesMap.get(c.cliente_id) ?? {
            tipo_doc: 'RUC',
            num_doc: '',
            razon_social: '',
            direccion: '',
            email: '',
            telefono: '',
          };

          const detalles = (cotizacionDetallesData ?? [])
            .filter((d: any) => d.cotizacion_id === c.id)
            .map((d: any) => {
              const producto = productosMap.get(d.producto_id) ?? {
                codigo: d.producto_codigo ?? '',
                nombre: d.producto_nombre ?? '',
                proveedor_id: d.proveedor_id ?? '',
                costo_compra: 0,
              };

              const subtotal = Number(d.subtotal ?? ((Number(d.precio_unitario ?? 0) * Number(d.cantidad ?? 0))));

              return {
                id: d.id,
                cotizacion_id: c.id,
                producto_id: d.producto_id,
                producto_codigo: producto.codigo,
                producto_nombre: producto.nombre,
                proveedor_id: d.proveedor_id ?? producto.proveedor_id ?? '',
                cantidad: Number(d.cantidad ?? 0),
                precio_unitario: Number(d.precio_unitario ?? 0),
                costo_unitario: Number(d.costo_unitario ?? producto.costo_compra ?? 0),
                subtotal,
              };
            });

          return {
            id: c.id,
            numero: c.codigo ?? `COT-${c.id.slice(0, 6).toUpperCase()}`,
            cliente_id: c.cliente_id,
            cliente_tipo_doc: cliente.tipo_doc,
            cliente_num_doc: cliente.num_doc,
            cliente_razon_social: cliente.razon_social,
            cliente_direccion: cliente.direccion,
            cliente_email: cliente.email,
            cliente_telefono: cliente.telefono,
            tipo_operacion: c.tipo_operacion === 'PROYECTO_MESA' ? 'VENTA_ARMADO' : 'SOLO_VENTA',
            estado: c.estado === 'APROBADA'
              ? 'APROBADA'
              : c.estado === 'RECHAZADA'
                ? 'RECHAZADA'
              : c.estado === 'ENVIADA'
                ? 'EN_COMPRAS'
                : c.estado === 'BORRADOR'
                  ? 'PENDIENTE'
                  : 'PENDIENTE',
            subtotal: Number(c.subtotal ?? 0),
            igv: Number(c.igv ?? 0),
            total: Number(c.total ?? 0),
            moneda: c.moneda ?? 'PEN',
            tiempo_entrega_estimado_dias: Number(c.dias_entrega_estimados ?? 0),
            observaciones: c.observaciones ?? '',
            incluye_mano_obra: false,
            costo_mano_obra: 0,
            orden_trabajo_id: undefined,
            comprobante_id: undefined,
            fecha: c.fecha_emision ? c.fecha_emision.split('T')[0] : new Date().toISOString().split('T')[0],
            detalles,
          } as Cotizacion;
        });

        const ordenesCompraNormalizadas = (ordenesCompraData ?? []).map((oc: any) => {
          const proveedor = proveedoresMap.get(oc.proveedor_id) ?? {
            ruc: '',
            razon_social: '',
            email: '',
          };

          const detalles = (ordenCompraDetallesData ?? [])
            .filter((d: any) => d.orden_compra_id === oc.id)
            .map((d: any) => ({
              id: d.id,
              producto_id: d.producto_id,
              producto_codigo: d.producto_codigo ?? '',
              producto_nombre: d.producto_nombre ?? '',
              cantidad: Number(d.cantidad ?? 0),
              costo_unitario: Number(d.costo_unitario ?? 0),
              subtotal: Number(d.subtotal ?? 0),
            }));

          return {
            id: oc.id,
            numero: oc.codigo ?? `OC-${oc.id.slice(0, 6).toUpperCase()}`,
            proveedor_id: oc.proveedor_id,
            proveedor_ruc: proveedor.ruc,
            proveedor_razon_social: proveedor.razon_social,
            proveedor_email: proveedor.email,
            cotizacion_id: oc.cotizacion_origen_id ?? undefined,
            cotizacion_numero: undefined,
            fecha: oc.fecha_envio ? oc.fecha_envio.split('T')[0] : new Date().toISOString().split('T')[0],
            fecha_estimada_entrega: oc.fecha_entrega_estimada ? oc.fecha_entrega_estimada.split('T')[0] : undefined,
            estado: oc.estado === 'RECIBIDA'
              ? 'RECIBIDO'
              : oc.estado === 'ENVIADA'
                ? 'ENVIADO'
                : oc.estado === 'PAGADA'
                  ? 'PAGADO'
                  : oc.estado === 'PENDIENTE_PAGO'
                    ? 'PENDIENTE_PAGO'
                    : 'BORRADOR',
            monto_total: Number(oc.total ?? 0),
            moneda: oc.moneda ?? 'PEN',
            factura_proveedor_num: undefined,
            fecha_recepcion: undefined,
            voucher_url: oc.voucher_url ?? undefined,
            fecha_pago: oc.fecha_pago ? oc.fecha_pago.split('T')[0] : undefined,
            detalles,
          } as OrdenCompra;
        });

        const facturasComprasNormalizadas = (facturasComprasData ?? []).map((fc: any) => ({
          id: fc.id,
          proveedor_id: fc.proveedor_id,
          proveedor_nombre: proveedoresMap.get(fc.proveedor_id)?.razon_social ?? '',
          orden_compra_id: fc.orden_compra_id,
          orden_compra_numero: fc.orden_compra_numero ?? '',
          numero_factura: `${fc.serie ?? 'F001'}-${fc.numero ?? ''}`,
          fecha_emision: fc.fecha_emision ? fc.fecha_emision.split('T')[0] : new Date().toISOString().split('T')[0],
          monto_total: Number(fc.total ?? 0),
          moneda: fc.moneda ?? 'PEN',
          estado_pago: fc.estado_conciliacion === 'CONCILIADA' ? 'PAGADO' : 'PENDIENTE',
        } as FacturaCompra));

        const comprobantesSunatNormalizados = (comprobantesSunatData ?? []).map((c: any) => {
          const cliente = clientesMap.get(c.cliente_id) ?? {
            tipo_doc: 'RUC',
            num_doc: '',
            razon_social: '',
            direccion: '',
          };

          return {
            id: c.id,
            cotizacion_id: c.cotizacion_id ?? undefined,
            tipo_comprobante: c.tipo_comprobante,
            serie: c.serie,
            numero: c.numero,
            cliente_tipo_doc: cliente.tipo_doc,
            cliente_num_doc: cliente.num_doc,
            cliente_razon_social: cliente.razon_social,
            cliente_direccion: cliente.direccion,
            subtotal: Number(c.subtotal ?? 0),
            igv: Number(c.igv ?? 0),
            total: Number(c.total ?? 0),
            moneda: c.moneda ?? 'PEN',
            xml_url: c.xml_url ?? '',
            cdr_url: c.cdr_url ?? '',
            pdf_url: c.pdf_url ?? '',
            estado_sunat: c.estado_sunat === 'ACEPTADO' ? 'ACEPTADO' : c.estado_sunat === 'RECHAZADO' ? 'RECHAZADO' : 'ENVIADO',
            hash_cpe: c.hash_cpe ?? '',
            qr_data: c.qr_data ?? '',
            fecha_emision: c.created_at ? c.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            observaciones_sunat: undefined,
          } as ComprobanteSunat;
        });

        const bitacoraPorOrden = new Map<string, any[]>();
        (bitacoraData ?? []).forEach((b: any) => {
          const key = b.orden_trabajo_id;
          if (!bitacoraPorOrden.has(key)) bitacoraPorOrden.set(key, []);
          bitacoraPorOrden.get(key)?.push({
            id: b.id,
            orden_trabajo_id: b.orden_trabajo_id,
            hito: b.titulo,
            nota: b.descripcion,
            foto_url: Array.isArray(b.adjuntos) ? b.adjuntos.find((x: any) => x.tipo === 'foto')?.url : undefined,
            materiales_extra: Array.isArray(b.adjuntos)
              ? b.adjuntos.find((x: any) => x.tipo === 'texto' && x.valor)?.valor
              : undefined,
            fecha_registro: b.created_at ? b.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            hora_registro: b.created_at ? new Date(b.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true }) : '',
          });
        });

        const ordenesTrabajoNormalizadas = (ordenesTrabajoData ?? []).map((ot: any) => {
          const tecnico = usuariosNormalizados.find((u) => u.id === ot.tecnico_asignado);
          const cliente = clientesMap.get(ot.cliente_id) ?? {
            razon_social: '',
            telefono: '',
            direccion: '',
          };

          return {
            id: ot.id,
            codigo: ot.codigo ?? `OT-${ot.id.slice(0, 6).toUpperCase()}`,
            cotizacion_id: ot.cotizacion_origen_id ?? '',
            cotizacion_numero: '',
            cliente_nombre: cliente.razon_social,
            cliente_telefono: cliente.telefono,
            ubicacion_fundo: cliente.direccion,
            tecnico_id: ot.tecnico_asignado ?? '',
            tecnico_nombre: tecnico?.nombre ?? '',
            fecha_programada: ot.fecha_fin_estimada ? ot.fecha_fin_estimada.split('T')[0] : new Date().toISOString().split('T')[0],
            estado: ot.estado === 'COMPLETADA' ? 'FINALIZADO' : ot.estado === 'EN_PROGRESO' ? 'EN_PROCESO' : 'PENDIENTE',
            observaciones: ot.descripcion ?? '',
            firma_cliente_url: undefined,
            firma_cliente_nombre: undefined,
            fecha_finalizacion: ot.fecha_fin_real ? ot.fecha_fin_real.split('T')[0] : undefined,
            informe_pdf_url: undefined,
            bitacora: bitacoraPorOrden.get(ot.id) ?? [],
          } as OrdenTrabajo;
        });

        setUsuarios(usuariosNormalizados);
        setClientes(clientesNormalizados);
        setProveedores(proveedoresNormalizados);
        setProductos(productosNormalizados);
        setCotizaciones(cotizacionesNormalizadas);
        setOrdenesCompra(ordenesCompraNormalizadas);
        setFacturasCompras(facturasComprasNormalizadas);
        setComprobantesSunat(comprobantesSunatNormalizados);
        setOrdenesTrabajo(ordenesTrabajoNormalizadas);

        const firstUser = usuariosNormalizados[0];
        if (firstUser) {
          setUsuarioActual({
            id: firstUser.id,
            nombre: firstUser.nombre,
            email: firstUser.email,
            rol: (firstUser.rol as Usuario['rol']) ?? 'ADMIN',
            telefono: firstUser.telefono,
            avatarUrl: firstUser.avatarUrl,
          });
        }
      } catch (error) {
        console.error('Error cargando datos desde Supabase:', error);
      }
    };

    loadCatalogos();
  }, []);

  // Auth Actions
  const iniciarSesion = (email: string): boolean => {
    const user = usuarios.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user) {
      return false;
    }

    setUsuarioActual(user);
    return true;
  };

  const cerrarSesion = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUsuarioActual({
      id: '',
      nombre: '',
      email: '',
      rol: 'ADMIN',
    });
  };

  // Consulta RUC / DNI
  const consultarRucDniSunat = async (numero: string, tipo?: 'RUC' | 'DNI'): Promise<ConsultaSunatResult> => {
    try {
      const res = await fetch(`/api/sunat/consulta-ruc?numero=${numero}&tipo=${tipo || ''}`);
      const data = await res.json();
      return data;
    } catch {
      return { error: 'Error al consultar servicio SUNAT' };
    }
  };

  // Crear Cotización
  const crearCotizacion = async (data: Omit<Cotizacion, 'id' | 'numero' | 'fecha'>) => {
    const supabase = createClient();
    const correlativo = (cotizaciones.length + 1).toString().padStart(3, '0');
    const nuevoNumero = `COT-2026-${correlativo}`;
    const clientePayload = {
      tipo_doc: data.cliente_tipo_doc,
      num_doc: data.cliente_num_doc,
      razon_social: data.cliente_razon_social,
      direccion: data.cliente_direccion,
      email: data.cliente_email,
      telefono: data.cliente_telefono,
      estado_contribuyente: 'ACTIVO',
      condicion: 'HABIDO',
    };

    const { data: clienteUpserted, error: clienteError } = await supabase
      .from('clientes')
      .upsert(clientePayload, { onConflict: 'num_doc' })
      .select()
      .single();

    if (clienteError) {
      console.warn('No se pudo guardar cliente:', clienteError.message);
      throw new Error(`No se pudo guardar el cliente: ${clienteError.message}`);
    }

    const { data: cotizacionInsertada, error: cotizacionError } = await supabase
      .from('cotizaciones')
      .insert({
        codigo: nuevoNumero,
        cliente_id: clienteUpserted?.id ?? data.cliente_id,
        vendedor_id: usuarioActual?.id || null,
        tipo_operacion: data.tipo_operacion === 'VENTA_ARMADO' ? 'PROYECTO_MESA' : 'PRODUCTO',
        estado: 'BORRADOR',
        moneda: data.moneda,
        subtotal: data.subtotal,
        igv: data.igv,
        total: data.total,
        fecha_emision: new Date().toISOString(),
      })
      .select()
      .single();

    if (cotizacionError) {
      console.warn('No se pudo guardar cotización:', cotizacionError.message);
      throw new Error(`No se pudo guardar la cotización: ${cotizacionError.message}`);
    }

    const nuevaCot: Cotizacion = {
      ...data,
      id: cotizacionInsertada.id,
      numero: nuevoNumero,
      fecha: new Date().toISOString().split('T')[0],
    };

    if (cotizacionInsertada && nuevaCot.detalles.length > 0) {
      const detallesPayload = nuevaCot.detalles.map((detalle) => ({
        cotizacion_id: cotizacionInsertada.id,
        producto_id: detalle.producto_id,
        cantidad: detalle.cantidad,
        precio_unitario: detalle.precio_unitario,
        descuento_pct: 0,
        subtotal: detalle.subtotal,
      }));

      const { error: detallesError } = await supabase
        .from('cotizacion_detalles')
        .insert(detallesPayload);

      if (detallesError) {
        console.warn('No se pudieron guardar los detalles:', detallesError.message);
        await supabase.from('cotizaciones').delete().eq('id', cotizacionInsertada.id);
        throw new Error(`No se pudieron guardar los detalles: ${detallesError.message}`);
      }
    }

    setCotizaciones((prev) => [nuevaCot, ...prev]);

    setClientes((prev) => {
      const existe = prev.some((c) => c.num_doc === data.cliente_num_doc);
      if (!existe) {
        const nuevoCliente: Cliente = {
          id: clienteUpserted?.id ?? `cli_${Date.now()}`,
          tipo_doc: data.cliente_tipo_doc,
          num_doc: data.cliente_num_doc,
          razon_social: data.cliente_razon_social,
          direccion: data.cliente_direccion,
          email: data.cliente_email,
          telefono: data.cliente_telefono,
        };
        return [nuevoCliente, ...prev];
      }
      return prev;
    });

    try {
      confetti({ particleCount: 50, spread: 50 });
    } catch {}

    return nuevaCot;
  };

  // Editar y reenviar Cotización
  const editarCotizacion = async (
    id: string,
    data: Pick<Cotizacion, 'tipo_operacion' | 'subtotal' | 'igv' | 'total' | 'detalles'>
  ) => {
    const supabase = createClient();
    const { error: cotizacionError } = await supabase
      .from('cotizaciones')
      .update({
        tipo_operacion: data.tipo_operacion === 'VENTA_ARMADO' ? 'PROYECTO_MESA' : 'PRODUCTO',
        estado: 'BORRADOR',
        subtotal: data.subtotal,
        igv: data.igv,
        total: data.total,
      })
      .eq('id', id);

    if (cotizacionError) {
      console.warn('No se pudo actualizar cotización:', cotizacionError.message);
      return false;
    }

    const { error: deleteDetailsError } = await supabase
      .from('cotizacion_detalles')
      .delete()
      .eq('cotizacion_id', id);

    if (deleteDetailsError) {
      console.warn('No se pudieron actualizar los detalles:', deleteDetailsError.message);
      return false;
    }

    if (data.detalles.length > 0) {
      const { error: insertDetailsError } = await supabase
        .from('cotizacion_detalles')
        .insert(data.detalles.map((detalle) => ({
          cotizacion_id: id,
          producto_id: detalle.producto_id,
          cantidad: detalle.cantidad,
          precio_unitario: detalle.precio_unitario,
          descuento_pct: 0,
          subtotal: detalle.subtotal,
        })));

      if (insertDetailsError) {
        console.warn('No se pudieron guardar los detalles editados:', insertDetailsError.message);
        return false;
      }
    }

    setCotizaciones((prev) => prev.map((cotizacion) => (
      cotizacion.id === id
        ? { ...cotizacion, ...data, estado: 'PENDIENTE' }
        : cotizacion
    )));
    return true;
  };

  // Aprobar Cotización
  const aprobarCotizacion = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('cotizaciones')
      .update({ estado: 'APROBADA' })
      .eq('id', id);

    if (error) {
      console.warn('No se pudo aprobar cotización:', error.message);
      return false;
    }

    setCotizaciones((prev) =>
      prev.map((c) => (c.id === id ? { ...c, estado: 'APROBADA' } : c))
    );
    return true;
  };

  // Generar Órdenes de Compra agrupadas automáticamente por Proveedor
  const generarOrdenesCompraDesdeCotizacion = async (cotizacionId: string) => {
    const supabase = createClient();
    const cotizacion = cotizaciones.find((c) => c.id === cotizacionId);
    if (!cotizacion) return { creadas: 0, ordenes: [], error: 'Cotización no encontrada.' };

    const { data: ordenesExistentes } = await supabase
      .from('ordenes_compra')
      .select('id')
      .eq('cotizacion_origen_id', cotizacionId)
      .limit(1);

    if (ordenesExistentes && ordenesExistentes.length > 0) {
      return { creadas: 0, ordenes: [], error: 'Esta cotización ya tiene órdenes de compra generadas.' };
    }

    const itemsPorProveedor: Record<string, typeof cotizacion.detalles> = {};
    const proveedorRespaldo = proveedores[0];
    cotizacion.detalles.forEach((item) => {
      const provId = item.proveedor_id || proveedorRespaldo?.id;
      if (!provId) return;
      if (!itemsPorProveedor[provId]) {
        itemsPorProveedor[provId] = [];
      }
      itemsPorProveedor[provId].push(item);
    });

    if (Object.keys(itemsPorProveedor).length === 0) {
      return { creadas: 0, ordenes: [], error: 'No hay proveedores disponibles para generar la orden de compra.' };
    }

    const nuevasOrdenes: OrdenCompra[] = [];
    let count = ordenesCompra.length + 1;

    for (const [provId, items] of Object.entries(itemsPorProveedor)) {
      const provInfo = proveedores.find((p) => p.id === provId);
      if (!provInfo) continue;

      const totalCosto = items.reduce((acc, i) => acc + i.cantidad * i.costo_unitario, 0);
      const diasEntrega = provInfo.dias_entrega_estimados || 5;
      const fechaEstimada = new Date(Date.now() + diasEntrega * 86400000).toISOString().split('T')[0];
      const numeroOc = `OC-2026-${count.toString().padStart(3, '0')}`;

      const { data: ordenCompraInsertada, error: ordenCompraError } = await supabase
        .from('ordenes_compra')
        .insert({
          codigo: numeroOc,
          proveedor_id: provId,
          cotizacion_origen_id: cotizacion.id,
          estado: 'PENDIENTE_PAGO',
          moneda: cotizacion.moneda,
          subtotal: totalCosto,
          igv: 0,
          total: totalCosto,
          fecha_envio: new Date().toISOString(),
          fecha_entrega_estimada: new Date(Date.now() + diasEntrega * 86400000).toISOString(),
        })
        .select()
        .single();

      if (ordenCompraError) {
        console.warn('No se pudo guardar la orden de compra:', ordenCompraError.message);
        continue;
      }

      const detallesOrdenCompra = items.map((i) => ({
        orden_compra_id: ordenCompraInsertada.id,
        producto_id: i.producto_id,
        cantidad: i.cantidad,
        costo_unitario: i.costo_unitario,
        destino: 'CLIENTE',
        subtotal: i.cantidad * i.costo_unitario,
      }));

      const { error: detallesError } = await supabase
        .from('orden_compra_detalles')
        .insert(detallesOrdenCompra);

      if (detallesError) {
        console.warn('No se pudieron guardar los detalles de la orden:', detallesError.message);
        await supabase.from('ordenes_compra').delete().eq('id', ordenCompraInsertada.id);
        continue;
      }

      const nuevaOC: OrdenCompra = {
        id: ordenCompraInsertada.id,
        numero: numeroOc,
        proveedor_id: provId,
        proveedor_ruc: provInfo.ruc,
        proveedor_razon_social: provInfo.razon_social,
        proveedor_email: provInfo.email,
        cotizacion_id: cotizacion.id,
        cotizacion_numero: cotizacion.numero,
        fecha: new Date().toISOString().split('T')[0],
        fecha_estimada_entrega: fechaEstimada,
        estado: 'PENDIENTE_PAGO',
        monto_total: totalCosto,
        moneda: cotizacion.moneda,
        detalles: items.map((i) => ({
          id: `oc_det_${Date.now()}_${i.id}`,
          producto_id: i.producto_id,
          producto_codigo: i.producto_codigo,
          producto_nombre: i.producto_nombre,
          cantidad: i.cantidad,
          costo_unitario: i.costo_unitario,
          subtotal: i.cantidad * i.costo_unitario,
        })),
      };

      nuevasOrdenes.push(nuevaOC);
      count++;
    }

    setOrdenesCompra((prev) => [...nuevasOrdenes, ...prev]);

    if (nuevasOrdenes.length === 0) {
      return {
        creadas: 0,
        ordenes: [],
        error: 'No se pudo insertar la orden de compra. Revisa el proveedor, las políticas RLS y las restricciones de Supabase.',
      };
    }

    const { error: updateCotizacionError } = await supabase
      .from('cotizaciones')
      .update({ estado: 'ENVIADA' })
      .eq('id', cotizacionId);

    if (!updateCotizacionError) {
      setCotizaciones((prev) =>
        prev.map((c) => (c.id === cotizacionId ? { ...c, estado: 'EN_COMPRAS' } : c))
      );
    }

    try {
      confetti({ particleCount: 70, spread: 60 });
    } catch {}

    return { creadas: nuevasOrdenes.length, ordenes: nuevasOrdenes };
  };

  // Asignar a Orden de Trabajo de Campo
  const asignarOrdenTrabajo = (
    cotizacionId: string,
    tecnicoId: string,
    tecnicoNombre: string,
    fechaProgramada: string
  ) => {
    const cotizacion = cotizaciones.find((c) => c.id === cotizacionId);
    const otNum = `OT-2026-${(ordenesTrabajo.length + 1).toString().padStart(3, '0')}`;

    const nuevaOT: OrdenTrabajo = {
      id: `ot_${Date.now()}`,
      codigo: otNum,
      cotizacion_id: cotizacionId,
      cotizacion_numero: cotizacion?.numero || 'COT-000',
      cliente_nombre: cotizacion?.cliente_razon_social || 'Cliente Fundo',
      cliente_telefono: cotizacion?.cliente_telefono,
      ubicacion_fundo: cotizacion?.cliente_direccion || 'Valle Agrícola',
      tecnico_id: tecnicoId,
      tecnico_nombre: tecnicoNombre,
      fecha_programada: fechaProgramada,
      estado: 'PENDIENTE',
      observaciones: cotizacion?.observaciones || 'Instalación y armado de mesa de fertilización.',
      bitacora: [],
    };

    setOrdenesTrabajo((prev) => [nuevaOT, ...prev]);

    setCotizaciones((prev) =>
      prev.map((c) =>
        c.id === cotizacionId ? { ...c, estado: 'EN_INSTALACION', orden_trabajo_id: nuevaOT.id } : c
      )
    );

    return nuevaOT;
  };

  // Emitir Factura Electrónica SUNAT
  const emitirFacturaSunatDesdeCotizacion = async (cotizacionId: string, tipo: 'FACTURA' | 'BOLETA') => {
    const cot = cotizaciones.find((c) => c.id === cotizacionId);
    if (!cot) throw new Error('Cotización no encontrada');

    const res = await fetch('/api/sunat/facturacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cotizacion_id: cot.id,
        tipo_comprobante: tipo,
        serie: tipo === 'FACTURA' ? 'F001' : 'B001',
        cliente_num_doc: cot.cliente_num_doc,
        cliente_razon_social: cot.cliente_razon_social,
        cliente_direccion: cot.cliente_direccion,
        subtotal: cot.subtotal,
        igv: cot.igv,
        total: cot.total,
        moneda: cot.moneda,
      }),
    });

    const data = await res.json();
    const cpe: ComprobanteSunat = data.comprobante;

    setComprobantesSunat((prev) => [cpe, ...prev]);

    setCotizaciones((prev) =>
      prev.map((c) =>
        c.id === cotizacionId ? { ...c, estado: 'FACTURADA', comprobante_id: cpe.id } : c
      )
    );

    try {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 } });
    } catch {}

    return cpe;
  };

  // Recepcionar OC y registrar Factura de Proveedor
  const recepcionarOCYFacturaProveedor = (
    ordenCompraId: string,
    numeroFacturaProveedor: string,
    montoTotal: number
  ) => {
    const oc = ordenesCompra.find((o) => o.id === ordenCompraId);
    if (!oc) return;

    // 1. Mark OC as RECIBIDO
    setOrdenesCompra((prev) =>
      prev.map((o) =>
        o.id === ordenCompraId
          ? {
              ...o,
              estado: 'RECIBIDO',
              factura_proveedor_num: numeroFacturaProveedor,
              fecha_recepcion: new Date().toISOString().split('T')[0],
            }
          : o
      )
    );

    // 2. Create Factura de Compra
    const nuevaFC: FacturaCompra = {
      id: `fc_${Date.now()}`,
      proveedor_id: oc.proveedor_id,
      proveedor_nombre: oc.proveedor_razon_social,
      orden_compra_id: oc.id,
      orden_compra_numero: oc.numero,
      numero_factura: numeroFacturaProveedor,
      fecha_emision: new Date().toISOString().split('T')[0],
      monto_total: montoTotal || oc.monto_total,
      moneda: oc.moneda,
      estado_pago: 'PENDIENTE',
    };

    setFacturasCompras((prev) => [nuevaFC, ...prev]);

    // 3. Update stock of products
    setProductos((prev) =>
      prev.map((p) => {
        const itemEnOC = oc.detalles.find((d) => d.producto_id === p.id);
        if (itemEnOC) {
          return { ...p, stock: p.stock + itemEnOC.cantidad };
        }
        return p;
      })
    );
  };

  const actualizarEstadoOC = async (id: string, nuevoEstado: OrdenCompraEstado) => {
    const supabase = createClient();
    const dbStateMap: Record<OrdenCompraEstado, string> = {
      BORRADOR: 'BORRADOR',
      PENDIENTE_PAGO: 'PENDIENTE_PAGO',
      PAGADO: 'PAGADA',
      ENVIADO: 'ENVIADA',
      RECIBIDO: 'RECIBIDA',
    };

    const { error } = await supabase
      .from('ordenes_compra')
      .update({ estado: dbStateMap[nuevoEstado] })
      .eq('id', id);

    if (!error) {
      setOrdenesCompra((prev) =>
        prev.map((o) => (o.id === id ? { ...o, estado: nuevoEstado } : o))
      );
    }
  };

  const registrarPagoOC = async (id: string, voucherFile: File) => {
    const supabase = createClient();
    const fechaPago = new Date().toISOString();
    const fileExtension = voucherFile.name.split('.').pop() || 'bin';
    const filePath = `${id}/${Date.now()}.${fileExtension}`;
    const { error: uploadError } = await supabase.storage
      .from('vouchers')
      .upload(filePath, voucherFile, { upsert: false });

    if (uploadError) {
      console.warn('No se pudo subir el voucher:', uploadError.message);
      return false;
    }

    const { data: publicUrlData } = supabase.storage
      .from('vouchers')
      .getPublicUrl(filePath);
    const voucherUrl = publicUrlData.publicUrl;

    const { error } = await supabase
      .from('ordenes_compra')
      .update({ estado: 'PAGADA', voucher_url: voucherUrl, fecha_pago: fechaPago })
      .eq('id', id);

    if (error) return false;

    setOrdenesCompra((prev) => prev.map((orden) => (
      orden.id === id
        ? { ...orden, estado: 'PAGADO', voucher_url: voucherUrl, fecha_pago: fechaPago.split('T')[0] }
        : orden
    )));
    return true;
  };

  // Técnico de Campo Actions
  const actualizarEstadoOT = async (id: string, nuevoEstado: OrdenTrabajoEstado) => {
    const supabase = createClient();
    const dbState = nuevoEstado === 'FINALIZADO' ? 'COMPLETADA' : nuevoEstado === 'EN_PROCESO' ? 'EN_PROGRESO' : 'CREADA';

    const { error } = await supabase
      .from('ordenes_trabajo')
      .update({ estado: dbState })
      .eq('id', id);

    if (!error) {
      setOrdenesTrabajo((prev) =>
        prev.map((ot) => (ot.id === id ? { ...ot, estado: nuevoEstado } : ot))
      );
    }
  };

  const agregarHitoBitacora = async (
    ordenTrabajoId: string,
    hito: string,
    nota: string,
    fotoUrl?: string,
    materialesExtra?: string
  ) => {
    const supabase = createClient();
    const createdAt = new Date();

    const { error } = await supabase.from('bitacora_tecnica').insert({
      orden_trabajo_id: ordenTrabajoId,
      usuario_id: usuarioActual.id || null,
      etapa: 'IMPLEMENTACION',
      titulo: hito,
      descripcion: nota,
      adjuntos: [
        ...(fotoUrl ? [{ tipo: 'foto', url: fotoUrl }] : []),
        ...(materialesExtra ? [{ tipo: 'texto', valor: materialesExtra }] : []),
      ],
      created_at: createdAt.toISOString(),
    });

    const nuevoHito = {
      id: `bit_${Date.now()}`,
      orden_trabajo_id: ordenTrabajoId,
      hito,
      nota,
      foto_url: fotoUrl,
      materiales_extra: materialesExtra,
      fecha_registro: createdAt.toISOString().split('T')[0],
      hora_registro: new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true }).format(createdAt),
    };

    if (!error) {
      setOrdenesTrabajo((prev) =>
        prev.map((ot) =>
          ot.id === ordenTrabajoId ? { ...ot, estado: 'EN_PROCESO', bitacora: [...ot.bitacora, nuevoHito] } : ot
        )
      );
    }
  };

  const finalizarOTConFirma = async (ordenTrabajoId: string, firmaDataUrl: string, nombreFirmante: string) => {
    const supabase = createClient();
    const finishedAt = new Date();

    const { error } = await supabase
      .from('ordenes_trabajo')
      .update({
        estado: 'COMPLETADA',
        fecha_fin_real: finishedAt.toISOString(),
      })
      .eq('id', ordenTrabajoId);

    if (!error) {
      setOrdenesTrabajo((prev) =>
        prev.map((ot) =>
          ot.id === ordenTrabajoId
            ? {
                ...ot,
                estado: 'FINALIZADO',
                firma_cliente_url: firmaDataUrl,
                firma_cliente_nombre: nombreFirmante,
                fecha_finalizacion: finishedAt.toISOString(),
                informe_pdf_url: `/informes/informe_tecnico_${ot.codigo}.pdf`,
              }
            : ot
        )
      );
    }

    try {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    } catch {}
  };

  // Métricas
  const totalVentasFacturadas = comprobantesSunat
    .filter((c) => c.estado_sunat === 'ACEPTADO')
    .reduce((acc, c) => acc + c.total, 0);

  const cotizacionesPendientesCount = cotizaciones.filter((c) => c.estado === 'PENDIENTE').length;
  const ordenesCompraEnTransito = ordenesCompra.filter((o) => o.estado === 'ENVIADO').length;
  const ordenesTrabajoActivas = ordenesTrabajo.filter((ot) => ot.estado === 'EN_PROCESO').length;
  const totalComprasProveedores = facturasCompras.reduce((acc, fc) => acc + fc.monto_total, 0);

  return (
    <AgroErpContext.Provider
      value={{
        usuarioActual,
        usuarios,
        setUsuarioActual,
        iniciarSesion,
        cerrarSesion,
        cotizaciones,
        ordenesCompra,
        facturasCompras,
        comprobantesSunat,
        ordenesTrabajo,
        productos,
        proveedores,
        clientes,
        crearCotizacion,
        editarCotizacion,
        aprobarCotizacion,
        generarOrdenesCompraDesdeCotizacion,
        asignarOrdenTrabajo,
        emitirFacturaSunatDesdeCotizacion,
        actualizarEstadoOC,
        registrarPagoOC,
        recepcionarOCYFacturaProveedor,
        actualizarEstadoOT,
        agregarHitoBitacora,
        finalizarOTConFirma,
        consultarRucDniSunat,
        metricas: {
          totalVentasFacturadas,
          cotizacionesPendientesCount,
          ordenesCompraEnTransito,
          ordenesTrabajoActivas,
          totalComprasProveedores,
        },
      }}
    >
      {children}
    </AgroErpContext.Provider>
  );
}

export function useAgroErp() {
  const ctx = useContext(AgroErpContext);
  if (!ctx) throw new Error('useAgroErp must be used within an AgroErpProvider');
  return ctx;
}
