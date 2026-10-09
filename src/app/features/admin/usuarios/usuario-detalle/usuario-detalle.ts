import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, Input, OnChanges, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import {
  documentoOpcionalValidator,
  nombrePropioValidator,
  telefonoOpcionalValidator,
} from '../../../cuenta/mi-perfil/mi-perfil.validators';
import { AdminUsuariosApiService } from '../admin-usuarios-api.service';
import { claseEstadoCuenta, etiquetaEstadoCuenta } from '../usuario-admin-etiquetas';
import { RolUsuarioAdmin, UsuarioAdminRespuesta } from '../usuario-admin.model';

interface ErrorApiAdmin {
  code?: string;
  message?: string;
}

/** Cuánto tiempo queda visible una alerta antes de desaparecer sola. */
const DURACION_MENSAJE_MS = 5000;

/** HU-008 — Detalle administrativo de un usuario, mostrado dentro de un modal (ver
 * usuarios-listado). Habilitar/deshabilitar, conceder o retirar roles vía checkboxes, editar los
 * datos personales y reenviar el código de verificación mientras la cuenta siga pendiente. */
@Component({
  selector: 'app-usuario-detalle',
  imports: [ReactiveFormsModule],
  templateUrl: './usuario-detalle.html',
  styleUrl: './usuario-detalle.scss',
})
export class UsuarioDetalle implements OnChanges {
  @Input({ required: true }) usuarioId!: number;
  readonly cerrar = output<void>();
  /** Avisa al listado para refrescar esa fila sin recargar todo. */
  readonly actualizado = output<UsuarioAdminRespuesta>();

  private readonly api = inject(AdminUsuariosApiService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly detector = inject(ChangeDetectorRef);

  protected readonly usuario = signal<UsuarioAdminRespuesta | null | undefined>(undefined);
  protected readonly cambiandoEstado = signal(false);
  protected readonly concediendoRol = signal<RolUsuarioAdmin | null>(null);
  protected readonly reenviando = signal(false);
  protected readonly reseteandoContrasena = signal(false);
  /** Se muestra hasta que el admin la cierra a propósito: a diferencia de `mensaje`, no
   * desaparece sola, porque hay que poder copiarla. */
  protected readonly contrasenaTemporal = signal<string | null>(null);

  /** Un único slot de alerta: evita que un error de una acción quede "pegado" en pantalla
   * mientras otra acción distinta se completa con éxito. */
  protected readonly mensaje = signal<{ tipo: 'error' | 'exito'; texto: string } | null>(null);
  private mensajeTimeout: ReturnType<typeof setTimeout> | null = null;

  protected readonly editando = signal(false);
  protected readonly guardandoDatos = signal(false);
  protected readonly intentoGuardarDatos = signal(false);

  protected readonly etiquetaEstadoCuenta = etiquetaEstadoCuenta;
  protected readonly claseEstadoCuenta = claseEstadoCuenta;
  protected readonly todosLosRoles: RolUsuarioAdmin[] = ['ALUMNO', 'ADMINISTRADOR'];

  protected readonly formDatos = this.fb.group({
    nombres: ['', [Validators.required, Validators.maxLength(120), nombrePropioValidator]],
    apellidoPaterno: ['', [Validators.required, Validators.maxLength(80), nombrePropioValidator]],
    apellidoMaterno: ['', [Validators.maxLength(80), nombrePropioValidator]],
    telefono: ['', [Validators.maxLength(30), telefonoOpcionalValidator]],
    documentoIdentidad: ['', [Validators.maxLength(30), documentoOpcionalValidator]],
  });

  constructor() {
    for (const nombre of ['nombres', 'apellidoPaterno', 'apellidoMaterno'] as const) {
      const control = this.formDatos.controls[nombre];
      control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((valor) => {
        const mayuscula = valor.toLocaleUpperCase('es-PE');
        if (valor !== mayuscula) {
          control.setValue(mayuscula, { emitEvent: false });
        }
      });
    }
    this.destroyRef.onDestroy(() => this.limpiarTimeoutMensaje());
  }

  ngOnChanges(): void {
    this.cargar(this.usuarioId);
  }

  protected tieneRol(rol: RolUsuarioAdmin): boolean {
    return this.usuario()?.roles.includes(rol) ?? false;
  }

  protected etiquetaRol(rol: RolUsuarioAdmin): string {
    return rol === 'ADMINISTRADOR' ? 'Administrador' : 'Alumno';
  }

  protected alternarRol(rol: RolUsuarioAdmin): void {
    const usuario = this.usuario();
    if (!usuario || this.concediendoRol()) {
      return;
    }
    const concedia = this.tieneRol(rol);
    this.concediendoRol.set(rol);
    const peticion = concedia
      ? this.api.revocarRol(usuario.usuarioId, rol)
      : this.api.concederRol(usuario.usuarioId, { rol });
    peticion
      .pipe(
        finalize(() => {
          this.concediendoRol.set(null);
          this.detector.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (actualizado) => {
          this.usuario.set(actualizado);
          this.actualizado.emit(actualizado);
          this.mostrarMensaje('exito', concedia ? 'Rol retirado.' : 'Rol agregado.');
        },
        error: (error: HttpErrorResponse) => {
          this.mostrarMensaje('error', this.obtenerErrorApi(error)?.message ?? 'No pudimos actualizar el rol.');
        },
      });
  }

  protected cambiarEstado(activo: boolean): void {
    const usuario = this.usuario();
    if (!usuario || this.cambiandoEstado()) {
      return;
    }
    this.cambiandoEstado.set(true);
    this.api
      .cambiarActivo(usuario.usuarioId, { activo, motivo: null })
      .pipe(
        finalize(() => {
          this.cambiandoEstado.set(false);
          this.detector.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (actualizado) => {
          this.usuario.set(actualizado);
          this.actualizado.emit(actualizado);
          this.mostrarMensaje('exito', activo ? 'Cuenta habilitada.' : 'Cuenta deshabilitada.');
        },
        error: (error: HttpErrorResponse) => {
          this.mostrarMensaje(
            'error',
            this.obtenerErrorApi(error)?.message ?? 'No pudimos cambiar el estado de la cuenta.',
          );
        },
      });
  }

  protected reenviarHabilitacion(): void {
    const usuario = this.usuario();
    if (!usuario || this.reenviando()) {
      return;
    }
    this.reenviando.set(true);
    this.api
      .reenviarHabilitacion(usuario.usuarioId)
      .pipe(
        finalize(() => {
          this.reenviando.set(false);
          this.detector.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.mostrarMensaje('exito', 'Código de verificación reenviado.'),
        error: (error: HttpErrorResponse) => {
          this.mostrarMensaje(
            'error',
            this.obtenerErrorApi(error)?.message ?? 'No pudimos reenviar las instrucciones.',
          );
        },
      });
  }

  protected resetearContrasena(): void {
    const usuario = this.usuario();
    if (!usuario || this.reseteandoContrasena()) {
      return;
    }
    this.reseteandoContrasena.set(true);
    this.contrasenaTemporal.set(null);
    this.api
      .resetearContrasena(usuario.usuarioId)
      .pipe(
        finalize(() => {
          this.reseteandoContrasena.set(false);
          this.detector.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (respuesta) => {
          this.usuario.set(respuesta.usuario);
          this.actualizado.emit(respuesta.usuario);
          this.contrasenaTemporal.set(respuesta.contrasenaTemporal);
        },
        error: (error: HttpErrorResponse) => {
          this.mostrarMensaje(
            'error',
            this.obtenerErrorApi(error)?.message ?? 'No pudimos resetear la contraseña.',
          );
        },
      });
  }

  protected cerrarContrasenaTemporal(): void {
    this.contrasenaTemporal.set(null);
  }

  protected campoDatosInvalido(
    nombre: 'nombres' | 'apellidoPaterno' | 'apellidoMaterno' | 'telefono' | 'documentoIdentidad',
  ): boolean {
    const control = this.formDatos.controls[nombre];
    return control.invalid && (control.touched || this.intentoGuardarDatos());
  }

  protected abrirEdicion(): void {
    const u = this.usuario();
    if (!u) {
      return;
    }
    this.intentoGuardarDatos.set(false);
    this.formDatos.setValue({
      nombres: u.nombres,
      apellidoPaterno: u.apellidoPaterno,
      apellidoMaterno: u.apellidoMaterno ?? '',
      telefono: u.telefono ?? '',
      documentoIdentidad: u.documentoIdentidad ?? '',
    });
    this.editando.set(true);
  }

  protected cancelarEdicion(): void {
    this.editando.set(false);
  }

  protected guardarDatos(): void {
    const usuario = this.usuario();
    if (!usuario || this.guardandoDatos()) {
      return;
    }
    this.intentoGuardarDatos.set(true);
    if (this.formDatos.invalid) {
      this.formDatos.markAllAsTouched();
      return;
    }

    const v = this.formDatos.getRawValue();
    this.guardandoDatos.set(true);
    this.api
      .actualizarDatosPersonales(usuario.usuarioId, {
        nombres: v.nombres.trim(),
        apellidoPaterno: v.apellidoPaterno.trim(),
        apellidoMaterno: this.textoOpcional(v.apellidoMaterno),
        telefono: this.textoOpcional(v.telefono)?.replace(/[\s-]/g, '') ?? null,
        documentoIdentidad: this.textoOpcional(v.documentoIdentidad),
      })
      .pipe(
        finalize(() => {
          this.guardandoDatos.set(false);
          this.detector.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (actualizado) => {
          this.usuario.set(actualizado);
          this.actualizado.emit(actualizado);
          this.editando.set(false);
          this.mostrarMensaje('exito', 'Información actualizada.');
        },
        error: (error: HttpErrorResponse) => {
          const respuesta = this.obtenerErrorApi(error);
          if (error.status === 409 && respuesta?.code === 'DUPLICATE_RESOURCE') {
            this.formDatos.controls.documentoIdentidad.setErrors({ duplicado: true });
          }
          this.mostrarMensaje(
            'error',
            respuesta?.message ?? 'No pudimos guardar los datos. Revisa los campos marcados.',
          );
        },
      });
  }

  private cargar(usuarioId: number): void {
    this.usuario.set(undefined);
    this.editando.set(false);
    this.mensaje.set(null);
    this.contrasenaTemporal.set(null);
    this.limpiarTimeoutMensaje();
    this.api
      .obtener(usuarioId)
      .pipe(
        finalize(() => this.detector.markForCheck()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (usuario) => this.usuario.set(usuario),
        error: () => this.usuario.set(null),
      });
  }

  private mostrarMensaje(tipo: 'error' | 'exito', texto: string): void {
    this.limpiarTimeoutMensaje();
    this.mensaje.set({ tipo, texto });
    this.mensajeTimeout = setTimeout(() => {
      this.mensaje.set(null);
      this.mensajeTimeout = null;
      this.detector.markForCheck();
    }, DURACION_MENSAJE_MS);
  }

  private limpiarTimeoutMensaje(): void {
    if (this.mensajeTimeout !== null) {
      clearTimeout(this.mensajeTimeout);
      this.mensajeTimeout = null;
    }
  }

  private obtenerErrorApi(error: HttpErrorResponse): ErrorApiAdmin | null {
    if (typeof error.error !== 'object' || error.error === null) {
      return null;
    }
    return error.error as ErrorApiAdmin;
  }

  private textoOpcional(valor: string): string | null {
    const limpio = valor.trim();
    return limpio.length > 0 ? limpio : null;
  }
}
