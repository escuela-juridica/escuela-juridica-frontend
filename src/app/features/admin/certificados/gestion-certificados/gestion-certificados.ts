import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Subscription } from 'rxjs';

import { resolverUrlApi } from '../../../../core/api/api.config';
import { crearBusquedaDinamica } from '../../../../shared/util/busqueda-dinamica';
import { TablaPaginacion } from '../../../../shared/ui/tabla-paginacion/tabla-paginacion';
import { CertificadosAdminApiService } from '../certificados-admin-api.service';
import { CertificadoGestion } from '../certificados-admin.model';

const TAMANO_PAGINA = 20;

/** HU-035/HU-036 — PF-033: matrículas con la situación de su certificado; desde aquí se emite uno manual. */
@Component({
  selector: 'app-gestion-certificados',
  imports: [FormsModule, DatePipe, RouterLink, TablaPaginacion],
  templateUrl: './gestion-certificados.html',
  styleUrl: './gestion-certificados.scss',
})
export class GestionCertificados {
  private readonly api = inject(CertificadosAdminApiService);
  private readonly destroyRef = inject(DestroyRef);
  private peticion?: Subscription;

  /** Búsqueda al escribir: consulta al servidor cuando el usuario hace una pausa. */
  protected readonly alEscribir = crearBusquedaDinamica(this.destroyRef, () => this.buscar());

  protected readonly tamano = TAMANO_PAGINA;
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

  /** Abre el PDF vigente en otra pestaña, igual que lo ve el alumno. */
  protected verCertificado(codigo: string): void {
    window.open(`${resolverUrlApi(`/api/app/certificados/${encodeURIComponent(codigo)}/descargar`)}?enLinea=true`, '_blank');
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

  protected claseMatricula(estado: string): string {
    switch (estado) {
      case 'ACTIVA': return 'badge badge--disp-inmediato';
      case 'VENCIDA': return 'badge badge--advertencia-suave';
      case 'CANCELADA': return 'badge badge--disp-cancelado';
      default: return 'badge badge--disp-cerrado';
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
    this.peticion?.unsubscribe();
    this.peticion = this.api
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
