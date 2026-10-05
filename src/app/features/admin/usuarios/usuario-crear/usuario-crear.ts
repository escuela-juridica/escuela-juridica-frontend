import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { AdminUsuariosApiService } from '../admin-usuarios-api.service';
import { CrearUsuarioAdminRespuesta, RolUsuarioAdmin } from '../usuario-admin.model';
import {
  documentoOpcionalValidator,
  nombrePropioValidator,
  telefonoOpcionalValidator,
} from '../../../cuenta/mi-perfil/mi-perfil.validators';

interface ErrorApiAdmin {
  code?: string;
  message?: string;
}

/** HU-008 — Crear usuario administrativamente, como contenido de un modal (ver
 * usuarios-listado). Si el correo ya existe, conserva la cuenta y solo concede el rol faltante;
 * no genera contraseña temporal ni duplica la identidad. */
@Component({
  selector: 'app-usuario-crear',
  imports: [ReactiveFormsModule],
  templateUrl: './usuario-crear.html',
  styleUrl: './usuario-crear.scss',
})
export class UsuarioCrear {
  private readonly api = inject(AdminUsuariosApiService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly detector = inject(ChangeDetectorRef);

  readonly cerrar = output<void>();
  readonly creado = output<CrearUsuarioAdminRespuesta>();

  protected readonly intentoGuardar = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorCrear = signal<string | null>(null);
  protected readonly resultado = signal<CrearUsuarioAdminRespuesta | null>(null);

  protected readonly formulario = this.fb.group({
    nombres: ['', [Validators.required, Validators.maxLength(120), nombrePropioValidator]],
    apellidoPaterno: ['', [Validators.required, Validators.maxLength(80), nombrePropioValidator]],
    apellidoMaterno: ['', [Validators.maxLength(80), nombrePropioValidator]],
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    telefono: ['', [Validators.maxLength(30), telefonoOpcionalValidator]],
    documentoIdentidad: ['', [Validators.maxLength(30), documentoOpcionalValidator]],
    rol: this.fb.control<RolUsuarioAdmin>('ALUMNO'),
  });

  constructor() {
    for (const nombre of ['nombres', 'apellidoPaterno', 'apellidoMaterno'] as const) {
      const control = this.formulario.controls[nombre];
      control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((valor) => {
        const mayuscula = valor.toLocaleUpperCase('es-PE');
        if (valor !== mayuscula) {
          control.setValue(mayuscula, { emitEvent: false });
        }
      });
    }
  }

  protected campoInvalido(
    nombre: 'nombres' | 'apellidoPaterno' | 'apellidoMaterno' | 'correo' | 'telefono' | 'documentoIdentidad',
  ): boolean {
    const control = this.formulario.controls[nombre];
    return control.invalid && (control.touched || this.intentoGuardar());
  }

  protected crear(): void {
    if (this.guardando()) {
      return;
    }

    this.intentoGuardar.set(true);
    this.errorCrear.set(null);
    this.resultado.set(null);

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();
    this.guardando.set(true);
    this.api
      .crear({
        nombres: valores.nombres.trim(),
        apellidoPaterno: valores.apellidoPaterno.trim(),
        apellidoMaterno: this.textoOpcional(valores.apellidoMaterno),
        correo: valores.correo.trim(),
        telefono: this.textoOpcional(valores.telefono)?.replace(/[\s-]/g, '') ?? null,
        documentoIdentidad: this.textoOpcional(valores.documentoIdentidad),
        rol: valores.rol,
      })
      .pipe(
        finalize(() => {
          this.guardando.set(false);
          this.detector.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (respuesta) => {
          this.resultado.set(respuesta);
          this.creado.emit(respuesta);
        },
        error: (error: HttpErrorResponse) => {
          const respuesta = typeof error.error === 'object' && error.error !== null
            ? (error.error as ErrorApiAdmin)
            : null;
          this.errorCrear.set(respuesta?.message ?? 'No pudimos crear el usuario. Inténtalo nuevamente.');
        },
      });
  }

  private textoOpcional(valor: string): string | null {
    const limpio = valor.trim();
    return limpio.length > 0 ? limpio : null;
  }
}
