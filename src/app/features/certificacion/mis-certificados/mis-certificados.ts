import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { resolverUrlApi } from '../../../core/api/api.config';
import { DiplomaMiniatura } from '../../../shared/ui/diploma-miniatura/diploma-miniatura';
import { formatearFechaLarga } from '../../cursos/curso-formato.util';
import { CertificacionApiService } from '../certificacion-api.service';
import { MiCertificado } from '../certificacion.model';

/** HU-033 — Mis certificados: solo los del alumno autenticado. Uno vigente se descarga; uno anulado
 * sigue listado como no válido y sin descarga. Vencer o cancelar la matrícula no los quita. */
@Component({
  selector: 'app-mis-certificados',
  imports: [RouterLink, DecimalPipe, DiplomaMiniatura],
  templateUrl: './mis-certificados.html',
  styleUrl: './mis-certificados.scss',
})
export class MisCertificados {
  private readonly api = inject(CertificacionApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly formatearFechaLarga = formatearFechaLarga;
  protected readonly certificados = signal<MiCertificado[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.api
      .misCertificados()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lista) => {
          this.certificados.set(lista);
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
    if (certificado.descargaUrl) window.open(resolverUrlApi(certificado.descargaUrl), '_blank');
  }
}
