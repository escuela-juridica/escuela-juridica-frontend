import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ReclamacionesAdminApiService } from '../reclamaciones-admin-api.service';
import { EstadoRespuesta, ReclamacionBandeja } from '../reclamaciones-admin.model';

const TAMANO_PAGINA = 20;

/**
 * HU-040 — PF-037: bandeja de quejas y reclamos. Los pendientes aparecen primero, del vencimiento más próximo al más
 * lejano; los próximos a vencer y los vencidos se resaltan pero siguen abiertos.
 */
@Component({
  selector: 'app-bandeja-reclamaciones',
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './bandeja-reclamaciones.html',
  styleUrl: './bandeja-reclamaciones.scss',
})
export class BandejaReclamaciones {
  private readonly api = inject(ReclamacionesAdminApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filas = signal<ReclamacionBandeja[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pagina = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly totalFilas = signal(0);

  protected texto = '';
  protected estado = 'PENDIENTE_RESPUESTA';
  protected tipo = '';

  constructor() {
    this.cargar();
  }

  protected buscar(): void {
    this.pagina.set(0);
    this.cargar();
  }

  protected limpiar(): void {
    this.texto = '';
    this.estado = 'PENDIENTE_RESPUESTA';
    this.tipo = '';
    this.buscar();
  }

  protected irAPagina(pagina: number): void {
    if (pagina < 0 || pagina >= this.totalPaginas()) return;
    this.pagina.set(pagina);
    this.cargar();
  }

  protected etiquetaRespuesta(estado: EstadoRespuesta): string {
    switch (estado) {
      case 'ENVIADO': return 'Enviada';
      case 'ERROR': return 'Falló el envío';
      case 'PENDIENTE': return 'Sin enviar';
      default: return 'Sin respuesta';
    }
  }

  protected textoPlazo(fila: ReclamacionBandeja): string {
    if (fila.plazo === 'VENCIDO') return 'Vencido';
    if (fila.diasHabilesRestantes === 0) return 'Vence hoy';
    return `${fila.diasHabilesRestantes} ${fila.diasHabilesRestantes === 1 ? 'día hábil' : 'días hábiles'}`;
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api.bandeja(this.texto.trim(), this.estado, this.tipo, this.pagina(), TAMANO_PAGINA).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => {
        this.filas.set(r.items);
        this.totalPaginas.set(r.totalPages);
        this.totalFilas.set(r.totalElements);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        const cuerpo = typeof e.error === 'object' && e.error !== null ? (e.error as { message?: string }) : null;
        this.error.set(cuerpo?.message ?? 'No pudimos cargar las quejas y reclamos. Inténtalo nuevamente.');
        this.cargando.set(false);
      },
    });
  }
}
