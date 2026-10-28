import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { resolverUrlApi } from '../../../../core/api/api.config';
import { InformacionBaseApiService } from '../informacion-base-api.service';

/** HU-009 — Campo para subir la imagen de una firma o el logo de una entidad, con vista previa. */
@Component({
  selector: 'app-imagen-subida',
  templateUrl: './imagen-subida.html',
  styleUrl: './imagen-subida.scss',
})
export class ImagenSubida {
  private readonly api = inject(InformacionBaseApiService);
  private readonly destroyRef = inject(DestroyRef);

  /** Referencia actual: vacía o la de una imagen ya subida ({@code /uploads/...}). */
  readonly valor = input('');
  readonly tipo = input.required<'FIRMA' | 'LOGO'>();
  readonly cambio = output<string>();

  protected readonly subiendo = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly urlVista = computed(() => {
    const valor = this.valor();
    return valor.startsWith('/uploads/') ? resolverUrlApi(valor) : null;
  });

  protected elegir(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    entrada.value = '';
    if (!archivo || this.subiendo()) {
      return;
    }
    this.error.set(null);
    this.subiendo.set(true);
    this.api
      .subirImagenCertificado(this.tipo(), archivo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.subiendo.set(false);
          this.cambio.emit(respuesta.referencia);
        },
        error: (e: HttpErrorResponse) => {
          this.subiendo.set(false);
          const mensaje = typeof e.error === 'object' && e.error !== null ? (e.error as { message?: string }).message : null;
          this.error.set(mensaje ?? 'No pudimos subir la imagen. Inténtalo nuevamente.');
        },
      });
  }

  protected quitar(): void {
    this.error.set(null);
    this.cambio.emit('');
  }
}
