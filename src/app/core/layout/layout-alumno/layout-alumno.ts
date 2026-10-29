import { Component, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { obtenerIniciales } from '../../session/nombre-utils';
import { Session } from '../../session/session';
import { ConfirmacionService } from '../../dialogo/confirmacion.service';

@Component({
  selector: 'app-layout-alumno',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout-alumno.html',
  styleUrl: './layout-alumno.scss',
})
export class LayoutAlumno {
  private readonly session = inject(Session);
  private readonly router = inject(Router);
  private readonly confirmacion = inject(ConfirmacionService);

  protected readonly usuario = this.session.usuario;
  protected readonly menuMovilAbierto = signal(false);

  private readonly movilBotonRef = viewChild<ElementRef<HTMLElement>>('movilBoton');
  private readonly movilPanelRef = viewChild<ElementRef<HTMLElement>>('movilPanel');

  protected get iniciales(): string {
    return obtenerIniciales(this.usuario()?.nombreCompleto) || 'LC';
  }

  @HostListener('document:click', ['$event'])
  protected alClicFuera(evento: MouseEvent): void {
    const objetivo = evento.target as Node;

    const dentroDeMovil =
      this.movilBotonRef()?.nativeElement.contains(objetivo) ||
      this.movilPanelRef()?.nativeElement.contains(objetivo);
    if (!dentroDeMovil) {
      this.menuMovilAbierto.set(false);
    }
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
