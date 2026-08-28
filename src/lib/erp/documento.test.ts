import { describe, it, expect } from 'vitest';
import { validarDocumento } from './documento';

describe('validarDocumento', () => {
  it('acepta un DNI válido de 8 dígitos', () => {
    expect(validarDocumento('DNI', '45678901')).toBeNull();
  });

  it('rechaza un DNI con menos de 8 dígitos', () => {
    expect(validarDocumento('DNI', '4567890')).toMatch(/8 dígitos/);
  });

  it('rechaza un DNI con caracteres no numéricos', () => {
    expect(validarDocumento('DNI', '4567890a')).toMatch(/8 dígitos/);
  });

  it('rechaza un DNI que en realidad tiene 11 dígitos (formato RUC)', () => {
    expect(validarDocumento('DNI', '20608912345')).toMatch(/8 dígitos/);
  });

  it('acepta un RUC válido de 11 dígitos con prefijo correcto', () => {
    expect(validarDocumento('RUC', '20608912345')).toBeNull();
    expect(validarDocumento('RUC', '10456789012')).toBeNull();
  });

  it('rechaza un RUC con menos de 11 dígitos (formato DNI)', () => {
    expect(validarDocumento('RUC', '45678901')).toMatch(/11 dígitos/);
  });

  it('rechaza un RUC con prefijo inválido', () => {
    expect(validarDocumento('RUC', '99608912345')).toMatch(/10, 15, 17 o 20/);
  });

  it('rechaza un documento vacío', () => {
    expect(validarDocumento('DNI', '')).toMatch(/Ingresa/);
    expect(validarDocumento('DNI', '   ')).toMatch(/Ingresa/);
  });
});
