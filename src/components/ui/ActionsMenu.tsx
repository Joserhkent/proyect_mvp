'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionsMenuProps {
  children: React.ReactNode;
  label?: string;
}

/**
 * Botón "⋮" que abre un menú flotante con las acciones aplicables a una fila.
 * Se renderiza en un portal (document.body) posicionado en coordenadas fijas,
 * así el menú nunca queda recortado por el overflow-x-auto de la tabla.
 */
export function ActionsMenu({ children, label = 'Más acciones' }: ActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const menuWidth = 224;
      setCoords({
        top: rect.bottom + 6,
        left: Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8),
      });
    }

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const closeOnScroll = () => setOpen(false);

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', closeOnScroll, true);
    window.addEventListener('resize', closeOnScroll);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', closeOnScroll);
    };
  }, [open]);

  const items = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    const props = child.props as { onClick?: () => void };
    return React.cloneElement(child as React.ReactElement<{ onClick?: () => void }>, {
      onClick: () => {
        props.onClick?.();
        setOpen(false);
      },
    });
  });

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={label}
        aria-label={label}
        aria-expanded={open}
        className={cn(
          'p-1.5 rounded-lg transition-colors cursor-pointer',
          open ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        )}
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {open && coords &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: coords.top, left: coords.left }}
            className="z-50 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-100 origin-top-right"
          >
            {items}
          </div>,
          document.body
        )}
    </>
  );
}

interface ActionsMenuItemProps {
  icon: React.ElementType;
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
  title?: string;
}

export function ActionsMenuItem({
  icon: Icon,
  children,
  onClick,
  href,
  variant = 'default',
  disabled,
  title,
}: ActionsMenuItemProps) {
  const styles: Record<NonNullable<ActionsMenuItemProps['variant']>, string> = {
    default: 'text-slate-700 hover:bg-slate-50',
    primary: 'text-emerald-700 hover:bg-emerald-50',
    danger: 'text-rose-600 hover:bg-rose-50',
  };

  const className = cn(
    'w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium text-left transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
    styles[variant]
  );

  if (href) {
    return (
      <Link href={href} title={title} className={className} onClick={onClick}>
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1 truncate">{children}</span>
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={className}>
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 truncate">{children}</span>
    </button>
  );
}
