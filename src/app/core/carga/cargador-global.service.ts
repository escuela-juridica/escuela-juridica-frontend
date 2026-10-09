import { Injectable, inject } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';

/** Punto único para el indicador de carga de toda la aplicación. Mantiene un contador para que
 * una respuesta rápida no oculte el cargador mientras otra solicitud aún está en curso. */
@Injectable({ providedIn: 'root' })
export class CargadorGlobalService {
  private readonly spinner = inject(NgxSpinnerService);
  private solicitudesActivas = 0;
  private readonly nombre = 'esejur-carga-global';

  iniciar(): void {
    this.solicitudesActivas += 1;
    if (this.solicitudesActivas === 1) {
      void this.spinner.show(this.nombre);
    }
  }

  finalizar(): void {
    this.solicitudesActivas = Math.max(0, this.solicitudesActivas - 1);
    if (this.solicitudesActivas === 0) {
      void this.spinner.hide(this.nombre);
    }
  }
}
