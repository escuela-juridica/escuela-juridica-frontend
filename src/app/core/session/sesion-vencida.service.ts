import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmacionService } from '../dialogo/confirmacion.service';
import { Session } from './session';

@Injectable({ providedIn: 'root' })
export class SesionVencidaServicio {
  private readonly router = inject(Router);
  private readonly session = inject(Session);
  private readonly confirmacion = inject(ConfirmacionService);

  private manejando = false;

  manejar(): void {
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
