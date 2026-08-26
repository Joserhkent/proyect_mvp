'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import { User, Lock } from 'lucide-react';
import { login } from '@/app/actions/auth';

export default function HomePage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await login(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900 p-4">
      <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-6">
        
        {/* LOGO */}
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="AgroERP Logo"
            width={350}
            height={350}
            priority
            className="h-auto w-auto"
          />
        </div>

        {/* MENSAJE DE ERROR */}
        {error && (
          <div className="w-full bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-100">
            {error}
          </div>
        )}

        {/* FORMULARIO */}
        <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>
          
          {/* INPUT: CORREO ELECTRONICO */}
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              name="email"
              type="email"
              required
              placeholder="Correo electrónico"
              className="w-full pl-9 pr-3 py-2 text-lg rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* INPUT: CONTRASEÑA */}
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              name="password"
              type="password"
              required
              placeholder="Contraseña"
              className="w-full pl-9 pr-3 py-2 text-lg rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* BOTÓN SUBMIT */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 text-lg font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

      </div>
    </div>
  );
}