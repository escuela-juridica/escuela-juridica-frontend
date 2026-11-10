import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { resolverUrlApi } from '../../../core/api/api.config';
import { AlertaGlobalService } from '../../../core/notificaciones/alerta-global.service';
import { DiplomaMiniatura } from '../../../shared/ui/diploma-miniatura/diploma-miniatura';
import { TablaPaginacion } from '../../../shared/ui/tabla-paginacion/tabla-paginacion';
import { formatearFechaLarga } from '../../cursos/curso-formato.util';
import { CertificacionApiService } from '../certificacion-api.service';
import { MiCertificado } from '../certificacion.model';

const TAMANO_PAGINA = 10;

@Component({
  selector: 'app-mis-certificados',
  imports: [RouterLink, DecimalPipe, DiplomaMiniatura, TablaPaginacion],
  templateUrl: './mis-certificados.html',
  styleUrl: './mis-certificados.scss',
})
export class MisCertificados {
  private readonly api = inject(CertificacionApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly alertas = inject(AlertaGlobalService);

  protected readonly formatearFechaLarga = formatearFechaLarga;
  protected readonly certificados = signal<MiCertificado[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly tamano = TAMANO_PAGINA;
  protected readonly pagina = signal(0);
  protected readonly total = signal(0);

  constructor() {
    this.cargar();
  }

  protected irAPagina(pagina: number): void {
    if (pagina < 0 || pagina === this.pagina()) return;
    this.pagina.set(pagina);
    this.cargar();
    document.querySelector('.tabla-marco')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private cargar(): void {
    this.api
      .misCertificados(this.pagina(), TAMANO_PAGINA)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.certificados.set(respuesta.items);
          this.total.set(respuesta.totalElements);
          this.cargando.set(false);
        },
        error: (e: HttpErrorResponse) => {
          const cuerpo = typeof e.error === 'object' && e.error !== null ? (e.error as { message?: string }) : null;
          this.error.set(cuerpo?.message ?? 'No pudimos cargar tus certificados.');
          this.cargando.set(false);
        },
      });
  }

  protected ver(certificado: MiCertificado): void {
    if (certificado.descargaUrl) window.open(`${resolverUrlApi(certificado.descargaUrl)}?enLinea=true`, '_blank');
  }

  protected descargar(certificado: MiCertificado): void {
    if (!certificado.descargaUrl) return;
    this.api
      .descargarPdf(certificado.descargaUrl, certificado.codigo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => this.alertas.mostrar('error', 'No pudimos descargar tu certificado. Inténtalo nuevamente.') });
  }
}
