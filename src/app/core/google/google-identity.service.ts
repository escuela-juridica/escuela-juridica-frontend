import { Injectable } from '@angular/core';

export type TextoBotonGoogle = 'signin_with' | 'signup_with' | 'continue_with';

export interface RespuestaCredencialGoogle {
  credential?: string;
}

interface ConfiguracionInicioGoogle {
  client_id: string;
  callback: (respuesta: RespuestaCredencialGoogle) => void;
  ux_mode?: 'popup' | 'redirect';
  auto_select?: boolean;
}

interface ConfiguracionBotonGoogle {
  type: 'standard';
  theme: 'outline' | 'filled_blue' | 'filled_black';
  size: 'large' | 'medium' | 'small';
  text: TextoBotonGoogle;
  shape: 'rectangular' | 'pill';
  logo_alignment: 'left' | 'center';
  locale: string;
  width: number;
}

export interface GoogleAccountsId {
  initialize(configuracion: ConfiguracionInicioGoogle): void;
  renderButton(elemento: HTMLElement, configuracion: ConfiguracionBotonGoogle): void;
}

interface VentanaGoogle {
  google?: { accounts?: { id?: GoogleAccountsId } };
}

const URL_SCRIPT = 'https://accounts.google.com/gsi/client';

@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
  private carga: Promise<GoogleAccountsId> | null = null;

  cargar(): Promise<GoogleAccountsId> {
    this.carga ??= new Promise<GoogleAccountsId>((resolver, rechazar) => {
      const disponible = (): GoogleAccountsId | undefined =>
        (window as unknown as VentanaGoogle).google?.accounts?.id;

      const existente = disponible();
      if (existente) {
        resolver(existente);
        return;
      }

      const script = document.createElement('script');
      script.src = URL_SCRIPT;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        const identidad = disponible();
        if (identidad) {
          resolver(identidad);
        } else {
          this.carga = null;
          rechazar(new Error('Google Identity Services no está disponible'));
        }
      };
      script.onerror = () => {
        this.carga = null;
        script.remove();
        rechazar(new Error('No se pudo cargar Google Identity Services'));
      };
      document.head.appendChild(script);
    });
    return this.carga;
  }
}
