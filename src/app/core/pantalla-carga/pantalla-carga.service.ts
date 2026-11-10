import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router } from '@angular/router';
import { filter, take } from 'rxjs';

const ID_PANTALLA = 'esejur-splash';
const CLASE_OCULTA = 'esejur-splash--oculto';
const ESPERA_MAXIMA_MS = 10_000;
const DURACION_TRANSICION_MS = 300;

@Injectable({ providedIn: 'root' })
export class PantallaCargaService {
  private readonly documento = inject(DOCUMENT);
  private readonly router = inject(Router);

  retirarCuandoLaRutaEsteLista(): void {
    if (this.router.navigated) {
      this.retirar();
      return;
    }
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError),
        take(1),
      )
      .subscribe(() => this.retirar());
    setTimeout(() => this.retirar(), ESPERA_MAXIMA_MS);
  }

  private retirar(): void {
    const pantalla = this.documento.getElementById(ID_PANTALLA);
    if (!pantalla) return;
    pantalla.classList.add(CLASE_OCULTA);
    setTimeout(() => pantalla.remove(), DURACION_TRANSICION_MS);
  }
}
