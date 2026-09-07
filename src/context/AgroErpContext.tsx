'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Cotizacion,
  CotizacionDetalle,
  OrdenCompra,
  FacturaCompra,
  ComprobanteSunat,
  OrdenTrabajo,
  Producto,
  Proveedor,
  Cliente,
  Usuario,
  OrdenCompraEstado,
  OrdenTrabajoEstado,
  ConsultaSunatResult,
  TipoDocumento,
  ComprobanteSunatTipo,
} from '@/types/erp';
import confetti from 'canvas-confetti';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';

type Tables = Database['public']['Tables'];
type UsuarioRow = Tables['usuarios']['Row'];
type ClienteRow = Tables['clientes']['Row'];
type ProveedorRow = Tables['proveedores']['Row'];
type ProductoRow = Tables['productos']['Row'];
type CotizacionRow = Tables['cotizaciones']['Row'];
type CotizacionDetalleRow = Tables['cotizacion_detalles']['Row'];
type OrdenCompraRow = Tables['ordenes_compra']['Row'];
type OrdenCompraDetalleRow = Tables['orden_compra_detalles']['Row'];
type FacturaCompraRow = Tables['facturas_compras']['Row'];
type ComprobanteSunatRow = Tables['comprobantes_sunat']['Row'];
type OrdenTrabajoRow = Tables['ordenes_trabajo']['Row'];
type BitacoraTecnicaRow = Tables['bitacora_tecnica']['Row'];

interface AgroErpContextType {
  usuarioActual: Usuario;
  usuarios: Usuario[];
  catalogosCargando: boolean;
  catalogosError: string | null;
  authResuelto: boolean;
  authUserId: string | null;
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
  asignarOrdenTrabajo: (cotizacionId: string, tecnicoId: string, tecnicoNombre: string, fechaProgramada: string) => Promise<OrdenTrabajo>;
  emitirFacturaSunatDesdeCotizacion: (cotizacionId: string, tipo: ComprobanteSunatTipo) => Promise<ComprobanteSunat>;

  // Compras Actions
  actualizarEstadoOC: (id: string, nuevoEstado: OrdenCompraEstado) => void;
  registrarPagoOC: (id: string, voucherFile: File) => Promise<boolean>;
  recepcionarOCYFacturaProveedor: (
    ordenCompraId: string,
    entregaCompleta: boolean,
    numeroFacturaProveedor?: string,
    montoTotal?: number
  ) => Promise<void>;

  // Técnico de Campo Actions
  actualizarEstadoOT: (id: string, nuevoEstado: OrdenTrabajoEstado) => void;
  agregarHitoBitacora: (
    ordenTrabajoId: string,
    hito: string,
    nota: string,
    fotoFile?: File,
    materialesExtra?: string,
    ubicacion?: { lat: number; lng: number }
  ) => Promise<void>;
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
    rol: 'TECNICO',
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
  const [catalogosCargando, setCatalogosCargando] = useState(true);
  const [catalogosError, setCatalogosError] = useState<string | null>(null);

  // Se resuelve primero: la carga de catálogos depende de esto y no debe
  // ejecutarse con una sesión todavía sin confirmar (si no, las consultas a
  // tablas con RLS salen sin autenticación y devuelven listas vacías que
  // luego nunca se vuelven a pedir).
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authResuelto, setAuthResuelto] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let resuelto = false;

    // authResuelto solo necesita pasar a true UNA vez (para dejar de bloquear
    // la carga de catálogos); authUserId en cambio debe actualizarse cada vez
    // que cambie la sesión real (login/logout posteriores).
    function marcarResueltoUnaVez(origen: string) {
      if (resuelto) return;
      resuelto = true;
      console.log(`[AgroErp] sesión resuelta vía ${origen}`);
      setAuthResuelto(true);
    }

    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (error) console.warn('[AgroErp] getUser() devolvió error:', error.message);
        console.log('[AgroErp] getUser() ->', data.user?.id ?? 'sin sesión');
        setAuthUserId(data.user?.id ?? null);
        marcarResueltoUnaVez('getUser');
      })
      .catch((err) => {
        // Si la promesa de getUser() se rechaza (token inválido, red caída, etc.)
        // igual hay que liberar el estado de carga en vez de dejarlo colgado.
        console.error('[AgroErp] getUser() rechazada:', err);
        setAuthUserId(null);
        marcarResueltoUnaVez('getUser-catch');
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AgroErp] onAuthStateChange:', event, session?.user?.id ?? 'sin sesión');
      setAuthUserId(session?.user?.id ?? null);
      marcarResueltoUnaVez('onAuthStateChange');
    });

    // Red de seguridad: si por cualquier motivo nada de lo anterior dispara,
    // no dejar la interfaz cargando para siempre.
    const timeoutId = setTimeout(() => {
      if (!resuelto) console.warn('[AgroErp] la sesión no se resolvió a tiempo; se libera el loader igual');
      marcarResueltoUnaVez('timeout-seguridad');
    }, 8000);

    return () => {
      subscription.subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    // Espera a que la sesión esté confirmada antes de consultar. Si no hay
    // usuario autenticado, no hay nada que cargar.
    if (!authResuelto) return;
    if (!authUserId) {
      const timer = setTimeout(() => setCatalogosCargando(false), 0);
      return () => clearTimeout(timer);
    }

    let cancelado = false;
    const supabase = createClient();

    const loadCatalogos = async () => {
      console.log('[AgroErp] loadCatalogos: inicio, usuario =', authUserId);
      setCatalogosCargando(true);
      setCatalogosError(null);
      try {
        const nombresTablas = [
          'usuarios', 'clientes', 'proveedores', 'productos', 'cotizaciones',
          'cotizacion_detalles', 'ordenes_compra', 'orden_compra_detalles',
          'facturas_compras', 'comprobantes_sunat', 'ordenes_trabajo', 'bitacora_tecnica',
        ];
        // Si la red se cuelga sin resolver ni rechazar, esta carrera evita que
        // la interfaz quede cargando para siempre: a los 20s se fuerza un error.
        const resultados = await Promise.race([
          Promise.all([
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
          ]),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Tiempo de espera agotado consultando Supabase (20s).')), 20000)
          ),
        ]);

        const erroresQuery = resultados
          .map((r, i) => (r.error ? `${nombresTablas[i]}: ${r.error.message}` : null))
          .filter((msg): msg is string => Boolean(msg));

        if (erroresQuery.length > 0) {
          console.error('Errores al cargar catálogos desde Supabase:', erroresQuery);
          setCatalogosError(`No se pudieron cargar algunos datos: ${erroresQuery.join('; ')}`);
        }

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
        ] = resultados;

        const usuariosNormalizados = (usuariosData ?? []).map((u: UsuarioRow) => ({
          id: u.id,
          nombre: u.nombre,
          email: u.email,
          rol: (u.rol as Usuario['rol']) ?? 'ADMIN',
          telefono: u.telefono ?? undefined,
          avatarUrl: u.avatar_url ?? undefined,
        }));

        const clientesNormalizados: Cliente[] = (clientesData ?? []).map((c: ClienteRow) => ({
          id: c.id,
          tipo_doc: c.tipo_doc as TipoDocumento,
          num_doc: c.num_doc,
          razon_social: c.razon_social,
          direccion: c.direccion,
          email: c.email,
          telefono: c.telefono ?? undefined,
          estado_contribuyente: c.estado_contribuyente ?? undefined,
          condicion: c.condicion ?? undefined,
          departamento: c.departamento ?? undefined,
          provincia: c.provincia ?? undefined,
          distrito: c.distrito ?? undefined,
        }));

        const proveedoresNormalizados: Proveedor[] = (proveedoresData ?? []).map((p: ProveedorRow) => ({
          id: p.id,
          ruc: p.ruc ?? undefined,
          razon_social: p.razon_social,
          email: p.email ?? undefined,
          telefono: p.telefono ?? '',
          contacto: p.contacto ?? '',
          direccion: p.direccion ?? '',
          departamento: p.departamento ?? undefined,
          provincia: p.provincia ?? undefined,
          dias_entrega_estimados: p.dias_entrega_estimados ?? undefined,
          costo_flete_base: p.costo_flete_base ?? undefined,
        }));

        // Nota: la tabla `productos` no tiene columna proveedor_id (el proveedor real
        // de cada ítem se define por oferta ganadora en cotizaciones_proveedor).
        const productosNormalizados: Producto[] = (productosData ?? []).map((p: ProductoRow) => ({
          id: p.id,
          sku: p.sku ?? '',
          nombre: p.nombre,
          descripcion: p.descripcion ?? '',
          categoria: (p.categoria ?? 'OTRO') as Producto['categoria'],
          ultimo_precio_venta: Number(p.ultimo_precio_venta ?? 0),
          ultimo_costo_compra: Number(p.ultimo_costo_compra ?? p.costo_promedio ?? 0),
          costo_promedio: Number(p.costo_promedio ?? p.ultimo_costo_compra ?? 0),
          proveedor_id: '',
          proveedor_nombre: '',
          stock_actual: Number(p.stock_actual ?? 0),
          stock_reservado: Number(p.stock_reservado ?? 0),
          stock_minimo: Number(p.stock_minimo ?? 0),
          unidad_medida: p.unidad_medida ?? 'UNIDAD',
        }));

        const clientesMap = new Map((clientesNormalizados ?? []).map((c) => [c.id, c]));
        const productosMap = new Map((productosNormalizados ?? []).map((p) => [p.id, p]));
        const proveedoresMap = new Map((proveedoresNormalizados ?? []).map((p) => [p.id, p]));

        const cotizacionesNormalizadas = (cotizacionesData ?? []).map((c: CotizacionRow) => {
          const cliente = clientesMap.get(c.cliente_id ?? '') ?? {
            tipo_doc: 'RUC' as const,
            num_doc: '',
            razon_social: '',
            direccion: '',
            email: '',
            telefono: '',
          };

          const detalles = (cotizacionDetallesData ?? [])
            .filter((d: CotizacionDetalleRow) => d.cotizacion_id === c.id)
            .map((d: CotizacionDetalleRow) => {
              const producto = productosMap.get(d.producto_id);

              const subtotal = Number(d.subtotal ?? ((Number(d.precio_unitario ?? 0) * Number(d.cantidad ?? 0))));

              return {
                id: d.id,
                cotizacion_id: c.id,
                producto_id: d.producto_id,
                producto_sku: producto?.sku ?? '',
                producto_nombre: producto?.nombre ?? '',
                proveedor_id: producto?.proveedor_id ?? '',
                cantidad: Number(d.cantidad ?? 0),
                precio_unitario: Number(d.precio_unitario ?? 0),
                costo_unitario: Number(d.costo_unitario_proveedor ?? producto?.ultimo_costo_compra ?? 0),
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
            observaciones: '',
            incluye_mano_obra: false,
            costo_mano_obra: 0,
            orden_trabajo_id: undefined,
            comprobante_id: undefined,
            fecha: c.fecha_emision ? c.fecha_emision.split('T')[0] : new Date().toISOString().split('T')[0],
            detalles,
          } as Cotizacion;
        });

        const ordenesCompraNormalizadas = (ordenesCompraData ?? []).map((oc: OrdenCompraRow) => {
          const proveedor = proveedoresMap.get(oc.proveedor_id) ?? {
            ruc: '',
            razon_social: '',
            email: '',
          };

          const detalles = (ordenCompraDetallesData ?? [])
            .filter((d: OrdenCompraDetalleRow) => d.orden_compra_id === oc.id)
            .map((d: OrdenCompraDetalleRow) => {
              const producto = productosMap.get(d.producto_id);
              return {
                id: d.id,
                producto_id: d.producto_id,
                producto_sku: producto?.sku ?? '',
                producto_nombre: producto?.nombre ?? '',
                cantidad: Number(d.cantidad ?? 0),
                costo_unitario: Number(d.costo_unitario ?? 0),
                subtotal: Number(d.subtotal ?? 0),
              };
            });

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
              : oc.estado === 'PARCIAL'
                ? 'PARCIAL'
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

        const ordenesCompraMap = new Map(ordenesCompraNormalizadas.map((oc) => [oc.id, oc]));

        const facturasComprasNormalizadas = (facturasComprasData ?? []).map((fc: FacturaCompraRow) => ({
          id: fc.id,
          proveedor_id: fc.proveedor_id,
          proveedor_nombre: proveedoresMap.get(fc.proveedor_id)?.razon_social ?? '',
          orden_compra_id: fc.orden_compra_id ?? undefined,
          orden_compra_numero: ordenesCompraMap.get(fc.orden_compra_id ?? '')?.numero ?? '',
          numero_factura: `${fc.serie ?? 'F001'}-${fc.numero ?? ''}`,
          fecha_emision: fc.fecha_emision ? fc.fecha_emision.split('T')[0] : new Date().toISOString().split('T')[0],
          monto_total: Number(fc.total ?? 0),
          moneda: fc.moneda ?? 'PEN',
          estado_pago: fc.estado_conciliacion === 'CONCILIADA' ? 'PAGADO' : 'PENDIENTE',
        } as FacturaCompra));

        const comprobantesSunatNormalizados = (comprobantesSunatData ?? []).map((c: ComprobanteSunatRow) => {
          const cliente = clientesMap.get(c.cliente_id) ?? {
            tipo_doc: 'RUC' as const,
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
            estado_sunat: c.estado_sunat === 'ACEPTADO' ? 'ACEPTADO' : c.estado_sunat === 'RECHAZADO' ? 'RECHAZADO' : 'ENVIADO',
            fecha_emision: c.created_at ? c.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          } as ComprobanteSunat;
        });

        const bitacoraPorOrden = new Map<string, ReturnType<typeof normalizarHito>[]>();
        function normalizarHito(b: BitacoraTecnicaRow) {
          const adjuntos = Array.isArray(b.adjuntos)
            ? (b.adjuntos as Array<{ tipo: string; url?: string; valor?: string; lat?: number; lng?: number }>)
            : [];
          const ubicacionAdjunto = adjuntos.find((x) => x.tipo === 'ubicacion');
          return {
            id: b.id,
            orden_trabajo_id: b.orden_trabajo_id,
            hito: b.titulo,
            nota: b.descripcion ?? undefined,
            foto_url: adjuntos.find((x) => x.tipo === 'foto')?.url,
            materiales_extra: adjuntos.find((x) => x.tipo === 'texto' && x.valor)?.valor,
            ubicacion:
              typeof ubicacionAdjunto?.lat === 'number' && typeof ubicacionAdjunto?.lng === 'number'
                ? { lat: ubicacionAdjunto.lat, lng: ubicacionAdjunto.lng }
                : undefined,
            fecha_registro: b.created_at ? b.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            hora_registro: b.created_at ? new Date(b.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true }) : '',
          };
        }
        (bitacoraData ?? []).forEach((b: BitacoraTecnicaRow) => {
          const key = b.orden_trabajo_id;
          if (!bitacoraPorOrden.has(key)) bitacoraPorOrden.set(key, []);
          bitacoraPorOrden.get(key)?.push(normalizarHito(b));
        });

        const ordenesTrabajoNormalizadas = (ordenesTrabajoData ?? []).map((ot: OrdenTrabajoRow) => {
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

        if (cancelado) return;

        setUsuarios(usuariosNormalizados);
        setClientes(clientesNormalizados);
        setProveedores(proveedoresNormalizados);
        setProductos(productosNormalizados);
        setCotizaciones(cotizacionesNormalizadas);
        setOrdenesCompra(ordenesCompraNormalizadas);
        setFacturasCompras(facturasComprasNormalizadas);
        setComprobantesSunat(comprobantesSunatNormalizados);
        setOrdenesTrabajo(ordenesTrabajoNormalizadas);
        console.log('[AgroErp] loadCatalogos: éxito', {
          usuarios: usuariosNormalizados.length,
          ordenesTrabajo: ordenesTrabajoNormalizadas.length,
        });
      } catch (error) {
        if (cancelado) return;
        console.error('[AgroErp] loadCatalogos: error', error);
        setCatalogosError(error instanceof Error ? error.message : 'Error al cargar los datos del sistema.');
      } finally {
        if (!cancelado) setCatalogosCargando(false);
      }
    };

    loadCatalogos();

    return () => {
      cancelado = true;
    };
  }, [authUserId, authResuelto]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authUserId) {
        setUsuarioActual({ id: '', nombre: '', email: '', rol: 'TECNICO' });
        return;
      }
      const usuarioAutenticado = usuarios.find((u) => u.id === authUserId);
      if (usuarioAutenticado) {
        setUsuarioActual(usuarioAutenticado);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [authUserId, usuarios]);

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
      rol: 'TECNICO',
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
      tipo_doc: data.cliente_tipo_doc || 'RUC',
      num_doc: data.cliente_num_doc || '',
      razon_social: data.cliente_razon_social || '',
      direccion: data.cliente_direccion || '',
      email: data.cliente_email || '',
      telefono: data.cliente_telefono || '',
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

    const detallesList = nuevaCot.detalles || [];
    if (cotizacionInsertada && detallesList.length > 0) {
      const detallesPayload = detallesList.map((detalle) => ({
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
          tipo_doc: data.cliente_tipo_doc || 'RUC',
          num_doc: data.cliente_num_doc || '',
          razon_social: data.cliente_razon_social || '',
          direccion: data.cliente_direccion || '',
          email: data.cliente_email || '',
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

    const detallesList = data.detalles || [];
    if (detallesList.length > 0) {
      const { error: insertDetailsError } = await supabase
        .from('cotizacion_detalles')
        .insert(detallesList.map((detalle) => ({
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

    const itemsPorProveedor: Record<string, CotizacionDetalle[]> = {};
    const proveedorRespaldo = proveedores[0];
    (cotizacion.detalles || []).forEach((item) => {
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

      const totalCosto = items.reduce((acc, i) => acc + i.cantidad * (i.costo_unitario || 0), 0);
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
        costo_unitario: i.costo_unitario || 0,
        destino: 'CLIENTE',
        subtotal: i.cantidad * (i.costo_unitario || 0),
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
          producto_sku: i.producto_sku,
          producto_nombre: i.producto_nombre,
          cantidad: i.cantidad,
          costo_unitario: i.costo_unitario || 0,
          subtotal: i.cantidad * (i.costo_unitario || 0),
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
  const asignarOrdenTrabajo = async (
    cotizacionId: string,
    tecnicoId: string,
    tecnicoNombre: string,
    fechaProgramada: string
  ) => {
    const cotizacion = cotizaciones.find((c) => c.id === cotizacionId);
    if (!cotizacion?.cliente_id) {
      throw new Error('La cotización no tiene un cliente válido para crear la orden de trabajo.');
    }

    const supabase = createClient();
    const otNum = `OT-2026-${(ordenesTrabajo.length + 1).toString().padStart(3, '0')}`;
    const descripcion = cotizacion.observaciones || 'Instalación y armado de mesa de fertilización.';

    const { data: otInsertada, error } = await supabase
      .from('ordenes_trabajo')
      .insert({
        codigo: otNum,
        cliente_id: cotizacion.cliente_id,
        cotizacion_origen_id: cotizacionId,
        nombre_proyecto: `Instalación ${cotizacion.numero} - ${cotizacion.cliente_razon_social}`,
        descripcion,
        tecnico_asignado: tecnicoId,
        estado: 'CREADA',
        fecha_fin_estimada: new Date(fechaProgramada).toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('No se pudo crear la orden de trabajo:', error.message);
      throw new Error(`No se pudo asignar la orden de trabajo: ${error.message}`);
    }

    const nuevaOT: OrdenTrabajo = {
      id: otInsertada.id,
      codigo: otNum,
      cliente_id: cotizacion.cliente_id,
      cotizacion_id: cotizacionId,
      cotizacion_numero: cotizacion.numero,
      cliente_nombre: cotizacion.cliente_razon_social || 'Cliente Fundo',
      cliente_telefono: cotizacion.cliente_telefono,
      ubicacion_fundo: cotizacion.cliente_direccion || 'Valle Agrícola',
      tecnico_id: tecnicoId,
      tecnico_nombre: tecnicoNombre,
      fecha_programada: fechaProgramada,
      estado: 'PENDIENTE',
      observaciones: descripcion,
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

  // Emitir Comprobante Electrónico SUNAT (Factura/Boleta) o Guía de Remisión al cliente
  const emitirFacturaSunatDesdeCotizacion = async (cotizacionId: string, tipo: ComprobanteSunatTipo) => {
    const cot = cotizaciones.find((c) => c.id === cotizacionId);
    if (!cot) throw new Error('Cotización no encontrada');

    const serie = tipo === 'FACTURA' ? 'F001' : tipo === 'BOLETA' ? 'B001' : 'T001';
    // La Guía de Remisión es un documento de traslado, no un comprobante de pago:
    // no lleva IGV ni afecta el total facturado.
    const esGuia = tipo === 'GUIA_REMISION';

    const res = await fetch('/api/sunat/facturacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cotizacion_id: cot.id,
        tipo_comprobante: tipo,
        serie,
        cliente_num_doc: cot.cliente_num_doc,
        cliente_razon_social: cot.cliente_razon_social,
        cliente_direccion: cot.cliente_direccion,
        subtotal: esGuia ? 0 : cot.subtotal,
        igv: esGuia ? 0 : cot.igv,
        total: esGuia ? 0 : cot.total,
        moneda: cot.moneda,
      }),
    });

    const data = await res.json();
    const cpe: ComprobanteSunat = data.comprobante;

    setComprobantesSunat((prev) => [cpe, ...prev]);

    setCotizaciones((prev) =>
      prev.map((c) =>
        c.id === cotizacionId
          ? { ...c, estado: esGuia ? c.estado : 'FACTURADA', comprobante_id: cpe.id }
          : c
      )
    );

    try {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 } });
    } catch {}

    return cpe;
  };

  // Recepcionar OC (recojo de materiales): si la entrega llegó completa, el proveedor
  // entrega guía + factura y se cierra la OC y se actualiza el stock; si es parcial,
  // solo llega la guía (la factura y el ingreso a stock quedan pendientes hasta que
  // se reciba el resto y se vuelva a confirmar como entrega completa).
  const recepcionarOCYFacturaProveedor = async (
    ordenCompraId: string,
    entregaCompleta: boolean,
    numeroFacturaProveedor?: string,
    montoTotal?: number
  ) => {
    const oc = ordenesCompra.find((o) => o.id === ordenCompraId);
    if (!oc) return;

    const supabase = createClient();
    const nuevoEstado: OrdenCompraEstado = entregaCompleta ? 'RECIBIDO' : 'PARCIAL';
    const dbEstado = entregaCompleta ? 'RECIBIDA' : 'PARCIAL';

    const { error: ocError } = await supabase
      .from('ordenes_compra')
      .update({ estado: dbEstado })
      .eq('id', ordenCompraId);

    if (ocError) {
      console.warn('No se pudo actualizar la orden de compra:', ocError.message);
      return;
    }

    let nuevaFC: FacturaCompra | undefined;

    if (entregaCompleta) {
      const monto = montoTotal || oc.monto_total;
      const subtotal = monto / 1.18;

      const { data: fcInsertada, error: fcError } = await supabase
        .from('facturas_compras')
        .insert({
          orden_compra_id: oc.id,
          proveedor_id: oc.proveedor_id,
          serie: (numeroFacturaProveedor || 'F001-0000000').split('-')[0] || 'F001',
          numero: (numeroFacturaProveedor || 'F001-0000000').split('-')[1] || numeroFacturaProveedor || '0000000',
          tipo_comprobante: 'GUIA_Y_FACTURA',
          fecha_emision: new Date().toISOString(),
          subtotal,
          igv: monto - subtotal,
          total: monto,
          moneda: oc.moneda,
          estado_conciliacion: 'PENDIENTE',
        })
        .select()
        .single();

      if (fcError) {
        console.warn('No se pudo registrar la factura del proveedor:', fcError.message);
      } else {
        nuevaFC = {
          id: fcInsertada.id,
          proveedor_id: oc.proveedor_id,
          proveedor_nombre: oc.proveedor_razon_social,
          orden_compra_id: oc.id,
          orden_compra_numero: oc.numero,
          numero_factura: numeroFacturaProveedor,
          tipo_comprobante: 'GUIA_Y_FACTURA',
          fecha_emision: new Date().toISOString().split('T')[0],
          monto_total: monto,
          moneda: oc.moneda,
          estado_pago: 'PENDIENTE',
        };
      }

      // Actualizar stock en BD y en memoria solo cuando la entrega está completa.
      for (const item of oc.detalles || []) {
        const producto = productos.find((p) => p.id === item.producto_id);
        if (!producto) continue;
        await supabase
          .from('productos')
          .update({ stock_actual: (producto.stock_actual ?? 0) + item.cantidad })
          .eq('id', item.producto_id);
      }

      setProductos((prev) =>
        prev.map((p) => {
          const itemEnOC = (oc.detalles || []).find((d) => d.producto_id === p.id);
          if (itemEnOC) {
            return { ...p, stock_actual: (p.stock_actual ?? 0) + itemEnOC.cantidad };
          }
          return p;
        })
      );
    }

    setOrdenesCompra((prev) =>
      prev.map((o) =>
        o.id === ordenCompraId
          ? {
              ...o,
              estado: nuevoEstado,
              factura_proveedor_num: entregaCompleta ? numeroFacturaProveedor : o.factura_proveedor_num,
              fecha_recepcion: entregaCompleta ? new Date().toISOString().split('T')[0] : o.fecha_recepcion,
            }
          : o
      )
    );

    if (nuevaFC) {
      setFacturasCompras((prev) => [nuevaFC, ...prev]);
    }
  };

  const actualizarEstadoOC = async (id: string, nuevoEstado: OrdenCompraEstado) => {
    const supabase = createClient();
    const dbStateMap: Partial<Record<OrdenCompraEstado, string>> = {
      BORRADOR: 'BORRADOR',
      PENDIENTE_PAGO: 'PENDIENTE_PAGO',
      PAGADO: 'PAGADA',
      PAGADA: 'PAGADA',
      ENVIADO: 'ENVIADA',
      ENVIADA: 'ENVIADA',
      RECIBIDO: 'RECIBIDA',
      RECIBIDA: 'RECIBIDA',
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
    fotoFile?: File,
    materialesExtra?: string,
    ubicacion?: { lat: number; lng: number }
  ) => {
    const supabase = createClient();
    const createdAt = new Date();

    let fotoUrl: string | undefined;
    if (fotoFile) {
      const fileExtension = fotoFile.name.split('.').pop() || 'jpg';
      const filePath = `bitacora/${ordenTrabajoId}/${Date.now()}.${fileExtension}`;
      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, fotoFile, { upsert: false });

      if (uploadError) {
        console.warn('No se pudo subir la foto del hito:', uploadError.message);
      } else {
        const { data: publicUrlData } = supabase.storage.from('documentos').getPublicUrl(filePath);
        fotoUrl = publicUrlData.publicUrl;
      }
    }

    const { error } = await supabase.from('bitacora_tecnica').insert({
      orden_trabajo_id: ordenTrabajoId,
      usuario_id: usuarioActual.id || null,
      etapa: 'IMPLEMENTACION',
      titulo: hito,
      descripcion: nota,
      adjuntos: [
        ...(fotoUrl ? [{ tipo: 'foto', url: fotoUrl }] : []),
        ...(materialesExtra ? [{ tipo: 'texto', valor: materialesExtra }] : []),
        ...(ubicacion ? [{ tipo: 'ubicacion', lat: ubicacion.lat, lng: ubicacion.lng }] : []),
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
      ubicacion,
      fecha_registro: createdAt.toISOString().split('T')[0],
      hora_registro: new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true }).format(createdAt),
    };

    if (!error) {
      setOrdenesTrabajo((prev) =>
        prev.map((ot) =>
          ot.id === ordenTrabajoId ? { ...ot, estado: 'EN_PROCESO', bitacora: [...(ot.bitacora || []), nuevoHito] } : ot
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
  const ordenesCompraEnTransito = ordenesCompra.filter((o) => o.estado === 'ENVIADO' || o.estado === 'ENVIADA').length;
  const ordenesTrabajoActivas = ordenesTrabajo.filter((ot) => ot.estado === 'EN_PROCESO' || ot.estado === 'EN_PROGRESO').length;
  const totalComprasProveedores = facturasCompras.reduce((acc, fc) => acc + (fc.monto_total || 0), 0);

  return (
    <AgroErpContext.Provider
      value={{
        usuarioActual,
        usuarios,
        catalogosCargando,
        catalogosError,
        authResuelto,
        authUserId,
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
