import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmacionService } from '../dialogo/confirmacion.service';
import { Session } from './session';

/** Reacciona a un 401 inesperado (la cookie de sesión venció o es inválida) en cualquier
 * petición, sin importar si el usuario es alumno o administrador: limpia la sesión local,
 * manda a /acceso y recién ahí muestra el aviso (para que no compita con la navegación ni
 * desaparezca si la pantalla actual se destruye antes de que se vea). */
@Injectable({ providedIn: 'root' })
export class SesionVencidaServicio {
  private readonly router = inject(Router);
  private readonly session = inject(Session);
  private readonly confirmacion = inject(ConfirmacionService);

  private manejando = false;

  manejar(): void {
    // Si varias peticiones en vuelo fallan con 401 al mismo tiempo, solo la primera dispara
    // el aviso; las demás ya encuentran "manejando = true" y no hacen nada.
    if (this.manejando) {
      return;
    }
    this.manejando = true;

    this.session.limpiarLocal();
    void this.router.navigate(['/acceso']).then(() => {
      void this.confirmacion
        .preguntar({
          titulo: 'Sesión finalizada',
          mensaje: 'Tu sesión ha vencido. Vuelve a iniciar sesión para continuar.',
          textoConfirmar: 'Entendido',
          textoCancelar: 'Cerrar',
          variante: 'peligro',
        })
        .finally(() => {
          this.manejando = false;
        });
    });
  }
}
