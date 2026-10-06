import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgxSpinnerComponent } from 'ngx-spinner';

import { ConfirmacionDialog } from './shared/ui/confirmacion-dialog/confirmacion-dialog';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NgxSpinnerComponent, ConfirmacionDialog],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('escuela-juridica-frontend');
}
