'use client';

import React, { useState } from 'react';
import { Receipt, CheckCircle2, Download, FileCode, ShieldCheck, Search, Eye, Printer, Truck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { downloadTextFile, generarComprobanteXML, generarCdrTexto, generarComprobantePDF, ComprobanteSunatPDFInput } from '@/lib/documents';
import { ComprobanteConCliente } from '@/lib/queries/comprobantes';
import { prepararDescargaComprobante } from '@/app/actions/facturacion';
import { DespachoCliente } from '@/types/db';

interface Props {
  comprobantes: ComprobanteConCliente[];
  despachos: DespachoCliente[];
}

export function SunatClient({ comprobantes, despachos }: Props) {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedData, setSelectedData] = useState<ComprobanteSunatPDFInput | null>(null);

  const filtered = comprobantes.filter(
    (cpe) =>
      `${cpe.serie}-${cpe.numero}`.toLowerCase().includes(search.toLowerCase()) ||
      (cpe.clientes?.razon_social ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (cpe.clientes?.num_doc ?? '').includes(search)
  );

  const totalIgv = comprobantes.reduce((acc, c) => acc + c.igv, 0);

  async function abrirComprobante(id: string) {
    setSelectedId(id);
    try {
      const data = await prepararDescargaComprobante(id);
      setSelectedData(data);
    } catch {
      showToast('error', 'No se pudo cargar el comprobante.');
      setSelectedId(null);
    }
  }

  async function descargarXml(id: string, codigo: string) {
    const data = await prepararDescargaComprobante(id);
    downloadTextFile(`${codigo}.xml`, generarComprobanteXML(data), 'application/xml');
    showToast('success', `XML UBL 2.1 de ${codigo} descargado.`);
  }

  async function descargarCdr(id: string, codigo: string) {
    const data = await prepararDescargaComprobante(id);
    downloadTextFile(`R-${codigo}-CDR.txt`, generarCdrTexto(data), 'text/plain');
    showToast('success', `Constancia de Recepción (CDR) de ${codigo} descargada.`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Facturación Electrónica SUNAT</h1>
          <p className="text-xs text-slate-500 mt-1">Comprobantes de pago (Factura/Boleta) y guías de remisión emitidas.</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-xs text-amber-800 font-bold">
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          <span>Entorno de Homologación SUNAT (Datos de Prueba)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Comprobantes Emitidos" value={comprobantes.length} icon={Receipt} accent="emerald" />
        <StatCard label="Guías de Remisión" value={despachos.length} icon={Truck} accent="blue" />
        <StatCard label="Total I.G.V. Liquidado" value={`S/ ${totalIgv.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`} icon={Receipt} accent="blue" />
      </div>

      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por serie-número, cliente o RUC..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-4">Comprobante</th>
                <th className="p-4">Cliente / RUC</th>
                <th className="p-4">Estado SUNAT</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4 text-center">Archivos Fiscales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    No hay comprobantes emitidos aún.
                  </td>
                </tr>
              ) : (
                filtered.map((cpe) => {
                  const codigo = `${cpe.serie}-${cpe.numero}`;
                  return (
                    <tr key={cpe.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <span className="font-mono text-sm font-bold text-slate-900 block">{codigo}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{cpe.tipo_comprobante}</span>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-900 block truncate max-w-[200px]">{cpe.clientes?.razon_social}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {cpe.clientes?.tipo_doc}: {cpe.clientes?.num_doc}
                        </span>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={cpe.estado_sunat ?? 'ACEPTADO'} />
                      </td>
                      <td className="p-4 text-right font-black text-emerald-700 text-sm">
                        S/ {cpe.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => abrirComprobante(cpe.id)} title="Ver detalle" className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => descargarXml(cpe.id, codigo)} title="Descargar XML" className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 cursor-pointer">
                            <FileCode className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => descargarCdr(cpe.id, codigo)} title="Descargar CDR" className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 cursor-pointer">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {despachos.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Guías de Remisión Emitidas</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {despachos.map((d) => (
              <div key={d.id} className="p-4 flex justify-between items-center text-xs">
                <div>
                  <span className="font-mono font-bold text-slate-900 block">{d.numero_guia_remision}</span>
                  <span className="text-slate-500">{d.direccion_llegada}</span>
                </div>
                <span className="text-slate-500">{d.fecha_despacho ? new Date(d.fecha_despacho).toLocaleDateString('es-PE') : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedId && selectedData && (
        <Modal isOpen={Boolean(selectedId)} onClose={() => setSelectedId(null)} title={`Comprobante: ${selectedData.serie}-${selectedData.numero}`}>
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Constancia de Recepción SUNAT (CDR): CÓDIGO 0 (ACEPTADO)</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Cliente:</span>
                <span className="font-bold text-slate-900">{selectedData.cliente.razon_social}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">RUC / Doc:</span>
                <span className="font-mono font-bold text-slate-800">{selectedData.cliente.num_doc}</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hash de Firma Digital:</label>
              <div className="p-2 rounded-lg bg-slate-100 font-mono text-[11px] break-all border border-slate-200">{selectedData.hash_cpe}</div>
            </div>

            <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total:</span>
              <span className="text-emerald-700 text-sm">S/ {selectedData.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button
                variant="secondary"
                onClick={() => {
                  generarComprobantePDF(selectedData);
                  showToast('success', 'Representación impresa descargada.');
                }}
                className="text-xs"
              >
                <Printer className="w-3.5 h-3.5" /> Descargar PDF
              </Button>
              <Button onClick={() => setSelectedId(null)} className="text-xs">
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
