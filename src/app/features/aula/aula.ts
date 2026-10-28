import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, afterRenderEffect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';

import { AlertaGlobalService } from '../../core/notificaciones/alerta-global.service';
import { formatearFechaHora, formatearHora } from '../cursos/curso-formato.util';
import { SesionAlumnoApiService } from '../sesiones/sesion-alumno-api.service';
import { AulaApiService } from './aula-api.service';
import { AulaRespuesta, LeccionAulaRespuesta } from './aula.model';

interface ErrorApiAula {
  code?: string;
  message?: string;
}

/** HU-022 — Ingresar y continuar un curso. Pantalla inmersiva (sin layout-alumno): mini-encabezado
 * propio con logo, "Volver a mis cursos" y barra de progreso del curso. */
@Component({
  selector: 'app-aula',
  imports: [RouterLink],
  templateUrl: './aula.html',
  styleUrl: './aula.scss',
})
export class Aula implements OnInit {
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly aulaApi = inject(AulaApiService);
  private readonly sesionAlumnoApi = inject(SesionAlumnoApiService);
  private readonly alertas = inject(AlertaGlobalService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly cargando = signal(true);
  protected readonly errorMensaje = signal<string | null>(null);
  protected readonly datos = signal<AulaRespuesta | null>(null);
  protected readonly ingresandoLeccionId = signal<number | null>(null);
  private cursoId = 0;

  private yaEnfocado = false;

  constructor() {
    // Al llegar la primera carga de datos, resalta y hace scroll a la última lección válida
    // (punto natural de "Continuar"). Se corre tras el render para que el elemento ya exista.
    afterRenderEffect(() => {
      const datos = this.datos();
      if (datos && !this.yaEnfocado) {
        this.yaEnfocado = true;
        this.enfocarLeccionActual(datos.ultimaLeccionIdValida);
      }
    });
  }

  ngOnInit(): void {
    this.ruta.paramMap
      .pipe(
        map((parametros) => Number(parametros.get('cursoId'))),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((cursoId) => this.cargar(cursoId));
  }

  protected cargar(cursoId: number): void {
    this.cursoId = cursoId;
    this.cargando.set(true);
    this.errorMensaje.set(null);
    this.yaEnfocado = false;
    this.aulaApi
      .temario(cursoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.datos.set(respuesta);
          this.cargando.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMensaje.set(this.mensajeError(error) ?? 'No pudimos abrir el aula de este curso.');
          this.cargando.set(false);
        },
      });
  }

  protected ingresar(leccion: LeccionAulaRespuesta): void {
    if (this.ingresandoLeccionId() !== null) return;
    this.ingresandoLeccionId.set(leccion.id);
    this.sesionAlumnoApi
      .ingresar(leccion.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.ingresandoLeccionId.set(null);
          window.open(respuesta.enlaceReunion, '_blank');
        },
        error: (error: HttpErrorResponse) => {
          this.ingresandoLeccionId.set(null);
          this.alertas.mostrar('error', this.mensajeError(error) ?? 'No pudimos ingresar a la sesión.');
        },
      });
  }

  protected irALeccion(leccionId: number): void {
    this.router.navigate(['/aula', this.cursoId, 'lecciones', leccionId]);
  }

  protected rangoFechaHora(inicio: string, fin: string | null): string {
    const inicioTexto = formatearFechaHora(inicio);
    return fin ? `${inicioTexto} – ${formatearHora(fin)}` : inicioTexto;
  }

  private enfocarLeccionActual(leccionId: number | null): void {
    if (leccionId == null) return;
    const elemento = document.getElementById(`leccion-${leccionId}`);
    elemento?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  private mensajeError(error: HttpErrorResponse): string | null {
    const cuerpo = typeof error.error === 'object' && error.error !== null ? (error.error as ErrorApiAula) : null;
    return cuerpo?.message ?? null;
  }
}
