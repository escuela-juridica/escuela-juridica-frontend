import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AlertaGlobalService } from '../../../../core/notificaciones/alerta-global.service';
import { Modal } from '../../../../shared/ui/modal/modal';
import { CertificadosAdminApiService } from '../certificados-admin-api.service';
import { EmisionManualSituacion } from '../certificados-admin.model';

/** HU-035 — PF-034: situación del alumno, motivo y confirmación del impacto antes de emitir un certificado excepcional. */
@Component({
  selector: 'app-emision-manual',
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe, RouterLink, Modal],
  templateUrl: './emision-manual.html',
  styleUrl: './emision-manual.scss',
})
export class EmisionManual {
  private readonly api = inject(CertificadosAdminApiService);
  private readonly alertas = inject(AlertaGlobalService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly matriculaId = Number(inject(ActivatedRoute).snapshot.paramMap.get('matriculaId'));

  protected readonly situacion = signal<EmisionManualSituacion | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly confirmando = signal(false);
  protected readonly emitiendo = signal(false);
  protected readonly errorEmision = signal<string | null>(null);

  protected readonly formulario = new FormGroup({
    motivo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10), Validators.maxLength(1000)] }),
    fechaFinalizacion: new FormControl('', { nonNullable: true }),
    entiendo: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });

  constructor() {
    this.api
      .situacion(this.matriculaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => {
          this.situacion.set(s);
          this.cargando.set(false);
        },
        error: (e: HttpErrorResponse) => {
          this.error.set(this.mensaje(e) ?? 'No pudimos cargar la situación del alumno.');
          this.cargando.set(false);
        },
      });
  }

  protected necesitaFecha(s: EmisionManualSituacion): boolean {
    return s.fechaFinalizacion === null;
  }

  protected invalido(campo: 'motivo' | 'entiendo'): boolean {
    const c = this.formulario.controls[campo];
    return c.invalid && (c.touched || c.dirty);
  }

  protected pedirConfirmacion(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.errorEmision.set(null);
    this.confirmando.set(true);
  }

  protected cerrarConfirmacion(): void {
    if (!this.emitiendo()) this.confirmando.set(false);
  }

  protected emitir(): void {
    const s = this.situacion();
    if (!s || this.emitiendo()) return;
    const v = this.formulario.getRawValue();
    this.emitiendo.set(true);
    this.errorEmision.set(null);
    this.api
      .emitir(this.matriculaId, { motivo: v.motivo.trim(), fechaFinalizacion: this.necesitaFecha(s) && v.fechaFinalizacion ? v.fechaFinalizacion : null })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (actualizada) => {
          this.emitiendo.set(false);
          this.confirmando.set(false);
          this.situacion.set(actualizada);
          this.alertas.mostrar('exito', 'El certificado fue emitido y el alumno ya puede descargarlo.');
        },
        error: (e: HttpErrorResponse) => {
          this.emitiendo.set(false);
          this.errorEmision.set(this.mensaje(e) ?? 'No pudimos emitir el certificado.');
        },
      });
  }

  protected etiquetaEmision(tipo: string): string {
    return tipo === 'MANUAL' ? 'Manual administrativa' : tipo === 'SOLICITADA' ? 'Confirmada por el alumno' : 'Automática';
  }

  private mensaje(e: HttpErrorResponse): string | null {
    const cuerpo = typeof e.error === 'object' && e.error !== null ? (e.error as { message?: string }) : null;
    return cuerpo?.message ?? null;
  }
}
