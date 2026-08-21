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
import {
  INITIAL_COTIZACIONES,
  INITIAL_ORDENES_COMPRA,
  INITIAL_FACTURAS_COMPRAS,
  INITIAL_COMPROBANTES_SUNAT,
  INITIAL_ORDENES_TRABAJO,
  INITIAL_PRODUCTOS,
  INITIAL_PROVEEDORES,
  INITIAL_CLIENTES,
  INITIAL_USUARIOS,
} from '@/lib/erp-mock-data';
import confetti from 'canvas-confetti';

interface AgroErpContextType {
  usuarioActual: Usuario;
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
  aprobarCotizacion: (id: string) => void;
  generarOrdenesCompraDesdeCotizacion: (cotizacionId: string) => { creadas: number; ordenes: OrdenCompra[] };
  asignarOrdenTrabajo: (cotizacionId: string, tecnicoId: string, tecnicoNombre: string, fechaProgramada: string) => OrdenTrabajo;
  emitirFacturaSunatDesdeCotizacion: (cotizacionId: string, tipo: 'FACTURA' | 'BOLETA') => Promise<ComprobanteSunat>;

  // Compras Actions
  actualizarEstadoOC: (id: string, nuevoEstado: OrdenCompraEstado) => void;
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
  const [usuarioActual, setUsuarioActual] = useState<Usuario>(INITIAL_USUARIOS[0]);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>(INITIAL_COTIZACIONES);
  const [ordenesCompra, setOrdenesCompra] = useState<OrdenCompra[]>(INITIAL_ORDENES_COMPRA);
  const [facturasCompras, setFacturasCompras] = useState<FacturaCompra[]>(INITIAL_FACTURAS_COMPRAS);
  const [comprobantesSunat, setComprobantesSunat] = useState<ComprobanteSunat[]>(INITIAL_COMPROBANTES_SUNAT);
  const [ordenesTrabajo, setOrdenesTrabajo] = useState<OrdenTrabajo[]>(INITIAL_ORDENES_TRABAJO);
  const [productos, setProductos] = useState<Producto[]>(INITIAL_PRODUCTOS);
  const [proveedores, setProveedores] = useState<Proveedor[]>(INITIAL_PROVEEDORES);
  const [clientes, setClientes] = useState<Cliente[]>(INITIAL_CLIENTES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage.
  // Runs post-mount (not a lazy useState initializer) on purpose: localStorage isn't
  // available during SSR, so hydrating here avoids a server/client markup mismatch.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const c = localStorage.getItem('agro_cotizaciones');
      const oc = localStorage.getItem('agro_ordenes_compra');
      const fc = localStorage.getItem('agro_facturas_compras');
      const cpe = localStorage.getItem('agro_comprobantes_sunat');
      const ot = localStorage.getItem('agro_ordenes_trabajo');
      const prod = localStorage.getItem('agro_productos');
      const prov = localStorage.getItem('agro_proveedores');
      const cli = localStorage.getItem('agro_clientes');

      if (c) setCotizaciones(JSON.parse(c));
      if (oc) setOrdenesCompra(JSON.parse(oc));
      if (fc) setFacturasCompras(JSON.parse(fc));
      if (cpe) setComprobantesSunat(JSON.parse(cpe));
      if (ot) setOrdenesTrabajo(JSON.parse(ot));
      if (prod) setProductos(JSON.parse(prod));
      if (prov) setProveedores(JSON.parse(prov));
      if (cli) setClientes(JSON.parse(cli));
    } catch (e) {
      console.error('Error cargando datos locales', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Save to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('agro_cotizaciones', JSON.stringify(cotizaciones));
      localStorage.setItem('agro_ordenes_compra', JSON.stringify(ordenesCompra));
      localStorage.setItem('agro_facturas_compras', JSON.stringify(facturasCompras));
      localStorage.setItem('agro_comprobantes_sunat', JSON.stringify(comprobantesSunat));
      localStorage.setItem('agro_ordenes_trabajo', JSON.stringify(ordenesTrabajo));
      localStorage.setItem('agro_productos', JSON.stringify(productos));
      localStorage.setItem('agro_proveedores', JSON.stringify(proveedores));
      localStorage.setItem('agro_clientes', JSON.stringify(clientes));
    } catch (e) {
      console.error('Error guardando en localStorage', e);
    }
  }, [cotizaciones, ordenesCompra, facturasCompras, comprobantesSunat, ordenesTrabajo, productos, proveedores, clientes, isLoaded]);

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
    const correlativo = (cotizaciones.length + 1).toString().padStart(3, '0');
    const nuevoNumero = `COT-2026-${correlativo}`;
    const nuevaCot: Cotizacion = {
      ...data,
      id: `cot_${Date.now()}`,
      numero: nuevoNumero,
      fecha: new Date().toISOString().split('T')[0],
    };

    setCotizaciones((prev) => [nuevaCot, ...prev]);

    // Add or update client in directory
    setClientes((prev) => {
      const existe = prev.some((c) => c.num_doc === data.cliente_num_doc);
      if (!existe) {
        const nuevoCliente: Cliente = {
          id: `cli_${Date.now()}`,
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

  // Aprobar Cotización
  const aprobarCotizacion = (id: string) => {
    setCotizaciones((prev) =>
      prev.map((c) => (c.id === id ? { ...c, estado: 'APROBADA' } : c))
    );
  };

  // Generar Órdenes de Compra agrupadas automáticamente por Proveedor
  const generarOrdenesCompraDesdeCotizacion = (cotizacionId: string) => {
    const cotizacion = cotizaciones.find((c) => c.id === cotizacionId);
    if (!cotizacion) return { creadas: 0, ordenes: [] };

    // Group details by proveedor_id
    const itemsPorProveedor: Record<string, typeof cotizacion.detalles> = {};
    cotizacion.detalles.forEach((item) => {
      const provId = item.proveedor_id || 'prov_1';
      if (!itemsPorProveedor[provId]) {
        itemsPorProveedor[provId] = [];
      }
      itemsPorProveedor[provId].push(item);
    });

    const nuevasOrdenes: OrdenCompra[] = [];
    let count = ordenesCompra.length + 1;

    Object.entries(itemsPorProveedor).forEach(([provId, items]) => {
      const provInfo = proveedores.find((p) => p.id === provId) || {
        id: provId,
        ruc: '20512345678',
        razon_social: 'PROVEEDOR AGRÍCOLA GENERAL S.A.C.',
        email: 'ventas@proveedor.com',
      };

      const totalCosto = items.reduce((acc, i) => acc + i.cantidad * i.costo_unitario, 0);

      const nuevaOC: OrdenCompra = {
        id: `oc_${Date.now()}_${count}`,
        numero: `OC-2026-${count.toString().padStart(3, '0')}`,
        proveedor_id: provId,
        proveedor_ruc: provInfo.ruc,
        proveedor_razon_social: provInfo.razon_social,
        proveedor_email: provInfo.email,
        cotizacion_id: cotizacion.id,
        cotizacion_numero: cotizacion.numero,
        fecha: new Date().toISOString().split('T')[0],
        estado: 'ENVIADO',
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
    });

    setOrdenesCompra((prev) => [...nuevasOrdenes, ...prev]);

    // Update quote status to EN_COMPRAS
    setCotizaciones((prev) =>
      prev.map((c) => (c.id === cotizacionId ? { ...c, estado: 'EN_COMPRAS' } : c))
    );

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

  const actualizarEstadoOC = (id: string, nuevoEstado: OrdenCompraEstado) => {
    setOrdenesCompra((prev) =>
      prev.map((o) => (o.id === id ? { ...o, estado: nuevoEstado } : o))
    );
  };

  // Técnico de Campo Actions
  const actualizarEstadoOT = (id: string, nuevoEstado: OrdenTrabajoEstado) => {
    setOrdenesTrabajo((prev) =>
      prev.map((ot) => (ot.id === id ? { ...ot, estado: nuevoEstado } : ot))
    );
  };

  const agregarHitoBitacora = (
    ordenTrabajoId: string,
    hito: string,
    nota: string,
    fotoUrl?: string,
    materialesExtra?: string
  ) => {
    const nuevoHito = {
      id: `bit_${Date.now()}`,
      orden_trabajo_id: ordenTrabajoId,
      hito,
      nota,
      foto_url: fotoUrl,
      materiales_extra: materialesExtra,
      fecha_registro: new Date().toISOString().split('T')[0],
      hora_registro: new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date()),
    };

    setOrdenesTrabajo((prev) =>
      prev.map((ot) =>
        ot.id === ordenTrabajoId ? { ...ot, estado: 'EN_PROCESO', bitacora: [...ot.bitacora, nuevoHito] } : ot
      )
    );
  };

  const finalizarOTConFirma = (ordenTrabajoId: string, firmaDataUrl: string, nombreFirmante: string) => {
    setOrdenesTrabajo((prev) =>
      prev.map((ot) =>
        ot.id === ordenTrabajoId
          ? {
              ...ot,
              estado: 'FINALIZADO',
              firma_cliente_url: firmaDataUrl,
              firma_cliente_nombre: nombreFirmante,
              fecha_finalizacion: new Date().toISOString(),
              informe_pdf_url: `/informes/informe_tecnico_${ot.codigo}.pdf`,
            }
          : ot
      )
    );

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
        cotizaciones,
        ordenesCompra,
        facturasCompras,
        comprobantesSunat,
        ordenesTrabajo,
        productos,
        proveedores,
        clientes,
        crearCotizacion,
        aprobarCotizacion,
        generarOrdenesCompraDesdeCotizacion,
        asignarOrdenTrabajo,
        emitirFacturaSunatDesdeCotizacion,
        actualizarEstadoOC,
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
