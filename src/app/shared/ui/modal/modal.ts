import { AfterViewInit, Component, ElementRef, HostListener, Input, OnDestroy, ViewChild, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
})
export class Modal implements AfterViewInit, OnDestroy {
  @Input() titulo = '';
  @Input() ancho: 'md' | 'lg' | 'xl' = 'md';
  readonly cerrar = output<void>();
  @ViewChild('cajaModal') private cajaModal?: ElementRef<HTMLElement>;
  private observadorAlertas?: MutationObserver;

  @HostListener('document:keydown.escape')
  protected alEscape(): void {
    const fondos = document.querySelectorAll('.modal-fondo');
    const propio = this.cajaModal?.nativeElement.parentElement;
    if (propio && fondos.length > 0 && fondos[fondos.length - 1] !== propio) {
      return;
    }
    this.cerrar.emit();
  }

  ngAfterViewInit(): void {
    const caja = this.cajaModal?.nativeElement;
    if (!caja) {
      return;
    }
    const selectorAviso = '.alerta--error, .alerta--info';
    const esAviso = (nodo: Node): boolean =>
      nodo instanceof Element && (nodo.matches(selectorAviso) || nodo.querySelector(selectorAviso) !== null);
    this.observadorAlertas = new MutationObserver((cambios) => {
      const apareceAviso = cambios.some((c) =>
        c.type === 'attributes'
          ? c.target instanceof Element && c.target.matches(selectorAviso)
          : Array.from(c.addedNodes).some(esAviso),
      );
      if (apareceAviso) {
        caja.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
    this.observadorAlertas.observe(caja, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  ngOnDestroy(): void {
    this.observadorAlertas?.disconnect();
  }

}
