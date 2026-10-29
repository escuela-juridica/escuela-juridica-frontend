import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnDestroy, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AlertaGlobalService } from '../../../../core/notificaciones/alerta-global.service';
import { Modal } from '../../../../shared/ui/modal/modal';
import { formatearPrecio } from '../../../cursos/curso-formato.util';
import { ReclamacionesAdminApiService } from '../reclamaciones-admin-api.service';
import { ReclamacionDetalle } from '../reclamaciones-admin.model';

/**
 * HU-040 — PF-038: expediente de una queja o reclamo y su respuesta. La respuesta se conserva antes de enviarse y no se
 * edita; solo un correo enviado correctamente pasa el caso a RESPONDIDO. Si el envío falla, el caso sigue pendiente y
 * se puede reenviar la misma respuesta (con el correo corregido si hace falta) sin duplicar nada.
 */
@Component({
  selector: 'app-detalle-reclamacion',
  imports: [ReactiveFormsModule, DatePipe, RouterLink, Modal],
  templateUrl: './detalle-reclamacion.html',
  styleUrl: './detalle-reclamacion.scss',
})
export class DetalleReclamacion implements OnDestroy {
  private readonly api = inject(ReclamacionesAdminApiService);
  private readonly alertas = inject(AlertaGlobalService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));

  protected readonly formatearPrecio = formatearPrecio;
  protected readonly detalle = signal<ReclamacionDetalle | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly imagenes = signal<Record<number, string>>({});
  protected readonly confirmando = signal(false);
  protected readonly enviando = signal(false);
  protected readonly errorEnvio = signal<string | null>(null);

  protected readonly formulario = new FormGroup({
    respuesta: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(20), Validators.maxLength(5000)] }),
  });

  protected readonly formularioReenvio = new FormGroup({
    correo: new FormControl('', { nonNullable: true, validators: [Validators.email, Validators.maxLength(254)] }),
  });

  constructor() {
    this.api.detalle(this.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (d) => {
        this.aplicar(d);
        this.cargando.set(false);
        d.adjuntos.forEach((a) => this.cargarImagen(a.id));
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(this.mensaje(e) ?? 'No pudimos cargar el caso.');
        this.cargando.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    Object.values(this.imagenes()).forEach((url) => URL.revokeObjectURL(url));
  }

  protected invalidoRespuesta(): boolean {
    const c = this.formulario.controls.respuesta;
    return c.invalid && (c.touched || c.dirty);
  }

  protected pedirConfirmacion(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.errorEnvio.set(null);
    this.confirmando.set(true);
  }

  protected cerrarConfirmacion(): void {
    if (!this.enviando()) this.confirmando.set(false);
  }

  protected responder(): void {
    if (this.enviando()) return;
    this.enviando.set(true);
    this.errorEnvio.set(null);
    this.api.responder(this.id, this.formulario.getRawValue().respuesta.trim()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (d) => {
        this.enviando.set(false);
        this.confirmando.set(false);
        this.aplicar(d);
        this.avisarResultado(d);
      },
      error: (e: HttpErrorResponse) => {
        this.enviando.set(false);
        this.errorEnvio.set(this.mensaje(e) ?? 'No pudimos registrar la respuesta.');
      },
    });
  }

  protected reenviar(): void {
    if (this.enviando() || this.formularioReenvio.invalid) {
      this.formularioReenvio.markAllAsTouched();
      return;
    }
    const d = this.detalle();
    const correo = this.formularioReenvio.getRawValue().correo.trim();
    this.enviando.set(true);
    this.errorEnvio.set(null);
    this.api
      .reenviar(this.id, d?.estado === 'PENDIENTE_RESPUESTA' && correo ? correo : null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (actualizado) => {
          this.enviando.set(false);
          this.aplicar(actualizado);
          this.avisarResultado(actualizado);
        },
        error: (e: HttpErrorResponse) => {
          this.enviando.set(false);
          this.errorEnvio.set(this.mensaje(e) ?? 'No pudimos reenviar la respuesta.');
        },
      });
  }

  protected abrirImagen(adjuntoId: number): void {
    const url = this.imagenes()[adjuntoId];
    if (url) window.open(url, '_blank');
  }

  protected tamano(bytes: number): string {
    return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  protected textoPlazo(d: ReclamacionDetalle): string {
    if (d.plazo === 'VENCIDO') return 'Plazo vencido: el caso sigue abierto y se puede responder';
    if (d.diasHabilesRestantes === 0) return 'Vence hoy';
    return `Quedan ${d.diasHabilesRestantes} ${d.diasHabilesRestantes === 1 ? 'día hábil' : 'días hábiles'}`;
  }

  private avisarResultado(d: ReclamacionDetalle): void {
    if (d.estado === 'RESPONDIDO') {
      this.alertas.mostrar('exito', 'La respuesta se envió por correo y el caso quedó respondido.');
    } else {
      this.alertas.mostrar('error', 'No pudimos enviar el correo. La respuesta se conservó y el caso sigue pendiente: puedes reenviarla.');
    }
  }

  private aplicar(d: ReclamacionDetalle): void {
    this.detalle.set(d);
    this.formularioReenvio.reset({ correo: d.respuesta?.correoDestino ?? d.correo });
  }

  private cargarImagen(adjuntoId: number): void {
    this.api.adjunto(this.id, adjuntoId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (blob) => this.imagenes.update((m) => ({ ...m, [adjuntoId]: URL.createObjectURL(blob) })),
      error: () => undefined,
    });
  }

  private mensaje(e: HttpErrorResponse): string | null {
    const cuerpo = typeof e.error === 'object' && e.error !== null
      ? (e.error as { message?: string; fieldErrors?: { message?: string }[] })
      : null;
    return cuerpo?.fieldErrors?.[0]?.message ?? cuerpo?.message ?? null;
  }
}
