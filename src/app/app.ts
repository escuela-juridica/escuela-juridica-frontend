import { DOCUMENT } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router, RouterOutlet } from '@angular/router';
import { NgxSpinnerComponent } from 'ngx-spinner';
import { filter, take } from 'rxjs';

import { AlertaGlobalComponent } from './shared/ui/alerta-global/alerta-global';
import { ConfirmacionDialog } from './shared/ui/confirmacion-dialog/confirmacion-dialog';

/** Si la primera ruta tardara más que esto (red muy lenta), se retira igual la pantalla de carga. */
const ESPERA_MAXIMA_PANTALLA_CARGA_MS = 10_000;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NgxSpinnerComponent, ConfirmacionDialog, AlertaGlobalComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('escuela-juridica-frontend');

  private readonly documento = inject(DOCUMENT);

  constructor() {
    // La pantalla de carga de index.html cubre la descarga de la aplicación, la restauración de la sesión y la carga de
    // la primera pantalla; se retira cuando termina la primera navegación (con éxito o no).
    const router = inject(Router);
    if (router.navigated) {
      this.retirarPantallaDeCarga();
      return;
    }
    router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError),
        take(1),
      )
      .subscribe(() => this.retirarPantallaDeCarga());
    setTimeout(() => this.retirarPantallaDeCarga(), ESPERA_MAXIMA_PANTALLA_CARGA_MS);
  }

  private retirarPantallaDeCarga(): void {
    const pantalla = this.documento.getElementById('esejur-splash');
    if (!pantalla) return;
    pantalla.classList.add('esejur-splash--oculto');
    setTimeout(() => pantalla.remove(), 300);
  }
}
