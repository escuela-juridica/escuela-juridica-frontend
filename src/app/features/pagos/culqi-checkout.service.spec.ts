import { TestBed } from '@angular/core/testing';

import { CulqiCheckoutService, ManejadoresCulqi } from './culqi-checkout.service';
import { PagoCheckout } from './pago.model';

const PAGO: PagoCheckout = {
  numeroPedido: 'PED-2026-000011', importe: 320, moneda: 'PEN', reanudado: false, llavePublica: 'pk_test_demo',
  ordenId: 'ord_PED-2026-000011', montoCentimos: 32000, titulo: 'Escuela Jurídica', correo: 'ana@example.com',
  nombres: 'Ana', apellidos: 'Pérez',
};

interface FalsoCulqi {
  llave: string;
  configuracion: {
    settings: { title: string; currency: string; amount: number; order: string };
    client: { email: string; firstName: string; lastName: string };
    options: { paymentMethods: Record<string, boolean>; modal: boolean; lang: string };
  };
  token?: { id: string };
  order?: { id: string };
  error?: { user_message?: string };
  culqi: () => void;
  open: () => void;
  close: () => void;
}

/** EP06 · HU-047 — Culqi Checkout: configuración del modal, medios de pago y qué hace cada resultado. */
describe('CulqiCheckoutService', () => {
  let servicio: CulqiCheckoutService;
  let instancia: FalsoCulqi;
  let manejadores: ManejadoresCulqi;

  beforeEach(() => {
    class CulqiFalso {
      token?: { id: string };
      order?: { id: string };
      error?: { user_message?: string };
      culqi = () => undefined;
      open = vi.fn();
      close = vi.fn();
      constructor(public llave: string, public configuracion: FalsoCulqi['configuracion']) {
        instancia = this as unknown as FalsoCulqi;
      }
    }
    window.CulqiCheckout = CulqiFalso as unknown as typeof window.CulqiCheckout;
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(CulqiCheckoutService);
    manejadores = { alCrearToken: vi.fn(), alCrearOrden: vi.fn(), alFallar: vi.fn() };
  });

  afterEach(() => {
    delete window.CulqiCheckout;
    document.head.querySelectorAll('script[src*="culqi"]').forEach((s) => s.remove());
  });

  it('abre el checkout con la llave pública, el monto en céntimos y la orden del intento', async () => {
    await servicio.abrir(PAGO, manejadores);

    expect(instancia.llave).toBe('pk_test_demo');
    expect(instancia.configuracion.settings).toEqual({ title: 'Escuela Jurídica', currency: 'PEN', amount: 32000, order: 'ord_PED-2026-000011' });
    expect(instancia.configuracion.client).toEqual({ email: 'ana@example.com', firstName: 'Ana', lastName: 'Pérez' });
    expect(instancia.open).toHaveBeenCalledTimes(1);
  });

  it('ofrece tarjeta y Yape y deja fuera banca móvil, agentes y cuotéalo', async () => {
    await servicio.abrir(PAGO, manejadores);

    expect(instancia.configuracion.options.paymentMethods).toMatchObject({
      tarjeta: true, yape: true, bancaMovil: false, agente: false, cuotealo: false,
    });
  });

  it('las billeteras no se ofrecen mientras estén deshabilitadas, sea cual sea el monto', async () => {
    await servicio.abrir({ ...PAGO, montoCentimos: 30000 }, manejadores);

    expect(instancia.configuracion.options.paymentMethods['billetera']).toBe(false);
  });

  it('con tarjeta o Yape cierra el modal y entrega el token para que el servidor cobre', async () => {
    await servicio.abrir(PAGO, manejadores);

    instancia.token = { id: 'tkn_test_abc' };
    instancia.culqi();

    expect(instancia.close).toHaveBeenCalledTimes(1);
    expect(manejadores.alCrearToken).toHaveBeenCalledWith('tkn_test_abc');
    expect(manejadores.alFallar).not.toHaveBeenCalled();
  });

  it('con una orden (billetera) avisa pero deja el modal abierto para mostrar el QR', async () => {
    await servicio.abrir(PAGO, manejadores);

    instancia.order = { id: 'ord_1' };
    instancia.culqi();

    expect(manejadores.alCrearOrden).toHaveBeenCalledTimes(1);
    expect(instancia.close).not.toHaveBeenCalled();
  });

  it('si Culqi informa un error entrega su mensaje para el usuario', async () => {
    await servicio.abrir(PAGO, manejadores);

    instancia.error = { user_message: 'La tarjeta fue rechazada.' };
    instancia.culqi();

    expect(manejadores.alFallar).toHaveBeenCalledWith('La tarjeta fue rechazada.');
    expect(manejadores.alCrearToken).not.toHaveBeenCalled();
  });

  it('sin mensaje de Culqi usa uno genérico', async () => {
    await servicio.abrir(PAGO, manejadores);

    instancia.culqi();

    expect(manejadores.alFallar).toHaveBeenCalledWith('Culqi no pudo completar la operación.');
  });

  it('si el script de Culqi no carga la operación se rechaza y se puede reintentar', async () => {
    delete window.CulqiCheckout;
    const promesa = servicio.abrir(PAGO, manejadores);
    const script = document.head.querySelector('script[src*="culqi"]') as HTMLScriptElement;
    expect(script).not.toBeNull();

    script.onerror?.(new Event('error'));

    await expect(promesa).rejects.toThrow('No se pudo cargar Culqi Checkout.');
    script.remove();
  });
});
