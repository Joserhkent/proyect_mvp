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
  ChevronRight,
} from 'lucide-react';
import { Metricas } from '@/lib/queries/metricas';

interface Props {
  metricas: Metricas;
  usuarioNombre: string;
  usuarioRol: string;
}

export function AdminSidebar({ metricas, usuarioNombre, usuarioRol }: Props) {
  const pathname = usePathname();

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
      <div className="py-4 px-5 border-b border-slate-200 bg-slate-50/50">
        <Link href="/admin" className="flex flex-col items-center justify-center gap-1.5 text-center">
          {/* Logo transparente y más grande */}
          <Image 
            src="/logo.png" 
            alt="Solftec Logo" 
            width={180} 
            height={100} 
            priority
            className="h-auto w-auto max-h-25 object-contain" 
          />
          
          {/* Nombre y Leyenda debajo del logo */}
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
            {usuarioNombre
              .split(' ')
              .slice(0, 2)
              .map((p) => p[0])
              .join('')
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 truncate">{usuarioNombre}</p>
            <p className="text-[10px] text-emerald-700 font-semibold truncate">{usuarioRol}</p>
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