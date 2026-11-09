import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { resolverUrlApi } from '../../../../core/api/api.config';
import { AlertaGlobalService } from '../../../../core/notificaciones/alerta-global.service';
import { CabeceraDetalle, EnlaceVolver } from '../../../../shared/ui/cabecera-detalle/cabecera-detalle';
import { Modal } from '../../../../shared/ui/modal/modal';
import { CertificadosAdminApiService } from '../certificados-admin-api.service';
import { EmisionManualSituacion } from '../certificados-admin.model';

@Component({
  selector: 'app-emision-manual',
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe, RouterLink, Modal, CabeceraDetalle, EnlaceVolver],
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
  protected readonly nombreConfirmacion = signal('');
  protected readonly intentoEmitir = signal(false);

  protected readonly formulario = new FormGroup({
    motivo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10), Validators.maxLength(1000)] }),
    fechaFinalizacion: new FormControl('', { nonNullable: true }),
    nombres: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(240)] }),
    entiendo: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });

  constructor() {
    this.api
      .situacion(this.matriculaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => {
          this.situacion.set(s);
          if (this.confirmaAdministracion(s)) this.formulario.controls.nombres.setValue(s.nombresConfirmados ?? s.alumno);
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

  protected esReemision(s: EmisionManualSituacion): boolean {
    return s.certificado?.estado === 'ANULADO';
  }

  protected confirmaAdministracion(s: EmisionManualSituacion): boolean {
    return !s.datosConfirmados || this.esReemision(s);
  }

  protected nombresAImprimir(s: EmisionManualSituacion): string {
    return this.confirmaAdministracion(s) ? this.formulario.controls.nombres.value.trim().replace(/\s+/g, ' ') : (s.nombresConfirmados ?? s.alumno);
  }

  protected exigeNombre(s: EmisionManualSituacion): boolean {
    return !s.cumpleTodo;
  }

  protected coincideNombre(s: EmisionManualSituacion): boolean {
    const normalizar = (texto: string) => texto.trim().replace(/\s+/g, ' ').toLowerCase();
    return normalizar(this.nombreConfirmacion()) === normalizar(s.alumno);
  }

  protected invalido(campo: 'motivo'): boolean {
    const c = this.formulario.controls[campo];
    return c.invalid && (c.touched || c.dirty);
  }

  protected pedirConfirmacion(): void {
    if (this.formulario.controls.entiendo.invalid) return;
    this.errorEmision.set(null);
    this.intentoEmitir.set(false);
    this.nombreConfirmacion.set('');
    this.confirmando.set(true);
  }

  protected cerrarConfirmacion(): void {
    if (!this.emitiendo()) this.confirmando.set(false);
  }

  protected emitir(): void {
    const s = this.situacion();
    if (!s || this.emitiendo()) return;
    this.intentoEmitir.set(true);
    this.formulario.controls.motivo.markAsTouched();
    if (this.formulario.controls.motivo.invalid) return;
    if (this.confirmaAdministracion(s) && (this.formulario.controls.nombres.invalid || !this.nombresAImprimir(s))) return;
    if (this.exigeNombre(s) && !this.coincideNombre(s)) return;
    const v = this.formulario.getRawValue();
    this.emitiendo.set(true);
    this.errorEmision.set(null);
    this.api
      .emitir(this.matriculaId, {
        motivo: v.motivo.trim(),
        fechaFinalizacion: this.necesitaFecha(s) && v.fechaFinalizacion ? v.fechaFinalizacion : null,
        nombres: this.confirmaAdministracion(s) ? this.nombresAImprimir(s) : null,
      })
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

  protected verCertificado(codigo: string): void {
    window.open(`${resolverUrlApi(`/api/app/certificados/${encodeURIComponent(codigo)}/descargar`)}?enLinea=true`, '_blank');
  }

  protected etiquetaEmision(tipo: string): string {
    return tipo === 'MANUAL' ? 'Manual administrativa' : tipo === 'SOLICITADA' ? 'Confirmada por el alumno' : 'Automática';
  }

  private mensaje(e: HttpErrorResponse): string | null {
    const cuerpo = typeof e.error === 'object' && e.error !== null ? (e.error as { message?: string }) : null;
    return cuerpo?.message ?? null;
  }
}
