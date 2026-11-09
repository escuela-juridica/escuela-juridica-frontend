import { CanDeactivateFn } from '@angular/router';

import { ExamenPantalla } from './examen-pantalla';

export const salidaDeExamenGuard: CanDeactivateFn<ExamenPantalla> = (componente) => componente.confirmarSalida();
