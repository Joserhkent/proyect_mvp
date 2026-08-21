import { NextResponse } from 'next/server';

// Known agricultural companies / IDs dictionary for high-fidelity instant demo
const MOCK_SUNAT_DATABASE: Record<string, { razon_social: string; direccion: string; estado: string; condicion: string; departamento: string; provincia: string; distrito: string }> = {
  '20608912345': {
    razon_social: 'AGRÍCOLA DEL SUR S.A.C.',
    direccion: 'Fundo San José Lote 14, Valle de Chincha, Ica',
    estado: 'ACTIVO',
    condicion: 'HABIDO',
    departamento: 'Ica',
    provincia: 'Chincha',
    distrito: 'Chincha Baja',
  },
  '20509876123': {
    razon_social: 'CAMPOS DE VIRÚ AGROEXPORT S.A.',
    direccion: 'Av. Panamericana Norte Km 520, Virú, La Libertad',
    estado: 'ACTIVO',
    condicion: 'HABIDO',
    departamento: 'La Libertad',
    provincia: 'Virú',
    distrito: 'Virú',
  },
  '20100055237': {
    razon_social: 'AGROKASA - SOCIEDAD AGRÍCOLA DROKASA S.A.',
    direccion: 'Fundo Santa Rita Km 300, Subtanjalla, Ica',
    estado: 'ACTIVO',
    condicion: 'HABIDO',
    departamento: 'Ica',
    provincia: 'Ica',
    distrito: 'Subtanjalla',
  },
  '20330611023': {
    razon_social: 'DANPER TRUJILLO S.A.C.',
    direccion: 'Carretera Industrial a Laredo Km 0.5, Trujillo, La Libertad',
    estado: 'ACTIVO',
    condicion: 'HABIDO',
    departamento: 'La Libertad',
    provincia: 'Trujillo',
    distrito: 'Moche',
  },
  '45892104': {
    razon_social: 'RODRÍGUEZ HUAMÁN JORGE LUIS',
    direccion: 'Calle Los Olivos Mz B Lt 4, Huaral, Lima',
    estado: 'ACTIVO',
    condicion: 'HABIDO',
    departamento: 'Lima',
    provincia: 'Huaral',
    distrito: 'Huaral',
  },
  '71234567': {
    razon_social: 'QUISPE FLORES MIGUEL ÁNGEL',
    direccion: 'Av. Municipalidad 230, Cañete, Lima',
    estado: 'ACTIVO',
    condicion: 'HABIDO',
    departamento: 'Lima',
    provincia: 'Cañete',
    distrito: 'San Vicente de Cañete',
  },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const numero = searchParams.get('numero')?.trim() || '';
  const tipo = searchParams.get('tipo')?.toUpperCase() || (numero.length === 11 ? 'RUC' : 'DNI');

  if (!numero) {
    return NextResponse.json({ error: 'Debe ingresar un número de documento' }, { status: 400 });
  }

  // Validate format
  if (tipo === 'RUC' && !/^(10|20|15|17)\d{9}$/.test(numero)) {
    return NextResponse.json(
      { error: 'El RUC debe comenzar con 10 o 20 y tener exactamente 11 dígitos numéricos.' },
      { status: 400 }
    );
  }

  if (tipo === 'DNI' && !/^\d{8}$/.test(numero)) {
    return NextResponse.json(
      { error: 'El DNI debe tener exactamente 8 dígitos numéricos.' },
      { status: 400 }
    );
  }

  // Check mock database
  if (MOCK_SUNAT_DATABASE[numero]) {
    const data = MOCK_SUNAT_DATABASE[numero];
    return NextResponse.json({
      success: true,
      tipo_doc: tipo,
      num_doc: numero,
      ...data,
      origen: 'SUNAT_API_VALIDEZ',
    });
  }

  // Fallback for any other valid 11 or 8 digits
  const fallbackNames = [
    'AGROPECUARIA & RIEGO SANTA MARÍA S.A.C.',
    'FUNDOS DEL NORTE PERÚ E.I.R.L.',
    'EXPORTACIONES AGRÍCOLAS DEL PACÍFICO S.A.',
    'CORPORACIÓN AGROTECNOLÓGICA DE ICA S.A.C.',
    'PRODUCTORES Y REGANTES DEL VALLE VERDE S.A.C.',
  ];

  const randomName = tipo === 'RUC' 
    ? fallbackNames[Math.floor(Math.random() * fallbackNames.length)]
    : `PRODUCTOR AGRÍCOLA (DNI ${numero})`;

  return NextResponse.json({
    success: true,
    tipo_doc: tipo,
    num_doc: numero,
    razon_social: randomName,
    direccion: 'Carretera Central Km 45, Sector Agrícola, Lima',
    estado: 'ACTIVO',
    condicion: 'HABIDO',
    departamento: 'Lima',
    provincia: 'Huarochirí',
    distrito: 'Santa Eulalia',
    origen: 'SUNAT_API_SIMULADA',
  });
}
