import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { CursoAdminApiService } from '../../curso-admin-api.service';
import { ErrorValidacionCurso, ValidacionPublicacionRespuesta } from '../../curso-admin.model';
import { ConfirmacionService } from '../../../../../core/dialogo/confirmacion.service';
import { AlertaGlobalService } from '../../../../../core/notificaciones/alerta-global.service';

interface GrupoHallazgos {
  seccion: string;
  etiqueta: string;
  pestanaDestino: string;
  items: ErrorValidacionCurso[];
}

const ETIQUETAS_SECCION: Record<string, string> = {
  INFORMACION: 'Información básica',
  FECHAS: 'Fechas',
  COMERCIAL: 'Precio y promoción',
  CONTENIDO: 'Contenido',
  SESIONES: 'Sesiones en vivo',
  EXAMENES: 'Exámenes',
  REGLAS: 'Requisitos de certificación',
  CERTIFICADO: 'Certificado',
  DOCENTES: 'Docentes',
};

// A qué pestaña del editor pertenece cada hallazgo, para el botón "Ir a corregir".
const PESTANA_POR_SECCION: Record<string, string> = {
  INFORMACION: 'informacion',
  FECHAS: 'informacion',
  COMERCIAL: 'informacion',
  CERTIFICADO: 'informacion',
  DOCENTES: 'informacion',
  CONTENIDO: 'contenido',
  SESIONES: 'sesiones',
  EXAMENES: 'examenes',
  REGLAS: 'certificacion',
};

/** HU-015 — Valida un borrador y, si no hay bloqueos, lo publica (o lo pasa directamente a
 * EN_CURSO cuando es virtual sin fecha de inicio). HU-016 — Una vez publicado, administra el resto
 * del ciclo de vida: adelantar/retrasar el inicio, cerrar anticipadamente, destacar y duplicar
 * como una nueva convocatoria. CANCELADO no se ofrece aquí (HU-038, EP06). */
@Component({
  selector: 'app-publicacion-tab',
  templateUrl: './publicacion-tab.html',
  styleUrl: './publicacion-tab.scss',
})
export class PublicacionTab implements OnChanges {
  @Input({ required: true }) cursoId!: number;
  @Input({ required: true }) estadoCodigo!: string;
  @Input({ required: true }) estadoNombre!: string;
  @Input() destacado = false;
  @Input() tieneMatriculas = false;
  @Input() fechaInicio: string | null = null;
  @Input() fechaFin: string | null = null;
  @Output() irAPestana = new EventEmitter<string>();
  @Output() publicado = new EventEmitter<void>();
  // HU-016: cualquier acción de ciclo de vida que cambie el curso (adelantar, retrasar, cerrar,
  // destacar) — el editor debe refrescar estadoCodigo/fechas igual que tras publicar.
  @Output() actualizado = new EventEmitter<void>();

  private readonly api = inject(CursoAdminApiService);
  private readonly alertas = inject(AlertaGlobalService);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(false);
  protected readonly publicando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resultado = signal<ValidacionPublicacionRespuesta | null>(null);

  protected readonly destacadoLocal = signal(false);
  protected readonly actualizandoDestacado = signal(false);
  protected readonly adelantando = signal(false);
  protected readonly retrasando = signal(false);
  protected readonly cerrando = signal(false);
  protected readonly duplicando = signal(false);
  protected readonly fechaRetraso = signal('');
  protected readonly motivoCierre = signal('');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['destacado']) {
      this.destacadoLocal.set(this.destacado);
    }
    if (changes['cursoId'] && this.cursoId && this.estadoCodigo === 'BORRADOR') {
      this.validar();
    }
  }

  protected grupos(): GrupoHallazgos[] {
    const hallazgos = this.resultado()?.hallazgos ?? [];
    const mapa = new Map<string, ErrorValidacionCurso[]>();
    for (const h of hallazgos) {
      const lista = mapa.get(h.seccion) ?? [];
      lista.push(h);
      mapa.set(h.seccion, lista);
    }
    return Array.from(mapa.entries()).map(([seccion, items]) => ({
      seccion,
      etiqueta: ETIQUETAS_SECCION[seccion] ?? seccion,
      pestanaDestino: PESTANA_POR_SECCION[seccion] ?? 'informacion',
      items,
    }));
  }

  protected hayErrores(): boolean {
    return (this.resultado()?.hallazgos ?? []).some((h) => h.severidad === 'ERROR');
  }

  protected hayAdvertencias(): boolean {
    return (this.resultado()?.hallazgos ?? []).some((h) => h.severidad === 'ADVERTENCIA');
  }

  protected validar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api
      .validarPublicacion(this.cursoId)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (r) => this.resultado.set(r),
        error: (e: HttpErrorResponse) => this.error.set(e.error?.message ?? 'No pudimos validar el curso.'),
      });
  }

  protected publicar(): void {
    this.publicando.set(true);
    this.error.set(null);
    this.api
      .publicar(this.cursoId)
      .pipe(finalize(() => this.publicando.set(false)))
      .subscribe({
        next: (r) => {
          this.resultado.set(r);
          if (r.publicacionRealizada) {
            this.alertas.mostrar('exito', 'Curso publicado.');
            this.publicado.emit();
          } else {
            this.alertas.mostrar('error', 'Aún hay pendientes antes de publicar.');
          }
        },
        error: (e: HttpErrorResponse) => this.error.set(e.error?.message ?? 'No pudimos publicar el curso.'),
      });
  }

  protected irA(pestana: string): void {
    this.irAPestana.emit(pestana);
  }

  // Mismo mapeo que CursosListado.claseEstado, para que el badge se vea igual en todo el admin.
  protected claseEstado(estadoCodigo: string): string {
    switch (estadoCodigo) {
      case 'BORRADOR': return 'badge--disp-proximo';
      case 'PUBLICADO': return 'badge--disp-inmediato';
      case 'EN_CURSO': return 'badge--disp-inmediato';
      case 'CERRADO': return 'badge--disp-cerrado';
      case 'CANCELADO': return 'badge--disp-cerrado';
      default: return 'badge--disp-cerrado';
    }
  }

  // El backend exige una fecha estrictamente posterior a la actual; el mínimo del selector debe
  // ser el día siguiente, no el mismo día (que el backend rechazaría con un 400 confuso).
  protected minFechaRetraso(): string {
    if (!this.fechaInicio) {
      return '';
    }
    const fecha = new Date(this.fechaInicio + 'T00:00:00');
    fecha.setDate(fecha.getDate() + 1);
    return fecha.toISOString().slice(0, 10);
  }

  protected toggleDestacado(): void {
    const nuevo = !this.destacadoLocal();
    this.actualizandoDestacado.set(true);
    this.api
      .cambiarDestacado(this.cursoId, { destacado: nuevo })
      .pipe(finalize(() => this.actualizandoDestacado.set(false)))
      .subscribe({
        next: () => {
          this.destacadoLocal.set(nuevo);
          this.alertas.mostrar('exito', nuevo ? 'Curso destacado.' : 'Curso ya no está destacado.');
          this.actualizado.emit();
        },
        error: (e: HttpErrorResponse) => this.alertas.mostrar('error', e.error?.message ?? 'No pudimos actualizar el destacado.'),
      });
  }

  protected async adelantarInicio(): Promise<void> {
    const confirmado = await this.confirmacion.preguntar({
      titulo: 'Adelantar inicio',
      mensaje: 'El curso pasará a EN CURSO de inmediato y no podrá volver a PUBLICADO. ¿Continuar?',
      textoConfirmar: 'Adelantar inicio',
      variante: 'peligro',
    });
    if (!confirmado) {
      return;
    }
    this.adelantando.set(true);
    this.api
      .adelantarInicio(this.cursoId)
      .pipe(finalize(() => this.adelantando.set(false)))
      .subscribe({
        next: () => {
          this.alertas.mostrar('exito', 'El curso ya está en curso.');
          this.actualizado.emit();
        },
        error: (e: HttpErrorResponse) => this.alertas.mostrar('error', e.error?.message ?? 'No pudimos adelantar el inicio.'),
      });
  }

  protected retrasarInicio(): void {
    const nuevaFecha = this.fechaRetraso();
    if (!nuevaFecha) {
      this.alertas.mostrar('error', 'Elige la nueva fecha de inicio.');
      return;
    }
    this.retrasando.set(true);
    this.api
      .retrasarInicio(this.cursoId, { nuevaFechaInicio: nuevaFecha })
      .pipe(finalize(() => this.retrasando.set(false)))
      .subscribe({
        next: () => {
          this.alertas.mostrar('exito', 'Fecha de inicio actualizada.');
          this.fechaRetraso.set('');
          this.actualizado.emit();
        },
        error: (e: HttpErrorResponse) => this.alertas.mostrar('error', e.error?.message ?? 'No pudimos retrasar el inicio.'),
      });
  }

  protected async cerrar(): Promise<void> {
    const confirmado = await this.confirmacion.preguntar({
      titulo: 'Cerrar curso',
      mensaje: 'El curso se cerrará y dejará de ofrecerse para nuevas matrículas. Quienes ya cursan conservan su acceso. ¿Continuar?',
      textoConfirmar: 'Cerrar curso',
      variante: 'peligro',
    });
    if (!confirmado) {
      return;
    }
    this.cerrando.set(true);
    this.api
      .cerrar(this.cursoId, { motivo: this.motivoCierre().trim() || null })
      .pipe(finalize(() => this.cerrando.set(false)))
      .subscribe({
        next: () => {
          this.alertas.mostrar('exito', 'Curso cerrado.');
          this.motivoCierre.set('');
          this.actualizado.emit();
        },
        error: (e: HttpErrorResponse) => this.alertas.mostrar('error', e.error?.message ?? 'No pudimos cerrar el curso.'),
      });
  }

  protected async duplicar(): Promise<void> {
    const confirmado = await this.confirmacion.preguntar({
      titulo: 'Duplicar como nueva convocatoria',
      mensaje: 'Se creará un curso nuevo en borrador con la misma información, contenido, exámenes, reglas y '
        + 'docentes. No se copian matrículas, pagos, progreso, intentos, asistencia ni certificados. '
        + 'Deberás revisar fechas, precio y cupo antes de publicarlo. ¿Continuar?',
      textoConfirmar: 'Duplicar',
    });
    if (!confirmado) {
      return;
    }
    this.duplicando.set(true);
    this.api
      .duplicar(this.cursoId)
      .pipe(finalize(() => this.duplicando.set(false)))
      .subscribe({
        next: (nuevo) => {
          this.alertas.mostrar('exito', 'Curso duplicado. Revisa fechas, precio y cupo antes de publicarlo.');
          this.router.navigate(['/admin/cursos', nuevo.id]);
        },
        error: (e: HttpErrorResponse) => this.alertas.mostrar('error', e.error?.message ?? 'No pudimos duplicar el curso.'),
      });
  }
}
