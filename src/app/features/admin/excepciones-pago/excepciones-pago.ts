import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { AlertaGlobalService } from '../../../core/notificaciones/alerta-global.service';
import { Modal } from '../../../shared/ui/modal/modal';
import { formatearPrecio } from '../../cursos/curso-formato.util';
import { ExcepcionesPagoApiService } from './excepciones-pago-api.service';
import { Excepcion, TipoExcepcion } from './excepciones-pago.model';

const TAMANO_PAGINA = 20;

/**
 * HU-037 — PF-035: excepciones de matrículas y pagos (sobrecupo y pagos aprobados tarde o tras una cancelación).
 * La Escuela consulta pago, matrícula, acceso y cupo por separado y registra la atención que brindó fuera de ESEJUR;
 * aquí nunca se modifica el resultado de Culqi, la matrícula ni el acceso, ni se devuelve dinero.
 */
@Component({
  selector: 'app-excepciones-pago',
  imports: [FormsModule, ReactiveFormsModule, DatePipe, Modal],
  templateUrl: './excepciones-pago.html',
  styleUrl: './excepciones-pago.scss',
})
export class ExcepcionesPago {
  private readonly api = inject(ExcepcionesPagoApiService);
  private readonly alertas = inject(AlertaGlobalService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly formatearPrecio = formatearPrecio;
  protected readonly filas = signal<Excepcion[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pagina = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly totalFilas = signal(0);

  protected readonly seleccionada = signal<Excepcion | null>(null);
  protected readonly cargandoDetalle = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorModal = signal<string | null>(null);

  protected texto = '';
  protected estado = 'PENDIENTE';
  protected tipo = '';

  protected readonly formulario = new FormGroup({
    resultado: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10), Validators.maxLength(2000)] }),
  });

  constructor() {
    this.cargar();
  }

  protected buscar(): void {
    this.pagina.set(0);
    this.cargar();
  }

  protected limpiar(): void {
    this.texto = '';
    this.estado = 'PENDIENTE';
    this.tipo = '';
    this.buscar();
  }

  protected irAPagina(pagina: number): void {
    if (pagina < 0 || pagina >= this.totalPaginas()) return;
    this.pagina.set(pagina);
    this.cargar();
  }

  protected revisar(fila: Excepcion): void {
    this.errorModal.set(null);
    this.formulario.reset({ resultado: '' });
    this.cargandoDetalle.set(true);
    this.seleccionada.set(fila);
    this.api.detalle(fila.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (d) => {
        this.seleccionada.set(d);
        this.cargandoDetalle.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.cargandoDetalle.set(false);
        this.errorModal.set(this.mensaje(e) ?? 'No pudimos cargar el detalle.');
      },
    });
  }

  protected cerrar(): void {
    if (!this.guardando()) this.seleccionada.set(null);
  }

  protected atender(): void {
    const excepcion = this.seleccionada();
    if (!excepcion || this.guardando()) return;
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.errorModal.set(null);
    this.api.atender(excepcion.id, this.formulario.getRawValue().resultado.trim()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (actualizada) => {
        this.guardando.set(false);
        this.seleccionada.set(actualizada);
        this.alertas.mostrar('exito', 'Registramos la atención. El pago y la matrícula no se modificaron.');
        this.cargar();
      },
      error: (e: HttpErrorResponse) => {
        this.guardando.set(false);
        this.errorModal.set(this.mensaje(e) ?? 'No pudimos registrar la atención.');
      },
    });
  }

  protected invalido(): boolean {
    const c = this.formulario.controls.resultado;
    return c.invalid && (c.touched || c.dirty);
  }

  protected etiquetaTipo(tipo: TipoExcepcion): string {
    switch (tipo) {
      case 'SOBRECUPO': return 'Sobrecupo';
      case 'PAGO_TARDIO': return 'Resultado tardío o contradictorio';
      case 'CURSO_CANCELADO': return 'Pago tras cancelar el curso';
      default: return 'Pago tras cancelar la matrícula';
    }
  }

  protected etiquetaMatricula(estado: string): string {
    switch (estado) {
      case 'ACTIVA': return 'Activa';
      case 'PENDIENTE_PAGO': return 'Pendiente de pago';
      case 'CANCELADA': return 'Cancelada';
      case 'VENCIDA': return 'Vencida';
      case 'FINALIZADA': return 'Finalizada';
      default: return estado;
    }
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api.listar(this.texto.trim(), this.estado, this.tipo, this.pagina(), TAMANO_PAGINA).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => {
        this.filas.set(r.items);
        this.totalPaginas.set(r.totalPages);
        this.totalFilas.set(r.totalElements);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(this.mensaje(e) ?? 'No pudimos cargar las excepciones. Inténtalo nuevamente.');
        this.cargando.set(false);
      },
    });
  }

  private mensaje(e: HttpErrorResponse): string | null {
    const cuerpo = typeof e.error === 'object' && e.error !== null
      ? (e.error as { message?: string; fieldErrors?: { message?: string }[] })
      : null;
    return cuerpo?.fieldErrors?.[0]?.message ?? cuerpo?.message ?? null;
  }
}
