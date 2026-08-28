import { TipoDoc } from '@/types/db';

const DNI_REGEX = /^\d{8}$/;
const RUC_PREFIJO_REGEX = /^(10|15|17|20)\d{9}$/;

/**
 * Valida el formato de un número de documento según el tipo seleccionado.
 * Devuelve un mensaje de error si es inválido, o `null` si es válido.
 */
export function validarDocumento(tipoDoc: TipoDoc, numDoc: string): string | null {
  const limpio = numDoc.trim();

  if (!limpio) return 'Ingresa un número de documento.';

  if (tipoDoc === 'DNI') {
    if (!DNI_REGEX.test(limpio)) return 'El DNI debe tener 8 dígitos numéricos.';
    return null;
  }

  if (tipoDoc === 'RUC') {
    if (!/^\d{11}$/.test(limpio)) return 'El RUC debe tener 11 dígitos numéricos.';
    if (!RUC_PREFIJO_REGEX.test(limpio)) return 'El RUC debe comenzar con 10, 15, 17 o 20.';
    return null;
  }

  return 'Tipo de documento no soportado.';
}
