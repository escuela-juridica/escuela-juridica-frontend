import { Component, inject } from '@angular/core';

import { AlertaGlobalService } from '../../../core/notificaciones/alerta-global.service';

/** Presentación reutilizable de avisos globales, ubicada por cada pantalla donde corresponda. */
@Component({
  selector: 'app-alerta-global',
  templateUrl: './alerta-global.html',
  styleUrl: './alerta-global.scss',
})
export class AlertaGlobalComponent {
  protected readonly alertas = inject(AlertaGlobalService);
}
