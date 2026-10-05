import { Component, HostListener, Input, output } from '@angular/core';

/** Modal genérico centrado, con fondo oscuro y cierre por click afuera o Escape. El contenido
 * se proyecta con <ng-content>. */
@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
})
export class Modal {
  @Input() titulo = '';
  @Input() ancho: 'md' | 'lg' = 'md';
  readonly cerrar = output<void>();

  @HostListener('document:keydown.escape')
  protected alEscape(): void {
    this.cerrar.emit();
  }

  protected alClicFondo(): void {
    this.cerrar.emit();
  }
}
