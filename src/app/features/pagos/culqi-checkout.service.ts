import { Injectable } from '@angular/core';

import { LIMITE_BILLETERA_SOLES } from '../cursos/curso-formato.util';
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
const ORIGEN_CHECKOUT = 'https://checkoutview.culqi.com';

/** Valor de `object` en un mensaje del checkout, que llega como objeto o como JSON en texto. */
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
  /** Tarjeta o Yape: Culqi entregó un token que el servidor debe cobrar. */
  alCrearToken: (tokenId: string) => void;
  /** Billetera: Culqi tiene la orden y avisará el resultado por separado. */
  alCrearOrden: () => void;
  alFallar: (mensaje: string) => void;
}

/**
 * HU-047 — Abre Culqi Checkout con la orden de un intento. Solo se ofrecen Yape y billeteras digitales (Plin):
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
    // Yape y billeteras digitales; la tarjeta solo cuando el monto supera el límite de las billeteras (ver LIMITE_BILLETERA_SOLES).
    const admiteBilletera = pago.montoCentimos <= LIMITE_BILLETERA_SOLES * 100;
    const paymentMethods = { tarjeta: !admiteBilletera, yape: true, billetera: admiteBilletera, bancaMovil: false, agente: false, cuotealo: false };
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
        // El modal no se cierra aquí: muestra el QR y las instrucciones de la billetera hasta que el alumno pulse "De acuerdo".
        manejadores.alCrearOrden();
      } else {
        manejadores.alFallar(culqi.error?.user_message ?? 'Culqi no pudo completar la operación.');
      }
    };
    culqi.open();
  }

  /** Culqi avisa con `closeCheckout` cuando el alumno termina (por ejemplo, "De acuerdo" tras ver el QR): se asegura el cierre. */
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
