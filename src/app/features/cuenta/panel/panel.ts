import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Session } from '../../../core/session/session';
import { MatriculaApiService } from '../../matriculas/matricula-api.service';
import { AlertaGlobalService } from '../../../core/notificaciones/alerta-global.service';

const ETIQUETAS_INGRESO: Record<string, string> = {
  GRATUITA: 'Gratuita',
  ADMINISTRADOR: 'Asignación manual',
  REGISTRADO_MANUAL: 'Pago manual registrado',
  PAGO_EN_LINEA: 'Pago en línea',
  EXONERADA: 'Exonerada',
  EXONERADO: 'Exonerada',
};

interface CursoActivo {
  id: number;
  imagenUrl: string;
  tipo: string;
  categoria: string;
  nombre: string;
  porcentajeProgreso: number;
  leccionesCompletadas: number;
  totalLecciones: number;
  siguienteLeccionNombre: string;
  fechaFinalizacion: string | null;
  accesoEfectivo: boolean;
  fechaInicio: string | null;
  estadoNotificacion: string | null;
  /** HU-047: compra iniciada que Culqi todavía no aprobó. */
  pagoPendiente: boolean;
  /** HU-038: el curso fue cancelado por la Escuela. */
  cursoCancelado: boolean;
  urlAmigable: string;
}

@Component({
  selector: 'app-panel',
  imports: [RouterLink, DatePipe],
  templateUrl: './panel.html',
  styleUrl: './panel.scss',
})
export class Panel {
  private readonly session = inject(Session);
  private readonly matriculasApi = inject(MatriculaApiService);
  private readonly alertas = inject(AlertaGlobalService);
  private readonly destroyRef = inject(DestroyRef);

  readonly usuario = this.session.usuario;
  readonly cursosActivos = signal<CursoActivo[]>([]);
  readonly cargando = signal(true);
  readonly error = signal(false);
  readonly reenviando = signal<number | null>(null);
  readonly pestana = signal<'EN_PROGRESO' | 'COMPLETADOS'>('EN_PROGRESO');
  readonly cursosVisibles = computed(() => this.cursosActivos().filter((curso) =>
    this.pestana() === 'COMPLETADOS' ? curso.fechaFinalizacion !== null : curso.fechaFinalizacion === null,
  ));

  constructor() { this.cargar(); }

  protected get primerNombre(): string {
    return this.usuario()?.nombreCompleto?.trim().split(/\s+/)[0] ?? '';
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.matriculasApi.misCursos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (matriculas) => {
        this.cursosActivos.set(matriculas.map((matricula) => ({
          id: matricula.cursoId,
          imagenUrl: matricula.imagenPortadaUrl ?? '',
          tipo: matricula.modalidad,
          categoria: ETIQUETAS_INGRESO[matricula.formaIngreso] ?? matricula.formaIngreso,
          nombre: matricula.cursoTitulo,
          porcentajeProgreso: matricula.porcentajeProgreso,
          leccionesCompletadas: matricula.leccionesCompletadas,
          totalLecciones: matricula.totalLecciones,
          siguienteLeccionNombre: matricula.accesoEfectivo ? matricula.siguienteLeccion : matricula.mensajeAcceso,
          fechaFinalizacion: matricula.fechaFinalizacion,
          accesoEfectivo: matricula.accesoEfectivo,
          fechaInicio: matricula.fechaInicio,
          estadoNotificacion: matricula.estadoNotificacion,
          pagoPendiente: matricula.estado === 'PENDIENTE_PAGO',
          cursoCancelado: matricula.cursoCancelado,
          urlAmigable: matricula.cursoUrlAmigable,
        })));
        this.cargando.set(false);
      },
      error: () => { this.error.set(true); this.cargando.set(false); },
    });
  }

  protected reenviarConfirmacion(matriculaId: number): void {
    this.reenviando.set(matriculaId);
    this.matriculasApi.reenviarConfirmacion(matriculaId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (resultado) => {
        this.reenviando.set(null);
        this.alertas.mostrar(resultado.enviado ? 'exito' : 'error', resultado.mensaje);
        if (resultado.enviado) this.cargar();
      },
      error: () => {
        this.reenviando.set(null);
        this.alertas.mostrar('error', 'No pudimos reenviar la confirmación.');
      },
    });
  }

  protected seleccionarPestana(pestana: 'EN_PROGRESO' | 'COMPLETADOS'): void { this.pestana.set(pestana); }
}
