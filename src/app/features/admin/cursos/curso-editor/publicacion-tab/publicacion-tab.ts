import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
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

/** HU-015 — Valida integralmente un borrador y, si no hay bloqueos, lo publica (o lo pasa
 * directamente a EN_CURSO cuando es virtual sin fecha de inicio). */
@Component({
  selector: 'app-publicacion-tab',
  templateUrl: './publicacion-tab.html',
  styleUrl: './publicacion-tab.scss',
})
export class PublicacionTab implements OnChanges {
  @Input({ required: true }) cursoId!: number;
  @Input({ required: true }) estadoCodigo!: string;
  @Input({ required: true }) estadoNombre!: string;
  @Output() irAPestana = new EventEmitter<string>();
  @Output() publicado = new EventEmitter<void>();

  private readonly api = inject(CursoAdminApiService);
  private readonly alertas = inject(AlertaGlobalService);

  protected readonly cargando = signal(false);
  protected readonly publicando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resultado = signal<ValidacionPublicacionRespuesta | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
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
}
