import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { obtenerIniciales } from '../../session/nombre-utils';
import { Session } from '../../session/session';
import { ConfirmacionService } from '../../dialogo/confirmacion.service';

@Component({
  selector: 'app-layout-admin',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout-admin.html',
  styleUrl: './layout-admin.scss',
})
export class LayoutAdmin {
  private readonly session = inject(Session);
  private readonly router = inject(Router);
  private readonly confirmacion = inject(ConfirmacionService);

  protected readonly usuario = this.session.usuario;
  protected readonly menuMovilAbierto = signal(false);

  protected get iniciales(): string {
    return obtenerIniciales(this.usuario()?.nombreCompleto) || 'AD';
  }

  protected toggleMenuMovil(): void {
    this.menuMovilAbierto.update((abierto) => !abierto);
  }

  protected cerrarMenuMovil(): void {
    this.menuMovilAbierto.set(false);
  }

  async cerrarSesion(): Promise<void> {
    const confirmado = await this.confirmacion.preguntar({
      titulo: 'Cerrar sesión',
      mensaje: '¿Deseas salir de tu sesión ahora?',
      textoConfirmar: 'Sí, cerrar sesión',
      textoCancelar: 'Seguir aquí',
      variante: 'peligro',
    });
    if (!confirmado) return;

    this.session.cerrarSesion().subscribe(() => {
      void this.router.navigate(['/catalogo']);
    });
  }
}
