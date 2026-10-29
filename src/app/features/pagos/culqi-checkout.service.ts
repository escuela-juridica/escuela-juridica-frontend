import { Injectable } from '@angular/core';

import { PagoCheckout } from './pago.model';

/** Culqi Checkout Custom: https://docs.culqi.com/es/documentacion/checkout/checkout-custom */
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

export interface ManejadoresCulqi {
  /** Tarjeta o Yape: Culqi entregó un token que el servidor debe cobrar. */
  alCrearToken: (tokenId: string) => void;
  /** Billetera: Culqi tiene la orden y avisará el resultado por separado. */
  alCrearOrden: () => void;
  alFallar: (mensaje: string) => void;
}

/**
 * HU-047 — Abre Culqi Checkout con la orden de un intento. Solo se ofrecen tarjeta, Yape y billeteras (Plin):
 * PagoEfectivo, banca móvil, agentes y Cuotéalo no forman parte de este flujo. La llave pública es la única que
 * llega al navegador; la privada vive en el servidor.
 */
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
    const paymentMethods = { tarjeta: true, yape: true, billetera: true, bancaMovil: false, agente: false, cuotealo: false };
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
    culqi.culqi = () => {
      if (culqi.token) {
        const tokenId = culqi.token.id;
        culqi.close();
        manejadores.alCrearToken(tokenId);
      } else if (culqi.order) {
        culqi.close();
        manejadores.alCrearOrden();
      } else {
        manejadores.alFallar(culqi.error?.user_message ?? 'Culqi no pudo completar la operación.');
      }
    };
    culqi.open();
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
