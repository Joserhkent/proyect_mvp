import jsPDF from 'jspdf';

// Generadores de documentos desacoplados del modelo de datos: cada función
// recibe exactamente la información de display que necesita (ya resuelta por
// el llamador vía joins de Supabase), en vez de depender de un tipo de fila
// concreto — así sirven tanto a datos reales como a fixtures de prueba.

const EMISOR_NOMBRE = 'AGROFERTIL PERÚ S.A.C.';
const EMISOR_LINEA2 = 'RUC: 20601234567 · Panamericana Sur Km 140, Cañete, Lima';

export interface ClienteInfoPDF {
  razon_social: string;
  tipo_doc: string;
  num_doc: string;
  direccion: string;
  email?: string;
}

export interface LineaPDF {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  unidad_medida?: string;
}

function money(n: number, moneda = 'PEN') {
  const symbol = moneda === 'USD' ? '$' : 'S/';
  return `${symbol} ${n.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
}

function encabezado(doc: jsPDF, tituloDerecha: string, codigo: string, fecha: string, marginX: number, rightX: number) {
  let y = 56;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(6, 95, 70);
  doc.text(EMISOR_NOMBRE, marginX, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  y += 16;
  doc.text(EMISOR_LINEA2, marginX, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(6, 95, 70);
  doc.text(tituloDerecha, rightX, 56, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(codigo, rightX, 70, { align: 'right' });
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha: ${fecha}`, rightX, 82, { align: 'right' });

  y += 28;
  doc.setDrawColor(220, 220, 220);
  doc.line(marginX, y, rightX, y);
  return y + 22;
}

function bloqueCliente(doc: jsPDF, cliente: ClienteInfoPDF, marginX: number, yInicial: number): number {
  let y = yInicial;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Cliente:', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${cliente.razon_social}  (${cliente.tipo_doc}: ${cliente.num_doc})`, marginX + 48, y);
  y += 15;
  doc.setFont('helvetica', 'bold');
  doc.text('Dirección:', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(cliente.direccion, marginX + 55, y);
  if (cliente.email) {
    y += 15;
    doc.setFont('helvetica', 'bold');
    doc.text('Email:', marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(cliente.email, marginX + 40, y);
  }
  return y + 28;
}

function tablaLineas(doc: jsPDF, detalles: LineaPDF[], marginX: number, rightX: number, yInicial: number, moneda: string): number {
  let y = yInicial;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFillColor(6, 95, 70);
  doc.rect(marginX, y - 12, rightX - marginX, 20, 'F');
  doc.text('Ítem / Descripción', marginX + 6, y + 2);
  doc.text('Cant.', 380, y + 2);
  doc.text('P. Unit', 440, y + 2);
  doc.text('Total', rightX - 6, y + 2, { align: 'right' });
  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  detalles.forEach((d, i) => {
    if (y > 740) {
      doc.addPage();
      y = 56;
    }
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, y - 11, rightX - marginX, 18, 'F');
    }
    const nombreLines = doc.splitTextToSize(d.nombre, 300);
    doc.text(nombreLines[0], marginX + 6, y + 2);
    doc.text(String(d.cantidad), 380, y + 2);
    doc.text(money(d.precio_unitario, moneda), 440, y + 2);
    doc.text(money(d.subtotal, moneda), rightX - 6, y + 2, { align: 'right' });
    y += 18;
  });
  return y;
}

function bloqueTotales(doc: jsPDF, subtotal: number, igv: number, total: number, moneda: string, rightX: number, yInicial: number) {
  let y = yInicial + 16;
  doc.setDrawColor(220, 220, 220);
  doc.line(350, y, rightX, y);
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal Gravado:', 350, y);
  doc.text(money(subtotal, moneda), rightX, y, { align: 'right' });
  y += 15;
  doc.text('I.G.V. (18%):', 350, y);
  doc.text(money(igv, moneda), rightX, y, { align: 'right' });
  y += 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(6, 95, 70);
  doc.text('TOTAL:', 350, y);
  doc.text(money(total, moneda), rightX, y, { align: 'right' });
  return y;
}

export function downloadTextFile(filename: string, content: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Cotización (para el cliente)
// ---------------------------------------------------------------------------

export interface CotizacionPDFInput {
  codigo: string;
  fecha: string;
  moneda: string;
  cliente: ClienteInfoPDF;
  detalles: LineaPDF[];
  subtotal: number;
  igv: number;
  total: number;
}

export function generarCotizacionPDF(input: CotizacionPDFInput) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  const rightX = 547;

  let y = encabezado(doc, 'COTIZACIÓN OFICIAL', input.codigo, input.fecha, marginX, rightX);
  y = bloqueCliente(doc, input.cliente, marginX, y);
  y = tablaLineas(doc, input.detalles, marginX, rightX, y, input.moneda);
  bloqueTotales(doc, input.subtotal, input.igv, input.total, input.moneda, rightX, y);

  doc.save(`${input.codigo}.pdf`);
}

// ---------------------------------------------------------------------------
// Orden de Compra (para el proveedor)
// ---------------------------------------------------------------------------

export interface OrdenCompraPDFInput {
  codigo: string;
  fecha: string;
  moneda: string;
  proveedor: { razon_social: string; ruc: string; email?: string };
  detalles: LineaPDF[];
  subtotal: number;
  igv: number;
  total: number;
}

export function generarOrdenCompraPDF(input: OrdenCompraPDFInput) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  const rightX = 547;

  let y = encabezado(doc, 'ORDEN DE COMPRA', input.codigo, input.fecha, marginX, rightX);
  y = bloqueCliente(
    doc,
    { razon_social: input.proveedor.razon_social, tipo_doc: 'RUC', num_doc: input.proveedor.ruc, direccion: '', email: input.proveedor.email },
    marginX,
    y
  );
  y = tablaLineas(doc, input.detalles, marginX, rightX, y, input.moneda);
  bloqueTotales(doc, input.subtotal, input.igv, input.total, input.moneda, rightX, y);

  doc.save(`${input.codigo}.pdf`);
}

// ---------------------------------------------------------------------------
// Guía de Remisión (entrega al cliente)
// ---------------------------------------------------------------------------

export interface GuiaRemisionPDFInput {
  numero_guia: string;
  fecha: string;
  cotizacion_codigo: string;
  cliente: ClienteInfoPDF;
  direccion_llegada: string;
  transportista_nombre?: string;
  transportista_ruc?: string;
  detalles: { nombre: string; cantidad: number; unidad_medida: string }[];
}

export function generarGuiaRemisionPDF(input: GuiaRemisionPDFInput) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  const rightX = 547;

  let y = encabezado(doc, 'GUÍA DE REMISIÓN', input.numero_guia, input.fecha, marginX, rightX);
  y = bloqueCliente(doc, input.cliente, marginX, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Punto de llegada:', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(input.direccion_llegada, marginX + 100, y);
  y += 15;
  if (input.transportista_nombre) {
    doc.setFont('helvetica', 'bold');
    doc.text('Transportista:', marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${input.transportista_nombre}${input.transportista_ruc ? ' (RUC ' + input.transportista_ruc + ')' : ''}`, marginX + 90, y);
    y += 15;
  }
  doc.setFont('helvetica', 'bold');
  doc.text('Cotización origen:', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(input.cotizacion_codigo, marginX + 105, y);
  y += 28;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFillColor(6, 95, 70);
  doc.rect(marginX, y - 12, rightX - marginX, 20, 'F');
  doc.text('Producto', marginX + 6, y + 2);
  doc.text('Cantidad', rightX - 6, y + 2, { align: 'right' });
  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  input.detalles.forEach((d, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, y - 11, rightX - marginX, 18, 'F');
    }
    doc.text(d.nombre, marginX + 6, y + 2);
    doc.text(`${d.cantidad} ${d.unidad_medida}`, rightX - 6, y + 2, { align: 'right' });
    y += 18;
  });

  doc.save(`${input.numero_guia}.pdf`);
}

// ---------------------------------------------------------------------------
// Comprobante SUNAT (factura/boleta al cliente)
// ---------------------------------------------------------------------------

export interface ComprobanteSunatPDFInput {
  tipo_comprobante: string;
  serie: string;
  numero: string;
  cliente: ClienteInfoPDF;
  fecha_emision: string;
  moneda: string;
  subtotal: number;
  igv: number;
  total: number;
  estado_sunat: string;
  hash_cpe: string;
  qr_data: string;
}

export function generarComprobantePDF(cpe: ComprobanteSunatPDFInput) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  const rightX = 547;

  let y = encabezado(doc, cpe.tipo_comprobante, `${cpe.serie}-${cpe.numero}`, cpe.fecha_emision, marginX, rightX);
  y = bloqueCliente(doc, cpe.cliente, marginX, y);
  y = bloqueTotales(doc, cpe.subtotal, cpe.igv, cpe.total, cpe.moneda, rightX, y);

  y += 20;
  doc.setDrawColor(220, 220, 220);
  doc.line(marginX, y, rightX, y);
  y += 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Estado SUNAT: ${cpe.estado_sunat} (Código 0 - Aceptado)`, marginX, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Resumen Hash de Firma Digital (SHA-256):', marginX, y);
  y += 13;
  const hashLines = doc.splitTextToSize(cpe.hash_cpe, rightX - marginX);
  doc.text(hashLines, marginX, y);
  y += hashLines.length * 12 + 8;
  doc.text('Cadena para Código QR SUNAT:', marginX, y);
  y += 13;
  const qrLines = doc.splitTextToSize(cpe.qr_data, rightX - marginX);
  doc.text(qrLines, marginX, y);

  doc.save(`${cpe.serie}-${cpe.numero}.pdf`);
}

export function generarComprobanteXML(cpe: ComprobanteSunatPDFInput): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:ID>${cpe.serie}-${cpe.numero}</cbc:ID>
  <cbc:IssueDate>${cpe.fecha_emision}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>${cpe.tipo_comprobante === 'FACTURA' ? '01' : '03'}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${cpe.moneda}</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyLegalEntity>
        <cbc:CompanyID>20601234567</cbc:CompanyID>
        <cbc:RegistrationName>${EMISOR_NOMBRE}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyLegalEntity>
        <cbc:CompanyID>${cpe.cliente.num_doc}</cbc:CompanyID>
        <cbc:RegistrationName>${cpe.cliente.razon_social}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      <cac:PostalAddress>
        <cbc:StreetName>${cpe.cliente.direccion}</cbc:StreetName>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${cpe.moneda}">${cpe.igv.toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${cpe.moneda}">${cpe.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:PayableAmount currencyID="${cpe.moneda}">${cpe.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cbc:Note>Hash CPE (SHA-256, base64): ${cpe.hash_cpe}</cbc:Note>
  <cbc:Note>QR: ${cpe.qr_data}</cbc:Note>
</Invoice>
`;
}

export function generarCdrTexto(cpe: ComprobanteSunatPDFInput): string {
  return `CONSTANCIA DE RECEPCIÓN (CDR) - SUNAT
=======================================
Comprobante: ${cpe.serie}-${cpe.numero}
Tipo: ${cpe.tipo_comprobante}
Emisor: ${EMISOR_NOMBRE} (RUC 20601234567)
Receptor: ${cpe.cliente.razon_social} (${cpe.cliente.tipo_doc}: ${cpe.cliente.num_doc})
Fecha de emisión: ${cpe.fecha_emision}

Estado SUNAT: ${cpe.estado_sunat}
Código de respuesta: 0 (ACEPTADO)

Hash CPE (SHA-256, base64): ${cpe.hash_cpe}
Cadena QR: ${cpe.qr_data}

Total: ${money(cpe.total, cpe.moneda)}
=======================================
Este documento es una representación de prueba del CDR real que
emitiría el servidor de SUNAT en un entorno de producción homologado.
`;
}

// ---------------------------------------------------------------------------
// Informe técnico (órdenes de trabajo / proyectos de armado)
// ---------------------------------------------------------------------------

export interface BitacoraItemPDF {
  titulo: string;
  descripcion?: string;
  fecha: string;
}

export interface OrdenTrabajoPDFInput {
  codigo: string;
  cliente_nombre: string;
  ubicacion: string;
  tecnico_nombre: string;
  fecha_programada: string;
  estado: string;
  bitacora: BitacoraItemPDF[];
  firma_url?: string;
  firma_nombre?: string;
}

export function generarInformeTecnicoPDF(ot: OrdenTrabajoPDFInput) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  let y = 56;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(6, 95, 70);
  doc.text(EMISOR_NOMBRE, marginX, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  y += 16;
  doc.text(EMISOR_LINEA2, marginX, y);

  y += 28;
  doc.setDrawColor(220, 220, 220);
  doc.line(marginX, y, 547, y);

  y += 24;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`Informe Técnico de Instalación: ${ot.codigo}`, marginX, y);

  y += 22;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Cliente: ${ot.cliente_nombre}`, marginX, y);
  y += 15;
  doc.text(`Fundo / Ubicación: ${ot.ubicacion}`, marginX, y);
  y += 15;
  doc.text(`Técnico responsable: ${ot.tecnico_nombre}`, marginX, y);
  y += 15;
  doc.text(`Fecha programada: ${ot.fecha_programada}`, marginX, y);
  y += 15;
  doc.text(`Estado: ${ot.estado}`, marginX, y);

  y += 28;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Bitácora cronológica de avance', marginX, y);
  y += 6;
  doc.setDrawColor(220, 220, 220);
  doc.line(marginX, y, 547, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  if (ot.bitacora.length === 0) {
    doc.setTextColor(120, 120, 120);
    doc.text('No hay hitos registrados aún.', marginX, y);
    y += 14;
  } else {
    ot.bitacora.forEach((b) => {
      if (y > 740) {
        doc.addPage();
        y = 56;
      }
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(6, 95, 70);
      doc.text(`${b.titulo}  (${b.fecha})`, marginX, y);
      y += 14;
      if (b.descripcion) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        const notaLines = doc.splitTextToSize(b.descripcion, 500);
        doc.text(notaLines, marginX, y);
        y += notaLines.length * 12 + 4;
      }
      y += 8;
    });
  }

  if (ot.firma_url) {
    if (y > 620) {
      doc.addPage();
      y = 56;
    }
    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Firma digital de conformidad del cliente', marginX, y);
    y += 14;
    try {
      doc.addImage(ot.firma_url, 'PNG', marginX, y, 220, 70);
      y += 78;
    } catch {
      y += 8;
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Firmado por: ${ot.firma_nombre || ot.cliente_nombre}`, marginX, y);
  }

  doc.save(`Informe_Tecnico_${ot.codigo}.pdf`);
}
