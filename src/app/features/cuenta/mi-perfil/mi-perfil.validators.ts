import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Mayúsculas únicamente: el control fuerza el valor a mayúsculas mientras se escribe
// (igual que en el registro), para que coincida con el formato de los documentos de identidad.
const PATRON_NOMBRE = /^[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ '-]*$/;

/** Solo letras mayúsculas (con tildes/Ñ), espacios, apóstrofe y guion. Vacío es válido: lo exige `required` aparte. */
export const nombrePropioValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const valor = String(control.value ?? '').trim();
  if (valor.length === 0) {
    return null;
  }
  return PATRON_NOMBRE.test(valor) ? null : { formato: true };
};

/** Entre 6 y 9 dígitos, ignorando espacios o guiones usados como separador. */
export const telefonoOpcionalValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const valor = String(control.value ?? '').trim();
  if (valor.length === 0) {
    return null;
  }
  const soloDigitos = valor.replace(/[\s-]/g, '');
  return /^\d{6,9}$/.test(soloDigitos) ? null : { formato: true };
};

/** DNI de 8 dígitos. */
export const documentoOpcionalValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const valor = String(control.value ?? '').trim();
  if (valor.length === 0) {
    return null;
  }
  return /^\d{8}$/.test(valor) ? null : { formato: true };
};
