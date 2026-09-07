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
  UserCog,
} from 'lucide-react';
import { useAgroErp } from '@/context/AgroErpContext';

export function AdminSidebar() {
  const pathname = usePathname();
  const { usuarioActual } = useAgroErp();

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
    { name: 'Usuarios', href: '/admin/usuarios', icon: UserCog },
  ];

  return (
    <aside className="w-64 bg-gradient-to-b from-emerald-950 to-[#051912] text-emerald-100 flex flex-col shrink-0 h-screen sticky top-0 shadow-xl">
      {/* Brand Header */}
      <div className="p-5">
        <Link href="/admin" className="flex flex-col items-center justify-center gap-1.5 text-center bg-white rounded-2xl px-4 py-4 shadow-inner">
          <Image
            src="/logo.png"
            alt="Solftec Logo"
            width={180}
            height={100}
            priority
            className="h-auto w-auto max-h-16 object-contain"
          />
        </Link>
        <p className="text-center text-[10px] text-lime-300/90 font-bold uppercase tracking-[0.15em] mt-3">
          Panel Administrativo
        </p>
      </div>

      {/* Nav list */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider">
          Módulos del Sistema
        </div>

        {menu.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                isActive
                  ? 'bg-lime-400 text-emerald-950 shadow-sm shadow-lime-400/30'
                  : 'text-emerald-200/80 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-950' : 'text-emerald-300/80 group-hover:text-lime-300'}`} />
              <span className="flex-1 truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer User Info */}
      <div className="p-4 mx-3 mb-3 rounded-2xl bg-white/5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-lime-400 flex items-center justify-center text-emerald-950 text-xs font-black shadow-inner shrink-0">
          {(usuarioActual.nombre || 'AD')
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase())
            .join('') || 'AD'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white truncate">
            {usuarioActual.nombre || 'Administrador'}
          </p>
          <p className="text-xs text-lime-300/90 font-semibold truncate">
            {!usuarioActual.id
              ? 'Administrador General'
              : usuarioActual.rol === 'ADMIN'
                ? 'Administrador General'
                : usuarioActual.rol}
          </p>
        </div>

        <Link
          href="/tecnico"
          title="Ver como técnico"
          className="p-1.5 text-emerald-300/70 hover:text-lime-300 hover:bg-white/10 rounded-lg text-xs shrink-0"
        >
          <Wrench className="w-4 h-4" />
        </Link>
      </div>
    </aside>
  );
}
