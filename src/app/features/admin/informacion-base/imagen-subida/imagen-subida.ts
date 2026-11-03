import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { resolverUrlApi } from '../../../../core/api/api.config';
import { InformacionBaseApiService } from '../informacion-base-api.service';

/** HU-009 — Campo para subir la imagen de una firma, el logo de una entidad o la foto de un docente, con vista previa. */
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
  readonly tipo = input.required<'FIRMA' | 'LOGO' | 'FOTO'>();
  readonly cambio = output<string>();

  protected readonly subiendo = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Vista previa del archivo recién subido: se muestra de inmediato, sin depender de que el servidor lo devuelva. */
  private readonly vistaLocal = signal<{ referencia: string; url: string } | null>(null);
  /** Dirección de la vista previa que el navegador no pudo cargar, para mostrar un aviso en vez de una imagen rota. */
  protected readonly urlFallida = signal<string | null>(null);

  protected readonly urlVista = computed(() => {
    const valor = this.valor();
    const local = this.vistaLocal();
    if (local && local.referencia === valor) {
      return local.url;
    }
    return valor.startsWith('/uploads/') ? resolverUrlApi(valor) : null;
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.liberarVistaLocal());
  }

  protected readonly aceptar = computed(() => (this.tipo() === 'FIRMA' ? 'image/png' : 'image/png,image/jpeg'));

  protected readonly nota = computed(() =>
    this.tipo() === 'FIRMA'
      ? 'PNG con fondo transparente, horizontal (entre 2:1 y 5:1) y de al menos 300 px de ancho, por ejemplo 600 × 180 px. Hasta 2 MB.'
      : 'PNG o JPG de hasta 2 MB.');

  protected readonly textoAlterno = computed(() =>
    this.tipo() === 'FIRMA' ? 'Imagen de la firma' : this.tipo() === 'FOTO' ? 'Foto del docente' : 'Logo de la entidad');

  protected elegir(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    entrada.value = '';
    if (!archivo || this.subiendo()) {
      return;
    }
    this.error.set(null);
    if (this.tipo() !== 'FIRMA') {
      this.subir(archivo);
      return;
    }
    // La firma debe tener la forma del certificado: se avisa de inmediato, antes de subir nada.
    this.subiendo.set(true);
    void this.validarFirma(archivo).then((mensaje) => {
      this.subiendo.set(false);
      if (mensaje) {
        this.error.set(mensaje);
        return;
      }
      this.subir(archivo);
    });
  }

  private async validarFirma(archivo: File): Promise<string | null> {
    if (archivo.type !== 'image/png') {
      return 'La firma debe ser un PNG con fondo transparente.';
    }
    try {
      const imagen = await createImageBitmap(archivo);
      const { width, height } = imagen;
      imagen.close();
      const proporcion = height === 0 ? 0 : width / height;
      if (width < 300 || proporcion < 2 || proporcion > 5) {
        return 'La firma debe ser horizontal (entre 2:1 y 5:1) y de al menos 300 px de ancho, por ejemplo 600 x 180 px.';
      }
      if (width > 3000 || height > 1500) {
        return 'La firma es demasiado grande: usa como máximo 3000 x 1500 px.';
      }
      return null;
    } catch {
      return 'No pudimos leer la imagen de la firma. Prueba con otro PNG.';
    }
  }

  private subir(archivo: File): void {
    this.subiendo.set(true);
    this.api
      .subirImagenCertificado(this.tipo(), archivo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.subiendo.set(false);
          this.liberarVistaLocal();
          this.vistaLocal.set({ referencia: respuesta.referencia, url: URL.createObjectURL(archivo) });
          this.urlFallida.set(null);
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
    this.liberarVistaLocal();
    this.cambio.emit('');
  }

  private liberarVistaLocal(): void {
    const local = this.vistaLocal();
    if (local) {
      URL.revokeObjectURL(local.url);
      this.vistaLocal.set(null);
    }
  }
}
