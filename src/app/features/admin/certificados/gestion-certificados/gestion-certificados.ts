import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CertificadosAdminApiService } from '../certificados-admin-api.service';
import { CertificadoGestion } from '../certificados-admin.model';

const TAMANO_PAGINA = 20;

/** HU-035/HU-036 — PF-033: matrículas con la situación de su certificado; desde aquí se emite uno manual. */
@Component({
  selector: 'app-gestion-certificados',
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './gestion-certificados.html',
  styleUrl: './gestion-certificados.scss',
})
export class GestionCertificados {
  private readonly api = inject(CertificadosAdminApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filas = signal<CertificadoGestion[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pagina = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly totalFilas = signal(0);

  protected texto = '';
  protected estado = '';

  constructor() {
    this.cargar();
  }

  protected buscar(): void {
    this.pagina.set(0);
    this.cargar();
  }

  protected limpiar(): void {
    this.texto = '';
    this.estado = '';
    this.buscar();
  }

  protected irAPagina(pagina: number): void {
    if (pagina < 0 || pagina >= this.totalPaginas()) return;
    this.pagina.set(pagina);
    this.cargar();
  }

  protected etiquetaMatricula(estado: string): string {
    switch (estado) {
      case 'ACTIVA': return 'Activa';
      case 'VENCIDA': return 'Vencida';
      case 'CANCELADA': return 'Cancelada';
      case 'FINALIZADA': return 'Finalizada';
      default: return estado;
    }
  }

  protected etiquetaEmision(tipo: string | null): string {
    switch (tipo) {
      case 'AUTOMATICA': return 'Automática';
      case 'SOLICITADA': return 'Confirmada por el alumno';
      case 'MANUAL': return 'Manual administrativa';
      default: return '—';
    }
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api
      .listar(this.texto.trim(), this.estado, this.pagina(), TAMANO_PAGINA)
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
          this.error.set(cuerpo?.message ?? 'No pudimos cargar los certificados. Inténtalo nuevamente.');
          this.cargando.set(false);
        },
      });
  }
}
