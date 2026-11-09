import { Component, HostListener, inject } from '@angular/core';

import { ConfirmacionService } from '../../../core/dialogo/confirmacion.service';

@Component({
  selector: 'app-confirmacion-dialog',
  templateUrl: './confirmacion-dialog.html',
  styleUrl: './confirmacion-dialog.scss',
})
export class ConfirmacionDialog {
  private readonly servicio = inject(ConfirmacionService);
  protected readonly solicitud = this.servicio.solicitud;

  @HostListener('document:keydown.escape', ['$event'])
  protected alEscape(evento: Event): void {
    if (this.solicitud()) {
      evento.stopImmediatePropagation();
      this.cancelar();
    }
  }

  protected confirmar(): void {
    this.servicio.responder(true);
  }

  protected cancelar(): void {
    this.servicio.responder(false);
  }
}
