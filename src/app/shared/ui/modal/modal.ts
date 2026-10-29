import { AfterViewInit, Component, ElementRef, HostListener, Input, OnDestroy, ViewChild, output } from '@angular/core';

/** Modal genérico centrado. El fondo bloquea la interacción con la pantalla, pero no cierra el
 * formulario: el cierre siempre requiere Escape, la X, Cancelar o una acción explícita. */
@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
})
export class Modal implements AfterViewInit, OnDestroy {
  @Input() titulo = '';
  @Input() ancho: 'md' | 'lg' = 'md';
  readonly cerrar = output<void>();
  @ViewChild('cajaModal') private cajaModal?: ElementRef<HTMLElement>;
  private observadorAlertas?: MutationObserver;

  @HostListener('document:keydown.escape')
  protected alEscape(): void {
    this.cerrar.emit();
  }

  ngAfterViewInit(): void {
    const caja = this.cajaModal?.nativeElement;
    if (!caja) {
      return;
    }
    this.observadorAlertas = new MutationObserver(() => {
      // Los avisos exitosos no interrumpen al usuario. Solo subimos cuando debe leer un error o
      // información importante insertada en la parte superior del formulario.
      if (caja.querySelector('.alerta--error, .alerta--info')) {
        caja.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
    this.observadorAlertas.observe(caja, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  ngOnDestroy(): void {
    this.observadorAlertas?.disconnect();
  }

}
