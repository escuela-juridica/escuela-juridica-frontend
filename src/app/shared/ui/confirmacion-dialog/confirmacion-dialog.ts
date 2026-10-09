import { Component, HostListener, inject } from '@angular/core';

import { ConfirmacionService } from '../../../core/dialogo/confirmacion.service';

/** Se monta una sola vez en la raíz de la app (app.html); renderiza la pregunta pendiente en
 * {@link ConfirmacionService.solicitud}, si hay alguna. Nunca se usa directamente en un template de
 * feature — para pedir confirmación, inyecta ConfirmacionService y llama a `preguntar(...)`.
 * Tiene su propia caja compacta y centrada (no usa app-modal): un diálogo de confirmación es un
 * patrón distinto al de un formulario largo. */
@Component({
  selector: 'app-confirmacion-dialog',
  templateUrl: './confirmacion-dialog.html',
  styleUrl: './confirmacion-dialog.scss',
})
export class ConfirmacionDialog {
  private readonly servicio = inject(ConfirmacionService);
  protected readonly solicitud = this.servicio.solicitud;

  @HostListener('document:keydown.escape')
  protected alEscape(): void {
    if (this.solicitud()) {
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
