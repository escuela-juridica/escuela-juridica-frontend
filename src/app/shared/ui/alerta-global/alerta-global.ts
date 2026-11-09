import { Component, inject } from '@angular/core';

import { AlertaGlobalService } from '../../../core/notificaciones/alerta-global.service';

@Component({
  selector: 'app-alerta-global',
  templateUrl: './alerta-global.html',
  styleUrl: './alerta-global.scss',
})
export class AlertaGlobalComponent {
  protected readonly alertas = inject(AlertaGlobalService);
}
