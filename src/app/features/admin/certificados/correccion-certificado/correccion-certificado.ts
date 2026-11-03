import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { resolverUrlApi } from '../../../../core/api/api.config';
import { AlertaGlobalService } from '../../../../core/notificaciones/alerta-global.service';
import { CabeceraDetalle, EnlaceVolver } from '../../../../shared/ui/cabecera-detalle/cabecera-detalle';
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
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe, Modal, CabeceraDetalle, EnlaceVolver],
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
  /**
   * editar: formulario de corrección · corregir: confirmación con el antes/después · anular: advertencia y motivo de la
   * anulación · confirmarAnulacion: segundo paso, escribir el nombre del alumno y aceptar.
   */
  protected readonly modal = signal<'editar' | 'corregir' | 'anular' | 'confirmarAnulacion' | null>(null);
  protected readonly diferencias = signal<Diferencia[]>([]);
  protected readonly enviando = signal(false);
  protected readonly previsualizando = signal(false);
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
    // Confirmación al estilo GitHub: hay que escribir el nombre completo del alumno para habilitar la anulación.
    nombre: new FormControl('', { nonNullable: true }),
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

  /** Todo lo que se imprime es válido (el motivo no cuenta: solo hace falta para guardar). */
  private datosImpresosValidos(): boolean {
    const c = this.formulario.controls;
    const n = this.firmantes().length;
    return c.nombres.valid && c.titulo.valid && c.horas.valid && c.entidad.valid
      && c.nombres.value.trim().length > 0 && c.titulo.value.trim().length > 0 && n >= 1 && n <= 4;
  }

  /** Abre el certificado vigente tal como lo ve el alumno (el PDF se regenera si faltara en el servidor). */
  protected verCertificado(d: CertificadoDetalle): void {
    window.open(`${resolverUrlApi(`/api/app/certificados/${encodeURIComponent(d.codigo)}/descargar`)}?enLinea=true`, '_blank');
  }

  /** Dibuja el PDF de borrador con lo escrito en el formulario, sin guardar nada, y lo abre en otra pestaña. */
  protected previsualizar(): void {
    if (this.previsualizando() || this.enviando()) return;
    if (!this.datosImpresosValidos()) {
      this.formulario.markAllAsTouched();
      this.errorModal.set('Completa correctamente los nombres, el título, las horas y entre 1 y 4 firmantes para ver la vista previa.');
      return;
    }
    const v = this.formulario.getRawValue();
    this.errorModal.set(null);
    this.previsualizando.set(true);
    const ventana = window.open('', '_blank');
    this.api
      .vistaPrevia(this.certificadoId, {
        nombres: v.nombres.trim(),
        titulo: v.titulo.trim(),
        horas: v.horas,
        entidad: this.detalle()?.nivel === 'REFRENDADO' ? v.entidad.trim() || null : null,
        firmanteIds: this.firmantes(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          this.previsualizando.set(false);
          const url = URL.createObjectURL(blob);
          if (ventana) ventana.location.href = url;
          else window.open(url, '_blank');
          setTimeout(() => URL.revokeObjectURL(url), 60_000);
        },
        error: async (e: HttpErrorResponse) => {
          ventana?.close();
          this.previsualizando.set(false);
          this.errorModal.set((await this.mensajeDeBlob(e)) ?? 'No pudimos generar la vista previa. Inténtalo nuevamente.');
        },
      });
  }

  /** Con `responseType: 'blob'` el cuerpo del error también llega como Blob: se lee para mostrar el mensaje del servidor. */
  private async mensajeDeBlob(e: HttpErrorResponse): Promise<string | null> {
    if (!(e.error instanceof Blob)) return this.mensaje(e);
    try {
      const cuerpo = JSON.parse(await e.error.text()) as { message?: string; fieldErrors?: { message?: string }[] };
      return cuerpo.fieldErrors?.[0]?.message ?? cuerpo.message ?? null;
    } catch {
      return null;
    }
  }

  protected revisarCorreccion(): void {
    const d = this.detalle();
    if (!d) return;
    if (!this.datosImpresosValidos()) {
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
    if (this.formulario.controls.motivo.invalid) {
      this.formulario.controls.motivo.markAsTouched();
      return;
    }
    this.diferencias.set(lista);
    this.errorModal.set(null);
    this.modal.set('corregir');
  }

  protected abrirEdicion(): void {
    this.errorModal.set(null);
    this.modal.set('editar');
  }

  /** Desde la confirmación se vuelve al formulario con lo ya escrito, sin perder los cambios. */
  protected volverAEdicion(): void {
    if (this.enviando()) return;
    this.errorModal.set(null);
    this.modal.set('editar');
  }

  protected abrirAnulacion(): void {
    this.errorModal.set(null);
    this.modal.set('anular');
  }

  /** Paso 1 → 2: con el motivo escrito se pasa a la confirmación escribiendo el nombre. */
  protected pedirConfirmacionAnulacion(): void {
    const motivo = this.formularioAnulacion.controls.motivo;
    if (motivo.invalid) {
      motivo.markAsTouched();
      return;
    }
    this.errorModal.set(null);
    this.formularioAnulacion.controls.nombre.reset('');
    this.modal.set('confirmarAnulacion');
  }

  /** Desde la confirmación se vuelve al motivo sin perderlo. */
  protected volverAlMotivo(): void {
    if (this.enviando()) return;
    this.errorModal.set(null);
    this.modal.set('anular');
  }

  protected cerrarModal(): void {
    if (this.enviando()) return;
    // Cerrar el formulario sin confirmar descarta lo escrito: vuelve a los datos vigentes.
    if (this.modal() === 'editar') this.restaurarFormulario();
    if (this.modal() === 'anular' || this.modal() === 'confirmarAnulacion') this.formularioAnulacion.reset();
    this.modal.set(null);
  }

  private restaurarFormulario(): void {
    const d = this.detalle();
    if (!d) return;
    this.firmantes.set(d.firmantes.map((f) => f.firmanteId));
    this.formulario.reset({ nombres: d.nombres, titulo: d.titulo, horas: d.horas, entidad: d.entidad ?? '', motivo: '' });
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

  /** El texto escrito coincide con el nombre del alumno (sin importar mayúsculas ni espacios de más). */
  protected coincideNombre(): boolean {
    const objetivo = this.normalizarNombre(this.detalle()?.alumno ?? '');
    return objetivo.length > 0 && this.normalizarNombre(this.formularioAnulacion.controls.nombre.value) === objetivo;
  }

  private normalizarNombre(texto: string): string {
    return texto.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  protected confirmarAnulacion(): void {
    if (this.formularioAnulacion.invalid || !this.coincideNombre()) {
      this.formularioAnulacion.markAllAsTouched();
      return;
    }
    const v = this.formularioAnulacion.getRawValue();
    this.enviar(
      this.api.anular(this.certificadoId, { motivo: v.motivo.trim(), confirmo: true }),
      'El certificado fue anulado. Su código sigue informando que no es válido.',
    );
  }

  /** Si la emisión fue manual ya consta como un cambio del historial: no se repite el hito de emisión. */
  protected hayEmisionManual(d: CertificadoDetalle): boolean {
    return d.historial.some((c) => c.accion === 'EMISION_MANUAL');
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
