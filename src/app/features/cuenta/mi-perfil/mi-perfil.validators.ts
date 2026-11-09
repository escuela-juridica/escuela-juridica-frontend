import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const PATRON_NOMBRE = /^[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ '-]*$/;

export const nombrePropioValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const valor = String(control.value ?? '').trim();
  if (valor.length === 0) {
    return null;
  }
  return PATRON_NOMBRE.test(valor) ? null : { formato: true };
};

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

export const documentoOpcionalValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const valor = String(control.value ?? '').trim();
  if (valor.length === 0) {
    return null;
  }
  return /^\d{8}$/.test(valor) ? null : { formato: true };
};
