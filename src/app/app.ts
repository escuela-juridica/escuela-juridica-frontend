import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgxSpinnerComponent } from 'ngx-spinner';

import { PantallaCargaService } from './core/pantalla-carga/pantalla-carga.service';
import { AlertaGlobalComponent } from './shared/ui/alerta-global/alerta-global';
import { ConfirmacionDialog } from './shared/ui/confirmacion-dialog/confirmacion-dialog';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NgxSpinnerComponent, ConfirmacionDialog, AlertaGlobalComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('escuela-juridica-frontend');

  constructor() {
    inject(PantallaCargaService).retirarCuandoLaRutaEsteLista();
  }
}
