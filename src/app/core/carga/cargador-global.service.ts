import { Injectable, inject } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';

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
