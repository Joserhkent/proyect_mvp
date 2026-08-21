'use client';

import React, { useState } from 'react';
import { Receipt, CheckCircle2, Download, FileCode, ShieldCheck, Search, Eye, Printer } from 'lucide-react';
import { useAgroErp } from '@/context/AgroErpContext';
import { ComprobanteSunat } from '@/types/erp';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';

export default function AdminSunatPage() {
  const { comprobantesSunat } = useAgroErp();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedCPE, setSelectedCPE] = useState<ComprobanteSunat | null>(null);

  const filteredCPE = comprobantesSunat.filter(
    (cpe) =>
      `${cpe.serie}-${cpe.numero}`.toLowerCase().includes(search.toLowerCase()) ||
      cpe.cliente_razon_social.toLowerCase().includes(search.toLowerCase()) ||
      cpe.cliente_num_doc.includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Facturación Electrónica SUNAT (UBL 2.1)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Registro de Comprobantes de Pago Electrónicos (Facturas, Boletas, Guías de Remisión) y Constancias de Recepción (CDR).
          </p>
        </div>

        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-xs text-amber-800 font-bold">
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          <span>Entorno de Homologación SUNAT (Datos de Prueba)</span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Facturas Emitidas" value={comprobantesSunat.length} icon={Receipt} accent="emerald" />
        <StatCard label="Estado SUNAT" value="100% Aceptados" icon={CheckCircle2} accent="emerald" />
        <StatCard
          label="Total I.G.V. Liquidado"
          value={`S/ ${comprobantesSunat.reduce((acc, c) => acc + c.igv, 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
          icon={Receipt}
          accent="blue"
        />
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por serie-número, cliente o RUC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-4">Comprobante</th>
                <th className="p-4">Cliente / RUC</th>
                <th className="p-4">Fecha Emisión</th>
                <th className="p-4">Estado SUNAT</th>
                <th className="p-4">Subtotal</th>
                <th className="p-4">I.G.V. (18%)</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4 text-center">Archivos Fiscales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCPE.map((cpe) => (
                <tr key={cpe.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <span className="font-mono text-sm font-bold text-slate-900 block">
                      {cpe.serie}-{cpe.numero}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">{cpe.tipo_comprobante}</span>
                  </td>

                  <td className="p-4">
                    <span className="font-bold text-slate-900 block truncate max-w-[200px]">
                      {cpe.cliente_razon_social}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {cpe.cliente_tipo_doc}: {cpe.cliente_num_doc}
                    </span>
                  </td>

                  <td className="p-4 text-slate-600">{cpe.fecha_emision}</td>

                  <td className="p-4">
                    <StatusBadge status={cpe.estado_sunat} />
                  </td>

                  <td className="p-4 text-slate-700">
                    S/ {cpe.subtotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </td>

                  <td className="p-4 text-slate-700">
                    S/ {cpe.igv.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </td>

                  <td className="p-4 text-right font-black text-emerald-700 text-sm">
                    S/ {cpe.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </td>

                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedCPE(cpe)}
                        title="Ver Comprobante Electrónico y Hash"
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() =>
                          showToast(
                            'info',
                            `Simulando descarga de ${cpe.serie}-${cpe.numero}.xml — se conectará a la firma digital SUNAT real en producción.`
                          )
                        }
                        title="Descargar XML firmado"
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 cursor-pointer"
                      >
                        <FileCode className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() =>
                          showToast(
                            'info',
                            `Simulando descarga de R-${cpe.serie}-${cpe.numero}.zip — se conectará al servicio SUNAT real en producción.`
                          )
                        }
                        title="Descargar CDR SUNAT (ZIP)"
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Visor de Comprobante Electrónico */}
      {selectedCPE && (
        <Modal
          isOpen={Boolean(selectedCPE)}
          onClose={() => setSelectedCPE(null)}
          title={`Comprobante Electrónico: ${selectedCPE.serie}-${selectedCPE.numero}`}
          description={`Validado con éxito por el servidor de SUNAT`}
        >
          <div className="space-y-4 text-xs">
            {/* SUNAT Response Banner */}
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Constancia de Recepción SUNAT (CDR): CÓDIGO 0 (ACEPTADO)</span>
              </div>
              <p className="text-[11px] text-emerald-800">{selectedCPE.observaciones_sunat}</p>
            </div>

            {/* Tax Info */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Cliente:</span>
                <span className="font-bold text-slate-900">{selectedCPE.cliente_razon_social}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">RUC / Doc:</span>
                <span className="font-mono font-bold text-slate-800">{selectedCPE.cliente_num_doc}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Dirección:</span>
                <span className="text-slate-700">{selectedCPE.cliente_direccion}</span>
              </div>
            </div>

            {/* Hash & QR */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Resumen Hash de Firma Digital (SHA-256):
              </label>
              <div className="p-2 rounded-lg bg-slate-100 font-mono text-[11px] text-slate-800 break-all select-all border border-slate-200">
                {selectedCPE.hash_cpe}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Cadena para Código QR SUNAT:
              </label>
              <div className="p-2 rounded-lg bg-slate-100 font-mono text-[10px] text-slate-600 break-all select-all border border-slate-200">
                {selectedCPE.qr_data}
              </div>
            </div>

            <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total Comprobante:</span>
              <span className="text-emerald-700 text-sm">
                S/ {selectedCPE.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button
                variant="secondary"
                onClick={() => window.print()}
                className="text-xs"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir Representación Impresa
              </Button>
              <Button onClick={() => setSelectedCPE(null)} className="bg-slate-900 text-white text-xs">
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
