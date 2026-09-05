'use client';

import React from 'react';
import Image from 'next/image';
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
  Building2,
  ChevronRight,
} from 'lucide-react';

export function AdminSidebar() {
  const pathname = usePathname();

  const menu = [
    { name: 'Dashboard Principal', href: '/admin', icon: LayoutDashboard },
    { name: 'Cotizaciones Clientes', href: '/admin/cotizaciones', icon: FileText },
    { name: 'Cotizaciones Proveedores', href: '/admin/cotizaciones-proveedor', icon: Building2 },
    { name: 'Órdenes de Compra', href: '/admin/compras', icon: ShoppingCart },
    { name: 'Facturación SUNAT', href: '/admin/sunat', icon: Receipt },
    { name: 'Módulo Técnico de Campo', href: '/admin/ordenes-trabajo', icon: Wrench },
    { name: 'Productos & Stock', href: '/admin/inventario', icon: Package },
    { name: 'Proveedores', href: '/admin/proveedores', icon: Truck },
    { name: 'Clientes & Fundos', href: '/admin/clientes', icon: Users },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 text-slate-700 flex flex-col shrink-0 min-h-screen shadow-xs">
      {/* Brand Header */}
      <div className="py-4 px-5 border-b border-slate-200 bg-slate-50/50">
        <Link href="/admin" className="flex flex-col items-center justify-center gap-1.5 text-center">
          <Image 
            src="/logo.png" 
            alt="Solftec Logo" 
            width={180} 
            height={100} 
            priority
            className="h-auto w-auto max-h-25 object-contain" 
          />
          <div className="flex flex-col items-center">
            <span className="text-[15px] text-emerald-700 font-bold uppercase tracking-wider">PANEL ADMINISTRATIVO</span>
          </div>
        </Link>
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