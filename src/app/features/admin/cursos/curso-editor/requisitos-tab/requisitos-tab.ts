import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { CursoAdminApiService } from '../../curso-admin-api.service';
import { ModalidadCurso, ReglasCursoRespuesta } from '../../curso-admin.model';
import { AlertaGlobalService } from '../../../../../core/notificaciones/alerta-global.service';

/** HU-014 — Configura las condiciones académicas que se usarán posteriormente para certificar. */
@Component({
  selector: 'app-requisitos-tab',
  templateUrl: './requisitos-tab.html',
  styleUrl: './requisitos-tab.scss',
})
export class RequisitosTab implements OnChanges {
  @Input({ required: true }) cursoId!: number;
  @Input({ required: true }) modalidad!: ModalidadCurso | null;
  @Input() fechaInicio: string | null = null;
  @Input() fechaFin: string | null = null;
  @Output() guardado = new EventEmitter<void>();

  private readonly api = inject(CursoAdminApiService);
  private readonly alertas = inject(AlertaGlobalService);

  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly bloqueada = signal(false);
  protected readonly requiereExamenes = signal(true);
  protected readonly requiereProgreso = signal(true);
  protected readonly requiereAsistencia = signal(false);
  protected readonly notaMinima = signal('12');
  protected readonly notaRefrendado = signal('14');
  protected readonly progresoMinimo = signal('80');
  protected readonly umbralVideo = signal('50');
  protected readonly asistenciaMinima = signal('80');
  protected readonly secuenciaObligatoria = signal(true);
  protected readonly diasEspera = signal('0');
  protected readonly fechaCierre = signal('');
  // Última fecha realmente confirmada por el servidor; evita que una propuesta client-side
  // descartada (asistencia activada y luego desactivada sin guardar) se envíe como si fuera dato.
  private fechaCierreConfirmada = '';

  protected readonly requiereAsistenciaDisponible = () => this.modalidad !== 'VIRTUAL';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cursoId'] && this.cursoId) this.cargar();
  }

  protected proponerCierre(): void {
    if (this.requiereAsistencia() && !this.fechaCierre() && this.fechaInicio) this.fechaCierre.set(this.fechaInicio);
  }

  protected guardar(): void {
    this.error.set(null);
    const cuerpo = {
      requiereExamenes: this.requiereExamenes(),
      requiereProgreso: this.requiereProgreso(),
      requiereAsistencia: this.requiereAsistenciaDisponible() ? this.requiereAsistencia() : false,
      notaMinima: Number(this.notaMinima()), notaRefrendado: Number(this.notaRefrendado()),
      progresoMinimo: Number(this.progresoMinimo()), umbralVideo: Number(this.umbralVideo()),
      asistenciaMinima: Number(this.asistenciaMinima()), secuenciaObligatoria: this.secuenciaObligatoria(),
      diasEsperaCertificado: Number(this.diasEspera()),
      fechaCierreMatricula: this.requiereAsistenciaDisponible() && this.requiereAsistencia()
        ? (this.fechaCierre() || null)
        : (this.fechaCierreConfirmada || null),
    };
    this.guardando.set(true);
    this.api.actualizarReglas(this.cursoId, cuerpo).pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: (reglas) => { this.aplicar(reglas); this.alertas.mostrar('exito', 'Requisitos de certificación actualizados.'); this.guardado.emit(); },
      error: (e: HttpErrorResponse) => this.error.set(e.error?.message ?? 'No pudimos guardar los requisitos.'),
    });
  }

  private cargar(): void {
    this.cargando.set(true); this.error.set(null);
    this.api.obtenerReglas(this.cursoId).pipe(finalize(() => this.cargando.set(false))).subscribe({
      next: (reglas) => this.aplicar(reglas),
      error: (e: HttpErrorResponse) => this.error.set(e.error?.message ?? 'No pudimos cargar los requisitos.'),
    });
  }

  private aplicar(r: ReglasCursoRespuesta): void {
    this.requiereExamenes.set(r.requiereExamenes);
    this.requiereProgreso.set(r.requiereProgreso);
    this.requiereAsistencia.set(r.requiereAsistencia);
    this.notaMinima.set(String(r.notaMinima)); this.notaRefrendado.set(String(r.notaRefrendado));
    this.progresoMinimo.set(String(r.progresoMinimo)); this.umbralVideo.set(String(r.umbralVideo));
    this.asistenciaMinima.set(String(r.asistenciaMinima)); this.secuenciaObligatoria.set(r.secuenciaObligatoria);
    this.diasEspera.set(String(r.diasEsperaCertificado)); this.fechaCierre.set(r.fechaCierreMatricula ?? ''); this.bloqueada.set(r.bloqueada);
    this.fechaCierreConfirmada = r.fechaCierreMatricula ?? '';
    this.proponerCierre();
  }
}
