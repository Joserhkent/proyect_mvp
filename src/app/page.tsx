'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    const password = String(formData.get('password') ?? '');

    if (!email || !password) {
      setError('Correo y contraseña requeridos');
      setLoading(false);
      return;
    }

    // Se inicia sesión con el MISMO cliente de Supabase del navegador que usa
    // el resto de la app (no una Server Action aparte): así su estado en
    // memoria queda sincronizado de inmediato, sin depender de una recarga
    // completa de la página para que se entere de la nueva sesión.
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      setError('Correo o contraseña incorrectos');
      setLoading(false);
      return;
    }

    const { data: usuarioBD } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', authData.user.id)
      .maybeSingle();

    const targetPath = usuarioBD?.rol === 'ADMIN' ? '/admin' : '/tecnico';
    router.push(targetPath);
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50 p-4 sm:p-6">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] rounded-[2.5rem] overflow-hidden shadow-2xl bg-white min-h-0 lg:min-h-[640px]">

        {/* Panel ilustrado con borde ondulado */}
        <div className="hidden lg:block relative overflow-hidden">
          <svg
            viewBox="0 0 600 800"
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fde9c8" />
                <stop offset="45%" stopColor="#d7ecd2" />
                <stop offset="100%" stopColor="#a7d7b8" />
              </linearGradient>
              <linearGradient id="montanaLejos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8fbfa0" />
                <stop offset="100%" stopColor="#6fa885" />
              </linearGradient>
              <linearGradient id="montanaCerca" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3d7a5c" />
                <stop offset="100%" stopColor="#245c40" />
              </linearGradient>
              <linearGradient id="campo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1f6b45" />
                <stop offset="100%" stopColor="#0f4a30" />
              </linearGradient>
            </defs>

            {/* Cielo */}
            <rect x="0" y="0" width="600" height="800" fill="url(#cielo)" />

            {/* Sol */}
            <circle cx="200" cy="230" r="90" fill="#ffe7a8" opacity="0.55" />
            <circle cx="200" cy="230" r="55" fill="#ffdd8a" opacity="0.8" />

            {/* Montañas lejanas */}
            <path
              d="M0,420 L90,320 L170,400 L260,290 L360,400 L460,330 L600,410 L600,800 L0,800 Z"
              fill="url(#montanaLejos)"
              opacity="0.8"
            />
            {/* Nieve en picos */}
            <path d="M240,300 L260,290 L282,308 L266,314 L260,304 L250,312 Z" fill="white" opacity="0.85" />

            {/* Montañas cercanas */}
            <path
              d="M0,480 L120,380 L220,470 L320,370 L420,470 L520,400 L600,470 L600,800 L0,800 Z"
              fill="url(#montanaCerca)"
            />

            {/* Campo cultivado ondulado */}
            <path
              d="M0,560 C120,520 180,610 300,570 C420,530 480,610 600,560 L600,800 L0,800 Z"
              fill="url(#campo)"
            />

            {/* Surcos de cultivo */}
            {[600, 630, 660, 690, 720, 750].map((y, i) => (
              <path
                key={y}
                d={`M-20,${y} C 130,${y - 22} 230,${y + 22} 380,${y} C 480,${y - 16} 550,${y + 12} 620,${y}`}
                stroke="#0b3a24"
                strokeWidth={3}
                fill="none"
                opacity={0.5 - i * 0.04}
              />
            ))}

            {/* Aspersores de riego automatizado (marca: automatización agrícola) */}
            {[
              [110, 600],
              [230, 575],
              [360, 610],
              [480, 585],
            ].map(([cx, cy], i) => (
              <g key={i} opacity={0.9}>
                <circle cx={cx} cy={cy} r="24" fill="#ffffff" opacity="0.08" />
                <circle cx={cx} cy={cy} r="4.5" fill="#eafff0" />
                <line x1={cx} y1={cy} x2={cx} y2={cy - 16} stroke="#eafff0" strokeWidth="2" />
                {[0, 45, 90, 135, 180, 225, 270, 315].map((ang) => {
                  const rad = (ang * Math.PI) / 180;
                  const x2 = (cx + Math.cos(rad) * 16).toFixed(2);
                  const y2 = (cy + Math.sin(rad) * 16).toFixed(2);
                  return (
                    <line
                      key={ang}
                      x1={cx}
                      y1={cy}
                      x2={x2}
                      y2={y2}
                      stroke="#eafff0"
                      strokeWidth="1.5"
                      opacity="0.7"
                    />
                  );
                })}
              </g>
            ))}
          </svg>

          {/* Borde ondulado que separa el panel ilustrado del formulario */}
          <svg
            viewBox="0 0 40 800"
            preserveAspectRatio="none"
            className="absolute top-0 right-0 h-full w-10"
          >
            <path
              d="M22,0 C4,90 36,180 22,270 C4,360 36,450 22,540 C4,630 36,720 22,800 L40,800 L40,0 Z"
              fill="white"
            />
          </svg>

          {/* Marca sobre la ilustración */}
          <div className="absolute top-8 left-8 z-10">
            <div className="inline-flex items-center bg-white/95 backdrop-blur-sm px-5 py-3.5 rounded-2xl shadow-md">
              <Image src="/logo.png" alt="Solftec" width={357} height={122} priority className="h-16 w-auto object-contain" />
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-emerald-950/50 to-transparent z-0" />

          <div className="absolute bottom-9 left-8 right-14 z-10">
            <h2 className="text-xl font-black text-white drop-shadow-md leading-snug">
              Automatización agrícola,<br />del campo al reporte.
            </h2>
          </div>
        </div>

        {/* Formulario */}
        <div className="p-8 sm:p-14 flex flex-col justify-center bg-white">
          <div className="flex lg:hidden justify-center mb-6">
            <Image src="/logo.png" alt="Solftec" width={220} height={120} priority className="h-auto w-auto max-h-20 object-contain" />
          </div>

          <h1 className="text-2xl font-black text-emerald-950 tracking-tight">
            ¡Hola! Bienvenido
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 mb-8">Nos alegra verte de nuevo por aquí.</p>

          {error && (
            <div className="w-full mb-5 flex items-center gap-2 bg-rose-50 text-rose-700 p-3 rounded-2xl text-sm border border-rose-100">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="text-xs font-bold text-slate-600 block mb-1.5 ml-1">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700/60" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="tucorreo@agrofertil.pe"
                  className="w-full pl-11 pr-4 py-3 text-sm rounded-full bg-emerald-50/70 border border-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="text-xs font-bold text-slate-600 block mb-1.5 ml-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700/60" />
                <input
                  id="password"
                  name="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 text-sm rounded-full bg-emerald-50/70 border border-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword((v) => !v)}
                  title={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-700 p-1 rounded-full transition-colors cursor-pointer"
                >
                  {mostrarPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              isLoading={loading}
              className="w-full mt-3 py-3 text-sm font-bold rounded-full shadow-lg shadow-emerald-600/20"
            >
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
