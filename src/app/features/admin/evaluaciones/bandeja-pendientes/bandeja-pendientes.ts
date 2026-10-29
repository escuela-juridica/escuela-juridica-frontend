import { DatePipe, LowerCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ReporteAcademicoApiService } from '../../reportes/reporte-academico/reporte-academico-api.service';
import { OpcionCursoReporte } from '../../reportes/reporte-academico/reporte-academico.model';
import { EvaluacionesApiService } from '../evaluaciones-api.service';
import { IntentoPendiente, PlazoRevision, ResumenBandeja } from '../evaluaciones.model';

/** HU-030 — Bandeja de intentos pendientes de revisión: ordenada por la fecha límite más cercana,
 * separa lo vencido y lo próximo a vencer. Paginada en el servidor. */
@Component({
  selector: 'app-bandeja-pendientes',
  imports: [FormsModule, DatePipe, LowerCasePipe, RouterLink],
  templateUrl: './bandeja-pendientes.html',
  styleUrl: './bandeja-pendientes.scss',
})
export class BandejaPendientes {
  private readonly api = inject(EvaluacionesApiService);
  private readonly cursosApi = inject(ReporteAcademicoApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filas = signal<IntentoPendiente[]>([]);
  protected readonly cursos = signal<OpcionCursoReporte[]>([]);
  protected readonly resumen = signal<ResumenBandeja | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pagina = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly totalFilas = signal(0);

  protected texto = '';
  protected cursoId: number | null = null;
  protected plazo = '';

  constructor() {
    this.cursosApi.cursos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (c) => this.cursos.set(c) });
    this.cargar();
  }

  protected buscar(): void {
    this.pagina.set(0);
    this.cargar();
  }

  protected filtrarPlazo(plazo: string): void {
    this.plazo = this.plazo === plazo ? '' : plazo;
    this.buscar();
  }

  protected limpiar(): void {
    this.texto = '';
    this.cursoId = null;
    this.plazo = '';
    this.buscar();
  }

  protected irAPagina(pagina: number): void {
    if (pagina < 0 || pagina >= this.totalPaginas()) return;
    this.pagina.set(pagina);
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api.resumen().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (r) => this.resumen.set(r) });
    this.api
      .bandeja({ texto: this.texto, cursoId: this.cursoId, plazo: this.plazo }, this.pagina(), 20)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.filas.set(r.items);
          this.totalPaginas.set(r.totalPages);
          this.totalFilas.set(r.totalElements);
          this.cargando.set(false);
        },
        error: (e: HttpErrorResponse) => {
          const cuerpo = typeof e.error === 'object' && e.error !== null ? (e.error as { message?: string }) : null;
          this.error.set(cuerpo?.message ?? 'No pudimos cargar la bandeja. Inténtalo nuevamente.');
          this.cargando.set(false);
        },
      });
  }

  protected clasePlazo(plazo: PlazoRevision): string {
    return plazo === 'VENCIDO' ? 'badge--disp-cancelado' : plazo === 'PROXIMO' ? 'badge--advertencia-suave' : 'badge--disp-proximo';
  }

  /** "Vence en 5 h" / "Vencido hace 2 días": lo que importa para decidir qué atender primero. */
  protected textoPlazo(fila: IntentoPendiente): string {
    const minutos = Math.abs(fila.minutosRestantes);
    const cantidad = minutos < 60 ? `${Math.max(minutos, 1)} min`
      : minutos < 60 * 24 ? `${Math.floor(minutos / 60)} h`
        : `${Math.floor(minutos / (60 * 24))} ${Math.floor(minutos / (60 * 24)) === 1 ? 'día' : 'días'}`;
    return fila.plazo === 'VENCIDO' ? `Vencido hace ${cantidad}` : `Vence en ${cantidad}`;
  }
}
