import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';

import { formatearFechaLarga } from '../../cursos/curso-formato.util';
import { CertificacionApiService } from '../certificacion-api.service';
import { VerificacionCertificado } from '../certificacion.model';

type Resultado = 'ninguno' | 'cargando' | 'vigente' | 'anulado' | 'noEncontrado' | 'error';

/**
 * HU-034 — Verificación pública de un certificado, sin sesión: el código llega por el QR (parámetro
 * `codigo`) o se escribe a mano. Solo muestra los datos mínimos que entrega el servidor; un código que no
 * existe dice únicamente «Certificado no encontrado».
 */
@Component({
  selector: 'app-verificar-certificado',
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './verificar-certificado.html',
  styleUrl: './verificar-certificado.scss',
})
export class VerificarCertificado {
  private readonly api = inject(CertificacionApiService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly formatearFechaLarga = formatearFechaLarga;
  protected readonly resultado = signal<Resultado>('ninguno');
  protected readonly datos = signal<VerificacionCertificado | null>(null);
  protected readonly codigoConsultado = signal('');

  protected readonly formulario = new FormGroup({
    codigo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(80)] }),
  });

  constructor() {
    // Un enlace con ?codigo=… (el del QR) consulta de inmediato.
    this.ruta.queryParamMap
      .pipe(
        map((p) => (p.get('codigo') ?? '').trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((codigo) => {
        if (codigo) {
          this.formulario.controls.codigo.setValue(codigo);
          this.consultar(codigo);
        }
      });
  }

  protected verificar(): void {
    const codigo = this.formulario.controls.codigo.value.trim();
    if (!codigo) {
      this.formulario.markAllAsTouched();
      return;
    }
    // La consulta queda en la URL: el resultado se puede recargar o compartir (solo contiene el código).
    void this.router.navigate([], { queryParams: { codigo }, queryParamsHandling: 'merge' });
    this.consultar(codigo);
  }

  private consultar(codigo: string): void {
    this.codigoConsultado.set(codigo);
    this.resultado.set('cargando');
    this.datos.set(null);
    this.api
      .verificar(codigo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => {
          this.datos.set(d);
          this.resultado.set(d.estado === 'VIGENTE' ? 'vigente' : 'anulado');
        },
        error: (e: HttpErrorResponse) => this.resultado.set(e.status === 404 ? 'noEncontrado' : 'error'),
      });
  }
}
