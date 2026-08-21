'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Receipt,
  Wrench,
  Package,
  Truck,
  Users,
  Sprout,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useAgroErp } from '@/context/AgroErpContext';

export function AdminSidebar() {
  const pathname = usePathname();
  const { metricas } = useAgroErp();

  const menu = [
    { name: 'Dashboard Principal', href: '/admin', icon: LayoutDashboard },
    {
      name: 'Cotizaciones',
      href: '/admin/cotizaciones',
      icon: FileText,
      badge: metricas.cotizacionesPendientesCount > 0 ? `${metricas.cotizacionesPendientesCount}` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 border border-amber-300',
    },
    {
      name: 'Órdenes de Compra',
      href: '/admin/compras',
      icon: ShoppingCart,
      badge: metricas.ordenesCompraEnTransito > 0 ? `${metricas.ordenesCompraEnTransito}` : undefined,
      badgeColor: 'bg-blue-100 text-blue-800 border border-blue-300',
    },
    { name: 'Facturación SUNAT', href: '/admin/sunat', icon: Receipt },
    {
      name: 'Módulo Técnico de Campo',
      href: '/admin/ordenes-trabajo',
      icon: Wrench,
      badge: metricas.ordenesTrabajoActivas > 0 ? `${metricas.ordenesTrabajoActivas} en campo` : undefined,
      badgeColor: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    },
    { name: 'Productos & Stock', href: '/admin/inventario', icon: Package },
    { name: 'Proveedores', href: '/admin/proveedores', icon: Truck },
    { name: 'Clientes & Fundos', href: '/admin/clientes', icon: Users },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 text-slate-700 flex flex-col shrink-0 min-h-screen shadow-xs">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 bg-slate-50/50">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
            <Sprout className="w-5 h-5 fill-current" />
          </div>
          <div>
            <span className="text-base font-extrabold text-slate-900 leading-tight block">AgroFertil ERP</span>
            <span className="text-[9px] text-emerald-700 font-bold uppercase tracking-wider">Gestión SUNAT</span>
          </div>
        </Link>
      </div>

      {/* Quick Public Cotizador Link */}
      <div className="p-3 mx-3 my-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-emerald-900 text-[11px]">Portal Público</span>
          <Link
            href="/cotizador"
            target="_blank"
            className="text-[10px] text-emerald-700 hover:text-emerald-900 flex items-center gap-1 font-bold"
          >
            Abrir <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        <p className="text-[10px] text-slate-600 mt-1">Catálogo y cotizador en vivo con consulta de RUC/DNI.</p>
      </div>

      {/* Nav list */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Módulos del Sistema
        </div>

        {menu.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-800'}`} />
              <span className="flex-1 truncate">{item.name}</span>
              {item.badge && (
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white text-emerald-800' : item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer User Info */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-white text-xs font-bold shadow-inner">
            CM
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 truncate">Ing. Carlos Mendoza</p>
            <p className="text-[10px] text-emerald-700 font-semibold truncate">Administrador General</p>
          </div>
        </div>

        <Link
          href="/tecnico"
          title="Ver como técnico"
          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-200 rounded-lg text-xs"
        >
          <Wrench className="w-4 h-4" />
        </Link>
      </div>
    </aside>
  );
}
