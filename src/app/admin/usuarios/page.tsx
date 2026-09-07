'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Users, Plus, Loader2, Mail, Phone, AtSign } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { listarUsuarios, crearTecnico } from '@/lib/services/usuarios';
import type { Usuario } from '@/types/erp';

const FORM_INICIAL = {
  nombre: '',
  username: '',
  email: '',
  telefono: '',
  password: '',
  confirmarPassword: '',
};

export default function AdminUsuariosPage() {
  const { showToast } = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const cargarUsuarios = useCallback(async () => {
    setLoading(true);
    const data = await listarUsuarios();
    setUsuarios(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => cargarUsuarios(), 0);
    return () => clearTimeout(timer);
  }, [cargarUsuarios]);

  function abrirModal() {
    setForm(FORM_INICIAL);
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmarPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setSubmitting(true);
    const resultado = await crearTecnico({
      nombre: form.nombre,
      email: form.email,
      password: form.password,
      username: form.username || undefined,
      telefono: form.telefono || undefined,
    });
    setSubmitting(false);

    if (!resultado.success) {
      setError(resultado.error ?? 'No se pudo crear el técnico');
      return;
    }

    showToast('success', `Técnico "${form.nombre}" creado correctamente`);
    setModalOpen(false);
    cargarUsuarios();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Usuarios del Sistema
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administradores y técnicos de campo con acceso a la plataforma.
          </p>
        </div>
        <Button onClick={abrirModal}>
          <Plus className="w-4 h-4" />
          Nuevo Técnico
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-4">Nombre / Usuario</th>
                <th className="p-4">Contacto</th>
                <th className="p-4">Rol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>Cargando usuarios...</span>
                    </div>
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={3}>
                    <EmptyState
                      icon={Users}
                      title="No hay usuarios registrados"
                      description="Crea el primer técnico para poder asignarle órdenes de trabajo."
                    />
                  </td>
                </tr>
              ) : (
                usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <span className="font-bold text-slate-900 block">{u.nombre}</span>
                      {u.username && (
                        <span className="text-[11px] text-slate-500 font-mono">@{u.username}</span>
                      )}
                    </td>
                    <td className="p-4 space-y-1">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{u.email}</span>
                      </div>
                      {u.telefono && (
                        <div className="flex items-center gap-2 text-slate-500 text-[12px]">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{u.telefono}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={u.rol} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear Técnico */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        title="Nuevo Técnico"
        description="Crea un acceso para un técnico de campo. Podrá iniciar sesión de inmediato."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Nombre completo *</label>
            <input
              type="text"
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Juan Quispe"
              className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Usuario (opcional)</label>
            <div className="relative">
              <AtSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="jquispe"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Correo electrónico *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="tecnico@agrofertil.pe"
              className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono (opcional)</label>
            <input
              type="tel"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              placeholder="+51 999 999 999"
              className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Contraseña *</label>
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Confirmar *</label>
              <input
                type="password"
                required
                minLength={6}
                value={form.confirmarPassword}
                onChange={(e) => setForm({ ...form, confirmarPassword: e.target.value })}
                placeholder="Repite la contraseña"
                className="w-full px-3 py-2 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={submitting}>
              Crear Técnico
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
