import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AlertaGlobalService } from '../../../../core/notificaciones/alerta-global.service';
import { Modal } from '../../../../shared/ui/modal/modal';
import { CertificadosAdminApiService } from '../certificados-admin-api.service';
import { AccionHistorial, CertificadoDetalle } from '../certificados-admin.model';

interface Diferencia {
  campo: string;
  antes: string;
  despues: string;
}

/**
 * HU-036 — PF-034: corrige datos documentales (nombres, título, horas, entidad, firmantes) conservando el código y el
 * estado VIGENTE, o anula el certificado de forma irreversible. Muestra la comparación antes de confirmar y el
 * historial completo de cambios. La nota y el nivel congelados solo se muestran.
 */
@Component({
  selector: 'app-correccion-certificado',
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe, RouterLink, Modal],
  templateUrl: './correccion-certificado.html',
  styleUrl: './correccion-certificado.scss',
})
export class CorreccionCertificado {
  private readonly api = inject(CertificadosAdminApiService);
  private readonly alertas = inject(AlertaGlobalService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly certificadoId = Number(inject(ActivatedRoute).snapshot.paramMap.get('certificadoId'));

  protected readonly detalle = signal<CertificadoDetalle | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly firmantes = signal<number[]>([]);
  protected readonly modal = signal<'corregir' | 'anular' | null>(null);
  protected readonly diferencias = signal<Diferencia[]>([]);
  protected readonly enviando = signal(false);
  protected readonly errorModal = signal<string | null>(null);

  protected readonly formulario = new FormGroup({
    nombres: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(240)] }),
    titulo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(220)] }),
    horas: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0.5), Validators.max(9999)] }),
    entidad: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(220)] }),
    motivo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10), Validators.maxLength(2000)] }),
  });

  protected readonly formularioAnulacion = new FormGroup({
    motivo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10), Validators.maxLength(2000)] }),
    confirmo: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });

  constructor() {
    this.api
      .detalle(this.certificadoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => {
          this.aplicar(d);
          this.cargando.set(false);
        },
        error: (e: HttpErrorResponse) => {
          this.error.set(this.mensaje(e) ?? 'No pudimos cargar el certificado.');
          this.cargando.set(false);
        },
      });
  }

  protected invalido(grupo: FormGroup, campo: string): boolean {
    const c = grupo.get(campo);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  protected nombreFirmante(id: number): string {
    return this.detalle()?.firmantesDisponibles.find((f) => f.firmanteId === id)?.nombre ?? '';
  }

  protected posicion(id: number): number {
    return this.firmantes().indexOf(id) + 1;
  }

  protected alternarFirmante(id: number): void {
    this.firmantes.update((lista) => (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]));
  }

  protected revisarCorreccion(): void {
    const d = this.detalle();
    if (!d) return;
    if (this.formulario.invalid || this.firmantes().length === 0 || this.firmantes().length > 4) {
      this.formulario.markAllAsTouched();
      return;
    }
    const v = this.formulario.getRawValue();
    const lista: Diferencia[] = [];
    const comparar = (campo: string, antes: string, despues: string) => {
      if (antes !== despues) lista.push({ campo, antes, despues });
    };
    comparar('Nombres', d.nombres, v.nombres.trim());
    comparar('Título del curso', d.titulo, v.titulo.trim());
    comparar('Horas académicas', String(d.horas), String(v.horas));
    if (d.nivel === 'REFRENDADO') comparar('Entidad', d.entidad ?? '—', v.entidad.trim() || '—');
    comparar('Firmantes', d.firmantes.map((f) => f.nombre).join(', '), this.firmantes().map((id) => this.nombreFirmante(id)).join(', '));
    if (lista.length === 0) {
      this.errorModal.set(null);
      this.alertas.mostrar('info', 'No hay cambios: los datos son iguales a los vigentes.');
      return;
    }
    this.diferencias.set(lista);
    this.errorModal.set(null);
    this.modal.set('corregir');
  }

  protected abrirAnulacion(): void {
    this.errorModal.set(null);
    this.modal.set('anular');
  }

  protected cerrarModal(): void {
    if (!this.enviando()) this.modal.set(null);
  }

  protected confirmarCorreccion(): void {
    const v = this.formulario.getRawValue();
    this.enviar(
      this.api.corregir(this.certificadoId, {
        motivo: v.motivo.trim(),
        nombres: v.nombres.trim(),
        titulo: v.titulo.trim(),
        horas: v.horas,
        entidad: this.detalle()?.nivel === 'REFRENDADO' ? v.entidad.trim() || null : null,
        firmanteIds: this.firmantes(),
      }),
      'El certificado fue corregido y el PDF se regeneró con el mismo código.',
    );
  }

  protected confirmarAnulacion(): void {
    if (this.formularioAnulacion.invalid) {
      this.formularioAnulacion.markAllAsTouched();
      return;
    }
    const v = this.formularioAnulacion.getRawValue();
    this.enviar(
      this.api.anular(this.certificadoId, { motivo: v.motivo.trim(), confirmo: v.confirmo }),
      'El certificado fue anulado. Su código sigue informando que no es válido.',
    );
  }

  protected etiquetaAccion(accion: AccionHistorial): string {
    switch (accion) {
      case 'EMISION_MANUAL': return 'Emisión manual';
      case 'CORRECCION': return 'Corrección';
      default: return 'Anulación';
    }
  }

  protected etiquetaEmision(tipo: string): string {
    return tipo === 'MANUAL' ? 'Manual administrativa' : tipo === 'SOLICITADA' ? 'Confirmada por el alumno' : 'Automática programada';
  }

  private enviar(peticion: ReturnType<CertificadosAdminApiService['corregir']>, exito: string): void {
    if (this.enviando()) return;
    this.enviando.set(true);
    this.errorModal.set(null);
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (d) => {
        this.enviando.set(false);
        this.modal.set(null);
        this.formularioAnulacion.reset();
        this.aplicar(d);
        this.alertas.mostrar('exito', exito);
      },
      error: (e: HttpErrorResponse) => {
        this.enviando.set(false);
        this.errorModal.set(this.mensaje(e) ?? 'No pudimos completar la operación. Inténtalo nuevamente.');
      },
    });
  }

  private aplicar(d: CertificadoDetalle): void {
    this.detalle.set(d);
    this.firmantes.set(d.firmantes.map((f) => f.firmanteId));
    this.formulario.reset({ nombres: d.nombres, titulo: d.titulo, horas: d.horas, entidad: d.entidad ?? '', motivo: '' });
  }

  private mensaje(e: HttpErrorResponse): string | null {
    const cuerpo = typeof e.error === 'object' && e.error !== null
      ? (e.error as { message?: string; fieldErrors?: { message?: string }[] })
      : null;
    return cuerpo?.fieldErrors?.[0]?.message ?? cuerpo?.message ?? null;
  }
}
