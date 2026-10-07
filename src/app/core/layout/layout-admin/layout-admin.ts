import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { obtenerIniciales } from '../../session/nombre-utils';
import { Session } from '../../session/session';

/**
 * Navbar + riel según el prototipo real de HU-008 (Figma: EP02-PF-010-HU-008-Gestión de
 * usuarios), adaptado a navbar superior + riel de íconos. ⚠️ Solo "Usuarios" está construido;
 * el resto de secciones del mockup se listan deshabilitadas porque pertenecen a otras historias
 * todavía no implementadas. El botón "Salir" del navbar no aparece en el mockup — se agregó
 * porque hace falta alguna forma de cerrar sesión.
 */
@Component({
  selector: 'app-layout-admin',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout-admin.html',
  styleUrl: './layout-admin.scss',
})
export class LayoutAdmin {
  private readonly session = inject(Session);
  private readonly router = inject(Router);

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

  cerrarSesion(): void {
    this.session.cerrarSesion().subscribe(() => {
      void this.router.navigate(['/catalogo']);
    });
  }
}
