import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { BotonGooglePendiente } from '../../../shared/ui/boton-google-pendiente/boton-google-pendiente';
import { Session } from '../../../core/session/session';
import { AccesoApiService } from './acceso-api.service';

interface ErrorApiAcceso {
  code?: string;
  message?: string;
}

@Component({
  selector: 'app-acceso',
  imports: [FormsModule, RouterLink, BotonGooglePendiente],
  templateUrl: './acceso.html',
  styleUrl: './acceso.scss',
})
export class Acceso {
  private readonly accesoApi = inject(AccesoApiService);
  private readonly session = inject(Session);
  private readonly router = inject(Router);
  private readonly detector = inject(ChangeDetectorRef);

  credenciales = { correo: '', contrasena: '' };
  mostrarPassword = false;
  cargando = false;
  mensajeError = '';
  mensajeInfo = this.leerMensajeInfo();

  private leerMensajeInfo(): string {
    const estadoNavegacion = history.state as { mensajeInfo?: unknown } | null;
    return typeof estadoNavegacion?.mensajeInfo === 'string' ? estadoNavegacion.mensajeInfo : '';
  }

  onLogin(): void {
    if (this.cargando || !this.credenciales.correo.trim() || !this.credenciales.contrasena) {
      return;
    }

    this.cargando = true;
    this.mensajeError = '';
    const correo = this.credenciales.correo.trim().toLowerCase();

    this.accesoApi
      .acceder({ correo, contrasena: this.credenciales.contrasena })
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.detector.markForCheck();
        }),
      )
      .subscribe({
        next: (usuario) => {
          this.session.iniciarSesion(usuario);
          this.navegarSegunRol(usuario.rolPrincipal);
        },
        error: (error: HttpErrorResponse) => this.manejarError(error, correo),
      });
  }

  togglePassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  private navegarSegunRol(rol: 'ALUMNO' | 'ADMINISTRADOR'): void {
    // HU-008: por ahora el panel de administrador solo tiene "Usuarios" implementado.
    void this.router.navigate([rol === 'ADMINISTRADOR' ? '/admin/usuarios' : '/app/panel']);
  }

  private manejarError(error: HttpErrorResponse, correo: string): void {
    const cuerpo = this.obtenerErrorApi(error);
    if (cuerpo?.code === 'PENDING_EMAIL_VERIFICATION') {
      void this.router.navigate(['/verificar-correo'], { state: { correo } });
      return;
    }
    this.mensajeError = cuerpo?.message?.trim() || 'El correo o la contraseña no son correctos.';
  }

  private obtenerErrorApi(error: HttpErrorResponse): ErrorApiAcceso | null {
    if (typeof error.error !== 'object' || error.error === null) {
      return null;
    }
    return error.error as ErrorApiAcceso;
  }
}
