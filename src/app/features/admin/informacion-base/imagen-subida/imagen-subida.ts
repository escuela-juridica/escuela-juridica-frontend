import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { throwError } from 'rxjs';

import { resolverUrlApi } from '../../../../core/api/api.config';
import { CursoAdminApiService } from '../../cursos/curso-admin-api.service';
import { InformacionBaseApiService } from '../informacion-base-api.service';

/** HU-009 — Campo para subir la imagen de una firma, el logo de una entidad, la foto de un docente o la portada de un curso, con vista previa. */
@Component({
  selector: 'app-imagen-subida',
  templateUrl: './imagen-subida.html',
  styleUrl: './imagen-subida.scss',
})
export class ImagenSubida {
  private readonly api = inject(InformacionBaseApiService);
  private readonly cursosApi = inject(CursoAdminApiService);
  private readonly destroyRef = inject(DestroyRef);

  /** Referencia actual: vacía o la de una imagen ya subida ({@code /uploads/...}). */
  readonly valor = input('');
  readonly tipo = input.required<'FIRMA' | 'LOGO' | 'FOTO' | 'PORTADA'>();
  /** Solo para {@code PORTADA}: el curso al que pertenece la imagen (el servidor la nombra con su id). */
  readonly cursoId = input<number | null>(null);
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
    if (valor.startsWith('/uploads/')) {
      return resolverUrlApi(valor);
    }
    // Las portadas de los cursos de demostración son archivos del propio sitio ("img/cursos/...") o enlaces completos.
    return this.tipo() === 'PORTADA' && valor ? (/^(https?:)?\/\//.test(valor) || valor.startsWith('/') ? valor : '/' + valor) : null;
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.liberarVistaLocal());
  }

  protected readonly aceptar = computed(() => (this.tipo() === 'FIRMA' ? 'image/png' : 'image/png,image/jpeg'));

  protected readonly nota = computed(() =>
    this.tipo() === 'FIRMA'
      ? 'PNG con fondo transparente, horizontal (entre 2:1 y 5:1) y de al menos 300 px de ancho, por ejemplo 600 × 180 px. Hasta 2 MB.'
      : this.tipo() === 'PORTADA'
        ? 'PNG o JPG horizontal (entre 1.3:1 y 2.4:1) y de al menos 800 px de ancho, por ejemplo 1200 × 675 px. Hasta 5 MB.'
        : 'PNG o JPG de hasta 2 MB.');

  protected readonly textoAlterno = computed(() =>
    this.tipo() === 'FIRMA'
      ? 'Imagen de la firma'
      : this.tipo() === 'FOTO'
        ? 'Foto del docente'
        : this.tipo() === 'PORTADA'
          ? 'Portada del curso'
          : 'Logo de la entidad');

  protected elegir(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    entrada.value = '';
    if (!archivo || this.subiendo()) {
      return;
    }
    this.error.set(null);
    if (this.tipo() === 'PORTADA') {
      this.subiendo.set(true);
      void this.validarPortada(archivo).then((mensaje) => {
        this.subiendo.set(false);
        if (mensaje) {
          this.error.set(mensaje);
          return;
        }
        this.subir(archivo);
      });
      return;
    }
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

  /** La portada se recorta en tarjetas y cabeceras anchas: se avisa de inmediato si no es horizontal o es muy pequeña. */
  private async validarPortada(archivo: File): Promise<string | null> {
    if (archivo.size > 5 * 1024 * 1024) {
      return 'La portada supera el tamaño máximo permitido (5 MB).';
    }
    try {
      const imagen = await createImageBitmap(archivo);
      const { width, height } = imagen;
      imagen.close();
      const proporcion = height === 0 ? 0 : width / height;
      if (width < 800 || proporcion < 1.3 || proporcion > 2.4) {
        return 'La portada debe ser horizontal (entre 1.3:1 y 2.4:1) y de al menos 800 px de ancho, por ejemplo 1200 x 675 px.';
      }
      if (width > 6000) {
        return 'La portada es demasiado grande: usa como máximo 6000 px de ancho.';
      }
      return null;
    } catch {
      return 'No pudimos leer la imagen. Prueba con otro PNG o JPG.';
    }
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
    const tipo = this.tipo();
    const cursoId = this.cursoId();
    const peticion =
      tipo === 'PORTADA' && cursoId !== null
        ? this.cursosApi.subirPortada(cursoId, archivo)
        : tipo === 'PORTADA'
          ? throwError(() => new HttpErrorResponse({ error: { message: 'Guarda el curso antes de subir su portada.' } }))
          : this.api.subirImagenCertificado(tipo, archivo);
    peticion
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
