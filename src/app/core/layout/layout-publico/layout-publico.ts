import { Component, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { FooterPublico } from '../footer-publico/footer-publico';
import { obtenerIniciales } from '../../session/nombre-utils';
import { Session } from '../../session/session';
import { ConfirmacionService } from '../../dialogo/confirmacion.service';

@Component({
  selector: 'app-layout-publico',
  imports: [RouterOutlet, RouterLink, FooterPublico],
  templateUrl: './layout-publico.html',
  styleUrl: './layout-publico.scss',
})
export class LayoutPublico {
  private readonly session = inject(Session);
  private readonly router = inject(Router);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly menuCuentaRef = viewChild<ElementRef<HTMLElement>>('menuCuenta');

  protected readonly usuario = this.session.usuario;
  protected readonly estaAutenticado = this.session.estaAutenticado;
  protected readonly menuCuentaAbierto = signal(false);

  @HostListener('document:click', ['$event'])
  protected cerrarMenuAlHacerClicFuera(evento: MouseEvent): void {
    const menu = this.menuCuentaRef()?.nativeElement;
    if (menu && !menu.contains(evento.target as Node)) this.menuCuentaAbierto.set(false);
  }

  @HostListener('document:keydown.escape')
  protected cerrarMenuConEscape(): void {
    this.menuCuentaAbierto.set(false);
  }

  protected alternarMenuCuenta(): void {
    this.menuCuentaAbierto.update((abierto) => !abierto);
  }

  protected cerrarMenuCuenta(): void {
    this.menuCuentaAbierto.set(false);
  }

  protected get iniciales(): string {
    return obtenerIniciales(this.usuario()?.nombreCompleto);
  }

  protected async cerrarSesion(): Promise<void> {
    const confirmado = await this.confirmacion.preguntar({
      titulo: 'Cerrar sesión',
      mensaje: '¿Deseas salir de tu sesión ahora?',
      textoConfirmar: 'Sí, cerrar sesión',
      textoCancelar: 'Seguir aquí',
      variante: 'peligro',
    });
    if (!confirmado) return;

    this.cerrarMenuCuenta();
    this.session.cerrarSesion().subscribe(() => void this.router.navigate(['/catalogo']));
  }
}
