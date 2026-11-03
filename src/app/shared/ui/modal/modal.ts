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
  @Input() ancho: 'md' | 'lg' | 'xl' = 'md';
  readonly cerrar = output<void>();
  @ViewChild('cajaModal') private cajaModal?: ElementRef<HTMLElement>;
  private observadorAlertas?: MutationObserver;

  @HostListener('document:keydown.escape')
  protected alEscape(): void {
    // Con modales apilados (detalle → seguimiento → acción) Escape cierra solo el de encima: el
    // más anidado queda último en el DOM porque se proyecta dentro del cuerpo de su padre.
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
      // Los avisos exitosos no interrumpen al usuario. Solo subimos cuando APARECE un error o
      // información importante; un aviso que ya estaba (p. ej. al cambiar de pestaña dentro del
      // modal) no debe devolver el scroll al inicio.
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
