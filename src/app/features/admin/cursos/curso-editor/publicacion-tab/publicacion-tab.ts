import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { CursoAdminApiService } from '../../curso-admin-api.service';
import { ErrorValidacionCurso, ValidacionPublicacionRespuesta } from '../../curso-admin.model';
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

  protected adelantarInicio(): void {
    if (!confirm('El curso pasará a EN CURSO de inmediato y no podrá volver a PUBLICADO. ¿Continuar?')) {
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

  protected cerrar(): void {
    if (!confirm('El curso se cerrará y dejará de ofrecerse para nuevas matrículas. Quienes ya cursan conservan su acceso. ¿Continuar?')) {
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

  protected duplicar(): void {
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
