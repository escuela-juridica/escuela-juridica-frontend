import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import {
  contrasenasCoincidenValidator,
  politicaContrasenaValidator,
} from '../registro/registro.validators';
import { NuevaPasswordApiService } from './nueva-password-api.service';

type EstadoPantalla = 'cargando' | 'formulario' | 'invalido' | 'listo';

interface ErrorApiNuevaPassword {
  code?: string;
  message?: string;
}

@Component({
  selector: 'app-nueva-password',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './nueva-password.html',
  styleUrl: './nueva-password.scss',
})
export class NuevaPassword implements OnInit {
  private readonly api = inject(NuevaPasswordApiService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  private token = '';

  protected readonly estado = signal<EstadoPantalla>('cargando');
  protected readonly guardando = signal(false);
  protected readonly errorGeneral = signal<string | null>(null);
  protected readonly intentoEnvio = signal(false);
  protected mostrarContrasena = false;
  protected mostrarConfirmacion = false;

  protected readonly formulario = this.fb.group(
    {
      contrasena: ['', [Validators.required, politicaContrasenaValidator]],
      confirmarContrasena: ['', [Validators.required]],
    },
    { validators: contrasenasCoincidenValidator },
  );

  ngOnInit(): void {
    this.token = this.ruta.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.estado.set('invalido');
      return;
    }

    this.api
      .consultar(this.token)
      .pipe(
        catchError(() => of({ valido: false })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((respuesta) => {
        this.estado.set(respuesta.valido ? 'formulario' : 'invalido');
      });
  }

  protected get valorContrasena(): string {
    return this.formulario.controls.contrasena.value;
  }

  protected get cumpleLongitud(): boolean {
    return this.valorContrasena.length >= 8;
  }

  protected get cumpleMayuscula(): boolean {
    return /\p{Uppercase}/u.test(this.valorContrasena);
  }

  protected get cumpleMinuscula(): boolean {
    return /\p{Lowercase}/u.test(this.valorContrasena);
  }

  protected get cumpleNumero(): boolean {
    return /\p{Nd}/u.test(this.valorContrasena);
  }

  protected get confirmacionInvalida(): boolean {
    const confirmacion = this.formulario.controls.confirmarContrasena;
    const debeMostrarError = confirmacion.touched || this.intentoEnvio();
    const noCoincide = this.formulario.hasError('contrasenasDiferentes');
    return debeMostrarError && (confirmacion.invalid || noCoincide);
  }

  protected campoContrasenaInvalido(): boolean {
    const control = this.formulario.controls.contrasena;
    return control.invalid && (control.touched || this.intentoEnvio());
  }

  protected guardar(): void {
    if (this.guardando()) {
      return;
    }

    this.intentoEnvio.set(true);
    this.errorGeneral.set(null);

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();
    this.guardando.set(true);
    this.api
      .cambiar(this.token, {
        contrasena: valores.contrasena,
        confirmacion: valores.confirmarContrasena,
      })
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.estado.set('listo'),
        error: (error: HttpErrorResponse) => this.manejarError(error),
      });
  }

  protected irAAcceso(): void {
    void this.router.navigate(['/acceso']);
  }

  private manejarError(error: HttpErrorResponse): void {
    const cuerpo = this.obtenerErrorApi(error);
    if (cuerpo?.code === 'INVALID_TOKEN') {
      this.estado.set('invalido');
      return;
    }
    this.errorGeneral.set(
      cuerpo?.message?.trim() || 'No pudimos guardar tu nueva contraseña. Inténtalo nuevamente.',
    );
  }

  private obtenerErrorApi(error: HttpErrorResponse): ErrorApiNuevaPassword | null {
    if (typeof error.error !== 'object' || error.error === null) {
      return null;
    }
    return error.error as ErrorApiNuevaPassword;
  }
}
