import { FormControl, FormGroup } from '@angular/forms';

import { contrasenasCoincidenValidator, politicaContrasenaValidator } from './registro.validators';

describe('validadores de registro', () => {
  describe('politicaContrasenaValidator', () => {
    it('acepta letras españolas y rechaza más de 72 bytes UTF-8', () => {
      expect(politicaContrasenaValidator(new FormControl('Ñandú123'))).toBeNull();
      const errores = politicaContrasenaValidator(new FormControl('Á'.repeat(35) + 'bc123'));
      expect(errores?.['maximoBytes']).toBe(true);
    });
    it('acepta una contraseña que cumple todas las reglas', () => {
      expect(politicaContrasenaValidator(new FormControl('Clave123'))).toBeNull();
    });

    it('informa cada condición pendiente', () => {
      const errores = politicaContrasenaValidator(new FormControl('abc'));

      expect(errores?.['longitud']).toBe(true);
      expect(errores?.['mayuscula']).toBe(true);
      expect(errores?.['numero']).toBe(true);
      expect(errores?.['minuscula']).toBeUndefined();
    });

    it.each([
      ['longitud', 'Cla1'],
      ['mayuscula', 'clave123'],
      ['minuscula', 'CLAVE123'],
      ['numero', 'Claveabc'],
    ])('rechaza una contraseña que incumple %s', (regla, valor) => {
      const errores = politicaContrasenaValidator(new FormControl(valor));

      expect(errores?.[regla]).toBe(true);
    });
  });

  describe('contrasenasCoincidenValidator', () => {
    it('acepta dos contraseñas iguales', () => {
      const grupo = new FormGroup({
        contrasena: new FormControl('Clave123'),
        confirmarContrasena: new FormControl('Clave123'),
      });

      expect(contrasenasCoincidenValidator(grupo)).toBeNull();
    });

    it('rechaza dos contraseñas diferentes', () => {
      const grupo = new FormGroup({
        contrasena: new FormControl('Clave123'),
        confirmarContrasena: new FormControl('Distinta123'),
      });

      expect(contrasenasCoincidenValidator(grupo)).toEqual({ contrasenasDiferentes: true });
    });
  });
});
