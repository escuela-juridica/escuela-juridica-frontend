import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AlertaGlobalService } from '../../../../../core/notificaciones/alerta-global.service';
import { Modal } from '../../../../../shared/ui/modal/modal';
import { CursoAdminApiService } from '../../curso-admin-api.service';
import { CancelacionAfectado, CancelacionCurso } from '../../curso-admin.model';

const TAMANO_PAGINA = 10;

/**
 * HU-038 — Cancelación completa de un curso (zona de riesgo de la pestaña Publicación). Antes de confirmar muestra el
 * impacto (alumnos, pagos en proceso, sesiones futuras); después de cancelar muestra a los afectados y el estado de
 * su aviso, con reintento de los fallidos. ESEJUR no devuelve dinero: los pagos se atienden en Excepciones de pago.
 */
@Component({
  selector: 'app-cancelacion-curso',
  imports: [ReactiveFormsModule, DatePipe, RouterLink, Modal],
  templateUrl: './cancelacion-curso.html',
  styleUrl: './cancelacion-curso.scss',
})
export class CancelacionCursoPanel implements OnChanges {
  @Input({ required: true }) cursoId!: number;
  @Input({ required: true }) estadoCodigo!: string;
  /** El editor debe refrescar el estado del curso tras cancelarlo. */
  @Output() actualizado = new EventEmitter<void>();

  private readonly api = inject(CursoAdminApiService);
  private readonly alertas = inject(AlertaGlobalService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly impacto = signal<CancelacionCurso | null>(null);
  protected readonly afectados = signal<CancelacionAfectado[]>([]);
  protected readonly pagina = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly totalAfectados = signal(0);
  protected readonly modalAbierto = signal(false);
  protected readonly cancelando = signal(false);
  protected readonly reintentando = signal(false);
  protected readonly errorModal = signal<string | null>(null);

  protected readonly formulario = new FormGroup({
    motivo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10), Validators.maxLength(2000)] }),
    confirmo: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cursoId'] || changes['estadoCodigo']) {
      this.cargarImpacto();
    }
  }

  protected abrir(): void {
    this.formulario.reset({ motivo: '', confirmo: false });
    this.errorModal.set(null);
    this.cargarImpacto();
    this.modalAbierto.set(true);
  }

  protected cerrar(): void {
    if (!this.cancelando()) this.modalAbierto.set(false);
  }

  protected invalido(campo: 'motivo' | 'confirmo'): boolean {
    const c = this.formulario.controls[campo];
    return c.invalid && (c.touched || c.dirty);
  }

  protected cancelar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    if (this.cancelando()) return;
    const v = this.formulario.getRawValue();
    this.cancelando.set(true);
    this.errorModal.set(null);
    this.api.cancelarCurso(this.cursoId, { motivo: v.motivo.trim(), confirmo: v.confirmo }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => {
        this.cancelando.set(false);
        this.modalAbierto.set(false);
        this.impacto.set(r);
        this.alertas.mostrar(r.avisosConError > 0 ? 'info' : 'exito',
          r.avisosConError > 0
            ? 'El curso quedó cancelado, pero algunos avisos no se pudieron enviar. Puedes reintentarlos.'
            : 'El curso quedó cancelado y los alumnos recibieron un aviso.');
        this.actualizado.emit();
      },
      error: (e: HttpErrorResponse) => {
        this.cancelando.set(false);
        this.errorModal.set(this.mensaje(e) ?? 'No pudimos cancelar el curso.');
      },
    });
  }

  protected reintentarAvisos(): void {
    if (this.reintentando()) return;
    this.reintentando.set(true);
    this.api.reenviarAvisosCancelacion(this.cursoId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => {
        this.reintentando.set(false);
        this.impacto.set(r);
        this.cargarAfectados();
        this.alertas.mostrar(r.avisosConError > 0 ? 'error' : 'exito',
          r.avisosConError > 0 ? 'Algunos avisos siguen sin enviarse.' : 'Todos los avisos fueron enviados.');
      },
      error: (e: HttpErrorResponse) => {
        this.reintentando.set(false);
        this.alertas.mostrar('error', this.mensaje(e) ?? 'No pudimos reintentar los avisos.');
      },
    });
  }

  protected irAPagina(pagina: number): void {
    if (pagina < 0 || pagina >= this.totalPaginas()) return;
    this.pagina.set(pagina);
    this.cargarAfectados();
  }

  private cargarImpacto(): void {
    if (!this.cursoId || !['PUBLICADO', 'EN_CURSO', 'CANCELADO'].includes(this.estadoCodigo)) {
      this.impacto.set(null);
      return;
    }
    this.api.impactoCancelacion(this.cursoId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => {
        this.impacto.set(r);
        if (r.estado === 'CANCELADO') {
          this.pagina.set(0);
          this.cargarAfectados();
        }
      },
      error: () => this.impacto.set(null),
    });
  }

  private cargarAfectados(): void {
    this.api.afectadosCancelacion(this.cursoId, this.pagina(), TAMANO_PAGINA).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => {
        this.afectados.set(r.items);
        this.totalPaginas.set(r.totalPages);
        this.totalAfectados.set(r.totalElements);
      },
      error: () => this.afectados.set([]),
    });
  }

  private mensaje(e: HttpErrorResponse): string | null {
    const cuerpo = typeof e.error === 'object' && e.error !== null
      ? (e.error as { message?: string; fieldErrors?: { message?: string }[] })
      : null;
    return cuerpo?.fieldErrors?.[0]?.message ?? cuerpo?.message ?? null;
  }
}
