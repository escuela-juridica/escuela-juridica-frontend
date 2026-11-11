import {
  AfterViewInit,
  Component,
  ElementRef,
  computed,
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

const ETIQUETAS: Record<TextoBotonGoogle, string> = {
  signin_with: 'Acceder con Google',
  signup_with: 'Registrarse con Google',
  continue_with: 'Continuar con Google',
};

@Component({
  selector: 'app-boton-google',
  template: `
    <div class="boton-google">
      <div class="boton-google__cara" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        <span>{{ etiqueta() }}</span>
      </div>
      <div #contenedor class="boton-google__real"></div>
    </div>

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
      position: relative;
      width: 100%;
      max-width: 400px;
      height: 40px;
      margin: 0 auto;
    }

    .boton-google__cara {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      border: 1px solid #dadce0;
      border-radius: 4px;
      background: #ffffff;
      color: #3c4043;
      font: 500 14px/1 'Google Sans', Roboto, system-ui, 'Segoe UI', sans-serif;
      letter-spacing: 0.25px;
      transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
      pointer-events: none;
    }

    .boton-google:hover .boton-google__cara {
      background: #f8faff;
      border-color: #d2e3fc;
      box-shadow: 0 1px 2px rgba(60, 64, 67, 0.2);
    }

    .boton-google__real {
      position: absolute;
      inset: 0;
      display: flex;
      justify-content: center;
      overflow: hidden;
      opacity: 0.01;
      cursor: pointer;
    }
  `,
})
export class BotonGoogle implements AfterViewInit {
  readonly texto = input<TextoBotonGoogle>('continue_with');
  readonly credencial = output<string>();

  private readonly contenedor = viewChild.required<ElementRef<HTMLElement>>('contenedor');

  private readonly identidad = inject(GoogleIdentityService);

  protected readonly fallo = signal(false);
  protected readonly etiqueta = computed(() => ETIQUETAS[this.texto()]);

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
