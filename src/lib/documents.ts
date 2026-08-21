import jsPDF from 'jspdf';
import { ComprobanteSunat, OrdenTrabajo, Cotizacion } from '@/types/erp';

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

export function generarComprobanteXML(cpe: ComprobanteSunat): string {
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
        <cbc:RegistrationName>AGROFERTIL PERU S.A.C.</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyLegalEntity>
        <cbc:CompanyID>${cpe.cliente_num_doc}</cbc:CompanyID>
        <cbc:RegistrationName>${cpe.cliente_razon_social}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      <cac:PostalAddress>
        <cbc:StreetName>${cpe.cliente_direccion}</cbc:StreetName>
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

export function generarCdrTexto(cpe: ComprobanteSunat): string {
  return `CONSTANCIA DE RECEPCIÓN (CDR) - SUNAT
=======================================
Comprobante: ${cpe.serie}-${cpe.numero}
Tipo: ${cpe.tipo_comprobante}
Emisor: AGROFERTIL PERU S.A.C. (RUC 20601234567)
Receptor: ${cpe.cliente_razon_social} (${cpe.cliente_tipo_doc}: ${cpe.cliente_num_doc})
Fecha de emisión: ${cpe.fecha_emision}

Estado SUNAT: ${cpe.estado_sunat}
Código de respuesta: 0 (ACEPTADO)
Observaciones: ${cpe.observaciones_sunat || 'El comprobante ha sido aceptado por el servidor de SUNAT.'}

Hash CPE (SHA-256, base64): ${cpe.hash_cpe}
Cadena QR: ${cpe.qr_data}

Total: ${cpe.moneda} ${cpe.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
=======================================
Este documento es una representación de prueba del CDR real que
emitiría el servidor de SUNAT en un entorno de producción homologado.
`;
}

export function generarInformeTecnicoPDF(ot: OrdenTrabajo) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  let y = 56;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(6, 95, 70);
  doc.text('AGROFERTIL PERÚ S.A.C.', marginX, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  y += 16;
  doc.text('RUC: 20601234567 · Panamericana Sur Km 140, Cañete, Lima', marginX, y);

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
  doc.text(`Fundo / Ubicación: ${ot.ubicacion_fundo}`, marginX, y);
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
      doc.text(`${b.hito}  (${b.fecha_registro} ${b.hora_registro})`, marginX, y);
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const notaLines = doc.splitTextToSize(b.nota, 500);
      doc.text(notaLines, marginX, y);
      y += notaLines.length * 12 + 4;
      if (b.materiales_extra) {
        doc.setTextColor(146, 64, 14);
        const matLines = doc.splitTextToSize(`Materiales extra: ${b.materiales_extra}`, 500);
        doc.text(matLines, marginX, y);
        y += matLines.length * 12 + 4;
      }
      y += 8;
    });
  }

  if (ot.firma_cliente_url) {
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
      doc.addImage(ot.firma_cliente_url, 'PNG', marginX, y, 220, 70);
      y += 78;
    } catch {
      y += 8;
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Firmado por: ${ot.firma_cliente_nombre || ot.cliente_nombre}`, marginX, y);
  }

  doc.save(`Informe_Tecnico_${ot.codigo}.pdf`);
}

export function generarComprobantePDF(cpe: ComprobanteSunat) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  const rightX = 547;
  let y = 56;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(6, 95, 70);
  doc.text('AGROFERTIL PERÚ S.A.C.', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  y += 16;
  doc.text('RUC: 20601234567 · Panamericana Sur Km 140, Cañete, Lima', marginX, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(6, 95, 70);
  doc.text(cpe.tipo_comprobante, rightX, 56, { align: 'right' });
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${cpe.serie}-${cpe.numero}`, rightX, 70, { align: 'right' });

  y += 28;
  doc.setDrawColor(220, 220, 220);
  doc.line(marginX, y, rightX, y);
  y += 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Cliente:', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${cpe.cliente_razon_social}  (${cpe.cliente_tipo_doc}: ${cpe.cliente_num_doc})`, marginX + 48, y);
  y += 15;
  doc.setFont('helvetica', 'bold');
  doc.text('Dirección:', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(cpe.cliente_direccion, marginX + 55, y);
  y += 15;
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha de emisión:', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(cpe.fecha_emision, marginX + 90, y);

  y += 28;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal Gravado:', 350, y);
  doc.text(`S/ ${cpe.subtotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, rightX, y, { align: 'right' });
  y += 15;
  doc.text('I.G.V. (18%):', 350, y);
  doc.text(`S/ ${cpe.igv.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, rightX, y, { align: 'right' });
  y += 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(6, 95, 70);
  doc.text('TOTAL:', 350, y);
  doc.text(`S/ ${cpe.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, rightX, y, { align: 'right' });

  y += 32;
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

export function generarCotizacionPDF(cot: Cotizacion) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  const rightX = 547;
  let y = 56;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(6, 95, 70);
  doc.text('AGROFERTIL PERÚ S.A.C.', marginX, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  y += 16;
  doc.text('RUC: 20601234567 · Panamericana Sur Km 140, Cañete, Lima', marginX, y);
  y += 12;
  doc.text('Especialistas en Fertirriego & Automatización Agrícola', marginX, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(6, 95, 70);
  doc.text('COTIZACIÓN OFICIAL', rightX, 56, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(cot.numero, rightX, 70, { align: 'right' });
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Fecha: ${cot.fecha}`, rightX, 82, { align: 'right' });

  y += 28;
  doc.setDrawColor(220, 220, 220);
  doc.line(marginX, y, rightX, y);

  y += 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Cliente:', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${cot.cliente_razon_social}  (${cot.cliente_tipo_doc}: ${cot.cliente_num_doc})`, marginX + 48, y);
  y += 15;
  doc.setFont('helvetica', 'bold');
  doc.text('Dirección:', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(cot.cliente_direccion, marginX + 55, y);
  y += 15;
  doc.setFont('helvetica', 'bold');
  doc.text('Email:', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(cot.cliente_email, marginX + 40, y);

  y += 28;
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
  cot.detalles.forEach((d, i) => {
    if (y > 740) {
      doc.addPage();
      y = 56;
    }
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, y - 11, rightX - marginX, 18, 'F');
    }
    const nombreLines = doc.splitTextToSize(d.producto_nombre, 300);
    doc.text(nombreLines[0], marginX + 6, y + 2);
    doc.text(String(d.cantidad), 380, y + 2);
    doc.text(`S/ ${d.precio_unitario.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, 440, y + 2);
    doc.text(`S/ ${d.subtotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, rightX - 6, y + 2, { align: 'right' });
    y += 18;
  });

  if (cot.incluye_mano_obra) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 95, 70);
    doc.text('Servicio Técnico Especializado de Armado y Calibración', marginX + 6, y + 2);
    doc.text(`S/ ${cot.costo_mano_obra.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, rightX - 6, y + 2, { align: 'right' });
    y += 18;
  }

  y += 16;
  doc.setDrawColor(220, 220, 220);
  doc.line(350, y, rightX, y);
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal Gravado:', 350, y);
  doc.text(`S/ ${cot.subtotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, rightX, y, { align: 'right' });
  y += 15;
  doc.text('I.G.V. (18%):', 350, y);
  doc.text(`S/ ${cot.igv.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, rightX, y, { align: 'right' });
  y += 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(6, 95, 70);
  doc.text('TOTAL A PAGAR:', 350, y);
  doc.text(`S/ ${cot.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, rightX, y, { align: 'right' });

  doc.save(`${cot.numero}.pdf`);
}
