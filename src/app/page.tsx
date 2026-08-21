'use client';

import React from 'react';
import Link from 'next/link';
import { Sprout, ArrowRight, FileText, Wrench, ShieldCheck, CheckCircle2, Sparkles, Building } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
              <Sprout className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900 block leading-tight">AgroFertil ERP</span>
              <span className="text-[9px] text-emerald-700 font-bold uppercase tracking-wider">Suite Agrícola SUNAT</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
            <a href="#modulos" className="hover:text-emerald-700 transition-colors">
              Módulos del Sistema
            </a>
            <a href="#flujos" className="hover:text-emerald-700 transition-colors">
              Flujos Operativos
            </a>
            <a href="/cotizador" className="hover:text-emerald-700 transition-colors">
              Cotizador SUNAT
            </a>
            <a href="/admin" className="hover:text-emerald-700 transition-colors">
              Panel Admin
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button size="sm" variant="outline" className="text-xs border-slate-300 bg-white text-slate-700 hover:bg-slate-50">
                Panel Admin
              </Button>
            </Link>

            <Link href="/cotizador">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs">
                <span>Cotizador en Vivo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden bg-gradient-to-b from-emerald-50/50 via-white to-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 border border-emerald-300 text-xs font-bold text-emerald-900 mb-6 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            <span>Sistema Integral ERP / CRM para Venta de Insumos y Mesas de Fertilización</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 max-w-4xl mx-auto leading-[1.15]">
            Cotizaciones en vivo, compras automáticas, <span className="bg-gradient-to-r from-emerald-700 via-teal-600 to-emerald-800 bg-clip-text text-transparent">Facturación SUNAT</span> y control técnico en campo.
          </h1>

          <p className="mt-6 text-sm sm:text-base text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
            Plataforma web modular de grado empresarial para empresas agrícolas: cotiza con consulta automática de RUC/DNI, agrupa órdenes de compra por proveedor, emite comprobantes electrónicos con CDR y registra bitácoras de instalación con fotos y firma digital en campo.
          </p>

          {/* 3 Main Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/cotizador">
              <Button size="lg" className="font-bold text-xs sm:text-sm px-6 py-3.5 rounded-xl">
                <FileText className="w-4 h-4" />
                1. Abrir Cotizador Público con RUC/DNI
              </Button>
            </Link>

            <Link href="/admin">
              <Button size="lg" variant="outline" className="font-bold text-xs sm:text-sm px-6 py-3.5 rounded-xl">
                <Building className="w-4 h-4 text-slate-500" />
                2. Panel Administrativo & Compras
              </Button>
            </Link>

            <Link href="/tecnico">
              <Button size="lg" variant="outline" className="font-bold text-xs sm:text-sm px-6 py-3.5 rounded-xl">
                <Wrench className="w-4 h-4 text-slate-500" />
                3. App Móvil de Técnicos en Campo
              </Button>
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600 font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Consulta RUC/DNI en tiempo real
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Generador de Órdenes de Compra por Proveedor
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Firma Digital en Pantalla & Reportes PDF
            </span>
          </div>
        </div>
      </section>

      {/* 3 Portal Architecture Overview */}
      <section id="modulos" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Arquitectura de Tres Portales</span>
          <h2 className="text-3xl font-black text-slate-900 mt-2">
            Tres interfaces conectadas por un único backend robusto
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Portal 1 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 transition-all flex flex-col justify-between space-y-4 shadow-xs">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 border border-emerald-200">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Frontend 1</span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">Portal Web Público & Cotizador</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Catálogo interactivo de productos agrícolas y mesas de fertilización. Consulta en tiempo real de RUC/DNI con autocompletado de Razón Social y dirección fiscal. Genera cotizaciones oficiales con desglose de IGV y numeración correlativa.
              </p>
            </div>
            <Link href="/cotizador">
              <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
                Ir al Cotizador en Vivo <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          {/* Portal 2 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-cyan-500 transition-all flex flex-col justify-between space-y-4 shadow-xs">
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center mb-3 border border-cyan-200">
                <Building className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider">Frontend 2</span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">Panel Administrativo ERP / CRM</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Aprobación de cotizaciones, generación semiautomática de Órdenes de Compra agrupadas por proveedor, registro de Facturas de Proveedores en Cuentas por Pagar y Facturación Electrónica SUNAT UBL 2.1 con descarga de XML y CDR.
              </p>
            </div>
            <Link href="/admin">
              <Button size="sm" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs">
                Ir al Panel Admin <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          {/* Portal 3 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-purple-500 transition-all flex flex-col justify-between space-y-4 shadow-xs">
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3 border border-purple-200">
                <Wrench className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Frontend 3</span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">Portal Técnico de Campo</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                App móvil responsive para técnicos en fundos agrícolas. Registro de hitos cronológicos, captura de fotografías de instalación, registro de materiales extra y canvas táctil para firma digital del cliente e informe técnico final en PDF.
              </p>
            </div>
            <Link href="/tecnico">
              <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs">
                Ir a la App Móvil de Técnicos <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Flujos Operativos Paso a Paso */}
      <section id="flujos" className="py-16 bg-slate-100/70 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Guía de Casos Operativos</span>
            <h2 className="text-3xl font-black text-slate-900 mt-2">
              Flujos de trabajo completos y automatizados
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Caso A */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-cyan-100 text-cyan-800 font-bold text-xs border border-cyan-200">CASO 1</span>
                <h3 className="text-base font-bold text-slate-900">Solo Venta de Productos Agrícolas (Bajo Pedido)</h3>
              </div>
              <ol className="space-y-3 text-xs text-slate-600">
                <li className="flex gap-2">
                  <span className="font-bold text-cyan-700">1.</span>
                  <span><strong>Web Cliente:</strong> Selección de productos, validación de RUC/DNI con autocompletado y generación de Cotización PENDIENTE.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-cyan-700">2.</span>
                  <span><strong>Panel Admin:</strong> Administrador aprueba y genera con 1-clic Órdenes de Compra automáticas agrupadas por proveedor.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-cyan-700">3.</span>
                  <span><strong>Recepción & Compras:</strong> Proveedores entregan productos y facturas; se marca como RECIBIDO y el stock se actualiza.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-cyan-700">4.</span>
                  <span><strong>Facturación & Despacho:</strong> Emisión de Factura SUNAT UBL 2.1 con CDR y Guía de Remisión Electrónica (GRE).</span>
                </li>
              </ol>
            </div>

            {/* Caso B */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200">CASO 2</span>
                <h3 className="text-base font-bold text-slate-900">Venta + Armado e Instalación de Mesa de Fertilización</h3>
              </div>
              <ol className="space-y-3 text-xs text-slate-600">
                <li className="flex gap-2">
                  <span className="font-bold text-emerald-700">1.</span>
                  <span><strong>Cotización & Aprobación:</strong> Cliente cotiza mesa de fertilización + mano de obra y el administrador aprueba la operación.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-emerald-700">2.</span>
                  <span><strong>Compras:</strong> Generación de OC para bombas booster, manifold de PVC C-80 y controladores de fertirriego.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-emerald-700">3.</span>
                  <span><strong>Módulo Técnico en Fundo:</strong> Técnico asignado abre la app móvil, registra bitácora, sube fotos de presión y recopila la firma del cliente en pantalla.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-emerald-700">4.</span>
                  <span><strong>Cierre & Factura Final:</strong> Generación del Informe Técnico Oficial en PDF y liquidación con Factura SUNAT.</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 py-8 bg-white text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
              <Sprout className="w-3.5 h-3.5 fill-current" />
            </div>
            <span className="font-bold text-slate-900">AgroFertil ERP / CRM Suite</span>
            <span>• Solución Integral para la Industria Agrícola</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/cotizador" className="hover:text-emerald-700 font-medium">Cotizador Público</Link>
            <Link href="/admin" className="hover:text-emerald-700 font-medium">Panel Administrativo</Link>
            <Link href="/tecnico" className="hover:text-emerald-700 font-medium">App Técnico Móvil</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
