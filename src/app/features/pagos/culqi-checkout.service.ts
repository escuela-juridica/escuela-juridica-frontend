import { Injectable } from '@angular/core';

import { BILLETERAS_HABILITADAS, LIMITE_BILLETERA_SOLES } from '../cursos/curso-formato.util';
import { PagoCheckout } from './pago.model';

interface CulqiInstancia {
  token?: { id: string };
  order?: { id: string };
  error?: { user_message?: string; merchant_message?: string };
  culqi: () => void;
  open: () => void;
  close: () => void;
}

declare global {
  interface Window {
    CulqiCheckout?: new (llavePublica: string, configuracion: unknown) => CulqiInstancia;
  }
}

const URL_SCRIPT = 'https://js.culqi.com/checkout-js';
const ORIGEN_CHECKOUT = 'https://checkoutview.culqi.com';

function leerObjeto(datos: unknown): string | null {
  try {
    const mensaje = typeof datos === 'string' ? (JSON.parse(datos) as unknown) : datos;
    const tipo = (mensaje as { object?: unknown } | null)?.object;
    return typeof tipo === 'string' ? tipo : null;
  } catch {
    return null;
  }
}

export interface ManejadoresCulqi {
  alCrearToken: (tokenId: string) => void;
  alCrearOrden: () => void;
  alFallar: (mensaje: string) => void;
}

@Injectable({ providedIn: 'root' })
export class CulqiCheckoutService {
  private cargaScript: Promise<void> | null = null;

  async abrir(pago: PagoCheckout, manejadores: ManejadoresCulqi): Promise<void> {
    await this.cargarScript();
    const constructor = window.CulqiCheckout;
    if (!constructor) {
      manejadores.alFallar('No pudimos cargar el checkout de Culqi.');
      return;
    }
    const sobreLimiteBilletera = pago.montoCentimos > LIMITE_BILLETERA_SOLES * 100;
    const paymentMethods = {
      tarjeta: true,
      yape: true,
      billetera: BILLETERAS_HABILITADAS && !sobreLimiteBilletera,
      bancaMovil: false,
      agente: false,
      cuotealo: false,
    };
    const culqi = new constructor(pago.llavePublica, {
      settings: { title: pago.titulo, currency: pago.moneda, amount: pago.montoCentimos, order: pago.ordenId },
      client: { email: pago.correo, firstName: pago.nombres, lastName: pago.apellidos },
      options: {
        lang: 'es',
        modal: true,
        installments: false,
        paymentMethods,
        paymentMethodsSort: Object.keys(paymentMethods),
      },
    });
    const dejarDeEscuchar = this.cerrarAlTerminar(culqi);
    culqi.culqi = () => {
      if (culqi.token) {
        const tokenId = culqi.token.id;
        dejarDeEscuchar();
        culqi.close();
        manejadores.alCrearToken(tokenId);
      } else if (culqi.order) {
        manejadores.alCrearOrden();
      } else {
        manejadores.alFallar(culqi.error?.user_message ?? 'Culqi no pudo completar la operación.');
      }
    };
    culqi.open();
  }

  private cerrarAlTerminar(culqi: CulqiInstancia): () => void {
    const alMensaje = (evento: MessageEvent): void => {
      if (evento.origin !== ORIGEN_CHECKOUT || leerObjeto(evento.data) !== 'closeCheckout') return;
      window.removeEventListener('message', alMensaje);
      setTimeout(() => culqi.close());
    };
    window.addEventListener('message', alMensaje);
    return () => window.removeEventListener('message', alMensaje);
  }

  private cargarScript(): Promise<void> {
    if (window.CulqiCheckout) {
      return Promise.resolve();
    }
    this.cargaScript ??= new Promise<void>((resolver, rechazar) => {
      const script = document.createElement('script');
      script.src = URL_SCRIPT;
      script.async = true;
      script.onload = () => resolver();
      script.onerror = () => {
        this.cargaScript = null;
        rechazar(new Error('No se pudo cargar Culqi Checkout.'));
      };
      document.head.appendChild(script);
    });
    return this.cargaScript;
  }
}
