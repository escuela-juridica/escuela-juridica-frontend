import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { RecuperarPasswordApiService } from './recuperar-password-api.service';

type EstadoPantalla = 'formulario' | 'enviado';

@Component({
  selector: 'app-recuperar-password',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './recuperar-password.html',
  styleUrl: './recuperar-password.scss',
})
export class RecuperarPassword {
  private readonly api = inject(RecuperarPasswordApiService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly estado = signal<EstadoPantalla>('formulario');
  protected readonly enviando = signal(false);
  protected readonly errorGeneral = signal<string | null>(null);
  protected readonly intentoEnvio = signal(false);

  protected readonly formulario = this.fb.group({
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
  });

  protected campoInvalido(): boolean {
    const control = this.formulario.controls.correo;
    return control.invalid && (control.touched || this.intentoEnvio());
  }

  protected enviar(): void {
    if (this.enviando()) {
      return;
    }

    this.intentoEnvio.set(true);
    this.errorGeneral.set(null);

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const correo = this.formulario.controls.correo.value.trim().toLowerCase();
    this.enviando.set(true);
    this.api
      .solicitar({ correo })
      .pipe(
        finalize(() => this.enviando.set(false)),
        catchError((error: HttpErrorResponse) => {
          this.errorGeneral.set(
            error.status === 0
              ? 'No pudimos comunicarnos con el servidor. Inténtalo nuevamente.'
              : 'No pudimos procesar la solicitud. Inténtalo nuevamente.',
          );
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((respuesta) => {
        if (respuesta) {
          this.estado.set('enviado');
        }
      });
  }
}
