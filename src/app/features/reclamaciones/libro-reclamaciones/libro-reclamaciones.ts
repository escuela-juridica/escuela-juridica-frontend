import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Session } from '../../../core/session/session';
import { ReclamacionConstanciaVista } from '../reclamacion-constancia/reclamacion-constancia';
import { ReclamacionConstancia, TipoDocumento, TipoReclamacion } from '../reclamacion.model';
import { ReclamacionesApiService } from '../reclamaciones-api.service';

const MAXIMO_IMAGEN_BYTES = 5 * 1024 * 1024;
const MAXIMO_IMAGENES = 10;
const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/webp'];

/** Cuánto debe medir cada tipo de documento (el servidor repite esta validación). */
const FORMATO_DOCUMENTO: Record<TipoDocumento, { patron: RegExp; ayuda: string }> = {
  DNI: { patron: /^\d{8}$/, ayuda: 'El DNI tiene 8 dígitos.' },
  CE: { patron: /^[A-Za-z0-9]{9,12}$/, ayuda: 'El carné de extranjería tiene entre 9 y 12 caracteres.' },
  PASAPORTE: { patron: /^[A-Za-z0-9]{6,12}$/, ayuda: 'El pasaporte tiene entre 6 y 12 caracteres.' },
  RUC: { patron: /^\d{11}$/, ayuda: 'El RUC tiene 11 dígitos.' },
};

/**
 * HU-039 — Libro de Reclamaciones: página pública, con o sin sesión. Con sesión prellena los datos
 * conocidos (se pueden corregir). Al enviar muestra la constancia con número y fecha máxima de respuesta.
 */
@Component({
  selector: 'app-libro-reclamaciones',
  imports: [ReactiveFormsModule, RouterLink, ReclamacionConstanciaVista],
  templateUrl: './libro-reclamaciones.html',
  styleUrl: './libro-reclamaciones.scss',
})
export class LibroReclamaciones {
  private readonly api = inject(ReclamacionesApiService);
  private readonly session = inject(Session);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tiposDocumento: TipoDocumento[] = ['DNI', 'CE', 'PASAPORTE', 'RUC'];
  protected readonly etiquetasDocumento: Record<TipoDocumento, string> = {
    DNI: 'DNI', CE: 'Carné de extranjería', PASAPORTE: 'Pasaporte', RUC: 'RUC',
  };

  protected readonly imagenes = signal<File[]>([]);
  protected readonly errorImagenes = signal<string | null>(null);
  protected readonly enviando = signal(false);
  protected readonly errorEnvio = signal<string | null>(null);
  protected readonly constancia = signal<ReclamacionConstancia | null>(null);
  protected readonly prellenado = signal(false);

  protected readonly formulario = new FormGroup({
    tipo: new FormControl<TipoReclamacion | null>(null, { validators: [Validators.required] }),
    tipoDocumento: new FormControl<TipoDocumento>('DNI', { nonNullable: true, validators: [Validators.required] }),
    numeroDocumento: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(20)] }),
    nombres: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
    apellidos: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(160)] }),
    correo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email, Validators.maxLength(254)] }),
    celular: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^[0-9+ ()-]{7,20}$/)] }),
    direccion: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(5), Validators.maxLength(250)] }),
    montoReclamado: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(0), Validators.max(99999999)] }),
    descripcionBien: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(300)] }),
    detalle: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10), Validators.maxLength(4000)] }),
    pedido: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10), Validators.maxLength(4000)] }),
    declaracionJurada: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
    autorizaRespuestaCorreo: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });

  constructor() {
    if (this.session.estaAutenticado()) {
      this.api
        .precarga()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (datos) => {
            this.formulario.patchValue({
              nombres: datos.nombres,
              apellidos: datos.apellidos,
              correo: datos.correo,
              celular: datos.celular,
              tipoDocumento: datos.tipoDocumento,
              numeroDocumento: datos.numeroDocumento,
            });
            this.prellenado.set(true);
          },
          error: () => undefined, // Sin prellenado el formulario sigue siendo utilizable.
        });
    }
  }

  protected elegirTipo(tipo: TipoReclamacion): void {
    this.formulario.controls.tipo.setValue(tipo);
    this.formulario.controls.tipo.markAsTouched();
  }

  protected invalido(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  protected documentoInvalido(): boolean {
    const c = this.formulario.controls.numeroDocumento;
    if (!c.touched && !c.dirty) return false;
    return !FORMATO_DOCUMENTO[this.formulario.controls.tipoDocumento.value].patron.test(c.value.trim());
  }

  protected ayudaDocumento(): string {
    return FORMATO_DOCUMENTO[this.formulario.controls.tipoDocumento.value].ayuda;
  }

  protected elegirImagenes(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const nuevas = Array.from(entrada.files ?? []);
    entrada.value = '';
    const actuales = [...this.imagenes()];
    for (const archivo of nuevas) {
      if (!TIPOS_IMAGEN.includes(archivo.type)) {
        this.errorImagenes.set(`«${archivo.name}» no es una imagen válida (PNG, JPG o WEBP).`);
        return;
      }
      if (archivo.size > MAXIMO_IMAGEN_BYTES) {
        this.errorImagenes.set(`«${archivo.name}» supera el máximo de 5 MB.`);
        return;
      }
      actuales.push(archivo);
    }
    if (actuales.length > MAXIMO_IMAGENES) {
      this.errorImagenes.set(`Puedes adjuntar hasta ${MAXIMO_IMAGENES} imágenes.`);
      return;
    }
    this.errorImagenes.set(null);
    this.errorEnvio.set(null);
    this.imagenes.set(actuales);
  }

  protected quitarImagen(indice: number): void {
    this.imagenes.update((lista) => lista.filter((_, i) => i !== indice));
    this.errorImagenes.set(null);
    this.errorEnvio.set(null);
  }

  protected tamano(archivo: File): string {
    return archivo.size >= 1024 * 1024 ? `${(archivo.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(archivo.size / 1024))} KB`;
  }

  protected enviar(): void {
    if (this.enviando()) return;
    this.errorEnvio.set(null);
    if (this.formulario.invalid || this.documentoInvalido() || this.formulario.controls.numeroDocumento.value.trim() === '') {
      this.formulario.markAllAsTouched();
      this.formulario.controls.numeroDocumento.markAsDirty();
      this.errorEnvio.set('Revisa los campos marcados antes de enviar.');
      return;
    }
    const v = this.formulario.getRawValue();
    this.enviando.set(true);
    this.api
      .presentar(
        {
          tipo: v.tipo as TipoReclamacion,
          tipoDocumento: v.tipoDocumento,
          numeroDocumento: v.numeroDocumento.trim(),
          nombres: v.nombres.trim(),
          apellidos: v.apellidos.trim(),
          correo: v.correo.trim(),
          celular: v.celular.trim(),
          direccion: v.direccion.trim(),
          montoReclamado: Number(v.montoReclamado),
          descripcionBien: v.descripcionBien.trim(),
          detalle: v.detalle.trim(),
          pedido: v.pedido.trim(),
          declaracionJurada: v.declaracionJurada,
          autorizaRespuestaCorreo: v.autorizaRespuestaCorreo,
        },
        this.imagenes(),
        this.session.estaAutenticado(),
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (constancia) => {
          this.enviando.set(false);
          this.constancia.set(constancia);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: (e: HttpErrorResponse) => {
          this.enviando.set(false);
          const cuerpo = typeof e.error === 'object' && e.error !== null ? (e.error as { message?: string; fieldErrors?: { message: string }[] }) : null;
          this.errorEnvio.set(cuerpo?.fieldErrors?.[0]?.message ?? cuerpo?.message ?? 'No pudimos registrar tu caso. Inténtalo nuevamente.');
        },
      });
  }
}
