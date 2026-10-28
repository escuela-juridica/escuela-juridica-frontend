import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { Modal } from '../../../../../shared/ui/modal/modal';
import { AlertaGlobalService } from '../../../../../core/notificaciones/alerta-global.service';
import { ContenidoApiService } from '../../contenido/contenido-api.service';
import { LeccionRespuesta } from '../../contenido/contenido.model';

/** HU-027 — Cancelar una sesión en vivo futura. Acción definitiva e irreversible; solo pide el
 * motivo. Siempre se usa dentro de un @if en curso-editor, así que no necesita su propio
 * interruptor de visibilidad: mientras está montado, el modal está abierto. */
@Component({
  selector: 'app-modal-cancelar-sesion',
  imports: [Modal],
  templateUrl: './modal-cancelar.html',
  styleUrl: './modal-cancelar.scss',
})
export class ModalCancelarSesion {
  @Input({ required: true }) leccion!: LeccionRespuesta;
  @Output() cerrado = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<void>();

  private readonly api = inject(ContenidoApiService);
  private readonly alertasGlobales = inject(AlertaGlobalService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly motivo = signal('');
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected guardar(): void {
    if (this.guardando()) {
      return;
    }
    const motivo = this.motivo().trim();
    if (!motivo) {
      this.error.set('Ingresa el motivo de la cancelación.');
      return;
    }
    this.error.set(null);
    this.guardando.set(true);
    this.api
      .cancelarSesion(this.leccion.id, { motivo })
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.alertasGlobales.mostrar('exito', 'Sesión cancelada.');
          this.guardado.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.error.set(this.mensajeError(error) ?? 'No pudimos cancelar la sesión.');
        },
      });
  }

  private mensajeError(error: HttpErrorResponse): string | null {
    const cuerpo = typeof error.error === 'object' && error.error !== null ? (error.error as { message?: string }) : null;
    return cuerpo?.message ?? null;
  }
}
