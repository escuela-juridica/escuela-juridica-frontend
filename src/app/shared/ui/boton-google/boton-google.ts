import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { environment } from '../../../../environments/environment';
import { GoogleIdentityService, TextoBotonGoogle } from '../../../core/google/google-identity.service';

const ANCHO_MINIMO = 200;
const ANCHO_MAXIMO = 400;
const ANCHO_POR_DEFECTO = 320;

@Component({
  selector: 'app-boton-google',
  template: `
    <div #contenedor class="boton-google"></div>

    @if (fallo()) {
      <div class="alerta alerta--error">
        <span class="alerta__icono">!</span>
        <div>
          <div class="alerta__titulo">Google no disponible</div>
          <div class="alerta__texto">
            No pudimos cargar el acceso con Google. Revisa tu conexión e inténtalo de nuevo.
          </div>
          <button type="button" class="btn btn--neutro" (click)="montar()">Reintentar</button>
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .boton-google {
      display: flex;
      justify-content: center;
      min-height: 44px;
    }
  `,
})
export class BotonGoogle implements AfterViewInit {
  readonly texto = input<TextoBotonGoogle>('continue_with');
  readonly credencial = output<string>();

  private readonly contenedor = viewChild.required<ElementRef<HTMLElement>>('contenedor');

  private readonly identidad = inject(GoogleIdentityService);

  protected readonly fallo = signal(false);

  ngAfterViewInit(): void {
    void this.montar();
  }

  protected async montar(): Promise<void> {
    this.fallo.set(false);
    try {
      const google = await this.identidad.cargar();
      const elemento = this.contenedor().nativeElement;
      google.initialize({
        client_id: environment.googleClientId,
        callback: (respuesta) => {
          if (respuesta.credential) {
            this.credencial.emit(respuesta.credential);
          }
        },
        ux_mode: 'popup',
        auto_select: false,
      });
      elemento.replaceChildren();
      google.renderButton(elemento, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: this.texto(),
        shape: 'rectangular',
        logo_alignment: 'center',
        locale: 'es',
        width: this.anchoDisponible(elemento),
      });
    } catch {
      this.fallo.set(true);
    }
  }

  private anchoDisponible(elemento: HTMLElement): number {
    const medido = Math.round(elemento.getBoundingClientRect().width) || ANCHO_POR_DEFECTO;
    return Math.min(ANCHO_MAXIMO, Math.max(ANCHO_MINIMO, medido));
  }
}
