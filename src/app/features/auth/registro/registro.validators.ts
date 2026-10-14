import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const politicaContrasenaValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const valor = String(control.value ?? '');
  const errores: ValidationErrors = {};

  if (new TextEncoder().encode(valor).length > 72) {
    errores['maximoBytes'] = true;
  }

  if (valor.length < 8) {
    errores['longitud'] = true;
  }

  if (!/\p{Uppercase}/u.test(valor)) {
    errores['mayuscula'] = true;
  }

  if (!/\p{Lowercase}/u.test(valor)) {
    errores['minuscula'] = true;
  }

  if (!/\p{Nd}/u.test(valor)) {
    errores['numero'] = true;
  }

  return Object.keys(errores).length > 0 ? errores : null;
};

export const contrasenasCoincidenValidator: ValidatorFn = (
  grupo: AbstractControl,
): ValidationErrors | null => {
  const contrasena = grupo.get('contrasena')?.value;
  const confirmacion = grupo.get('confirmarContrasena')?.value;

  return contrasena === confirmacion ? null : { contrasenasDiferentes: true };
};
