import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cabecera-detalle',
  templateUrl: './cabecera-detalle.html',
  styleUrl: './cabecera-detalle.scss',
})
export class CabeceraDetalle {
  readonly etiqueta = input.required<string>();
  readonly titulo = input.required<string>();
}

@Component({
  selector: 'app-enlace-volver',
  imports: [RouterLink],
  template: `
    <a class="ev" [routerLink]="ruta()">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
      {{ texto() }}
    </a>
  `,
  styles: `
    :host {
      display: block;
      align-self: flex-start;
    }

    .ev {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px 6px 8px;
      border-radius: var(--radio-completo);
      font-size: 14px;
      font-weight: 600;
      color: var(--neutral-600);
      text-decoration: none;
      transition:
        background-color 0.15s ease,
        color 0.15s ease;
    }

    .ev:hover {
      background: var(--neutral-100);
      color: var(--marca-900);
      text-decoration: none;
    }
  `,
})
export class EnlaceVolver {
  readonly ruta = input.required<string>();
  readonly texto = input.required<string>();
}
