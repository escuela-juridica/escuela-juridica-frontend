import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { API_URL } from '../../../core/api/api.config';
import { AlertaGlobalService } from '../../../core/notificaciones/alerta-global.service';
import { ConstanciaPago, PagoDetalle } from '../pago.model';
import { ResultadoPago } from './resultado-pago';

const PEDIDO = 'PED-2026-000011';

function pago(extra: Partial<PagoDetalle> = {}): PagoDetalle {
  return {
    numeroPedido: PEDIDO, cursoId: 7, cursoTitulo: 'Derecho Procesal Penal', cursoUrlAmigable: 'derecho-procesal-penal',
    estado: 'PENDIENTE', medio: null, ultimosDigitos: null, numeroCuotas: null, importe: 320, moneda: 'PEN',
    precioRegular: 320, precioPromocional: null, mensaje: 'Culqi todavía no comunica el resultado final.',
    iniciadoEn: '2026-10-01T15:00:00Z', resultadoEn: null, constanciaNumero: null, estadoMatricula: 'PENDIENTE_PAGO',
    accesoConcedido: false, puedeReintentar: false, instrucciones: null, estadoCorreo: null, ...extra,
  };
}

const CONSTANCIA: ConstanciaPago = {
  constanciaNumero: 'CONST-2026-000011', numeroPedido: PEDIDO, importe: 320, moneda: 'PEN', medio: 'Tarjeta terminada en 1111',
  ultimosDigitos: '1111', fecha: '2026-10-01T15:05:00Z', alumno: 'Ana Pérez', correo: 'ana@example.com',
  curso: 'Derecho Procesal Penal', cursoId: 7,
};

/** EP06 · HU-047 — Resultado del pago: aprobado con constancia; pendiente, rechazado y error sin afirmar un pago. */
describe('ResultadoPago', () => {
  let fixture: ComponentFixture<ResultadoPago>;
  let http: HttpTestingController;

  const leer = <T>(nombre: string): T => (fixture.componentInstance as unknown as Record<string, () => T>)[nombre]();
  const accion = (nombre: string): void => (fixture.componentInstance as unknown as Record<string, () => void>)[nombre]();

  async function abrir(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ResultadoPago],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ numeroPedido: PEDIDO }) } } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ResultadoPago);
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.inject(AlertaGlobalService).cerrar();
    vi.useRealTimers();
    fixture.destroy();
    vi.restoreAllMocks();
    http.verify();
  });

  it('un pago aprobado muestra el resultado y pide la constancia', async () => {
    await abrir();

    http.expectOne(`${API_URL}/app/pagos/${PEDIDO}`).flush(
      pago({ estado: 'APROBADO', accesoConcedido: true, estadoMatricula: 'ACTIVA', constanciaNumero: 'CONST-2026-000011', medio: 'Yape' }),
    );
    http.expectOne(`${API_URL}/app/pagos/${PEDIDO}/constancia`).flush(CONSTANCIA);
    fixture.detectChanges();

    expect(leer<boolean>('cargando')).toBe(false);
    expect(leer<PagoDetalle>('pago').estado).toBe('APROBADO');
    expect(leer<ConstanciaPago>('constancia').constanciaNumero).toBe('CONST-2026-000011');
  });

  it('un pago rechazado no pide constancia y permite volver a intentarlo', async () => {
    await abrir();

    http.expectOne(`${API_URL}/app/pagos/${PEDIDO}`).flush(
      pago({ estado: 'RECHAZADO', puedeReintentar: true, mensaje: 'Culqi rechazó el pago: fondos insuficientes (insufficient_funds). Tu matrícula no se activó.' }),
    );
    fixture.detectChanges();

    http.expectNone(`${API_URL}/app/pagos/${PEDIDO}/constancia`);
    expect(leer<PagoDetalle>('pago').puedeReintentar).toBe(true);
    expect(leer<ConstanciaPago | null>('constancia')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Culqi rechazó el pago');
  });

  it('un pago con error tampoco concede acceso ni genera constancia', async () => {
    await abrir();

    http.expectOne(`${API_URL}/app/pagos/${PEDIDO}`).flush(pago({ estado: 'ERROR', puedeReintentar: true }));

    http.expectNone(`${API_URL}/app/pagos/${PEDIDO}/constancia`);
    expect(leer<PagoDetalle>('pago').accesoConcedido).toBe(false);
  });

  it('mientras Culqi no comunica el resultado vuelve a consultar cada pocos segundos hasta que cambia', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await abrir();

    http.expectOne(`${API_URL}/app/pagos/${PEDIDO}`).flush(pago());
    expect(leer<PagoDetalle>('pago').estado).toBe('PENDIENTE');

    vi.advanceTimersByTime(4000);
    http.expectOne(`${API_URL}/app/pagos/${PEDIDO}`).flush(pago({ estado: 'APROBADO', accesoConcedido: true, estadoMatricula: 'ACTIVA' }));
    http.expectOne(`${API_URL}/app/pagos/${PEDIDO}/constancia`).flush(CONSTANCIA);

    expect(leer<PagoDetalle>('pago').estado).toBe('APROBADO');
    // Con el resultado final deja de consultar.
    vi.advanceTimersByTime(8000);
    http.expectNone(`${API_URL}/app/pagos/${PEDIDO}`);
  });

  it('un pedido que no existe informa que no se encontró', async () => {
    await abrir();

    http.expectOne(`${API_URL}/app/pagos/${PEDIDO}`).flush({ message: 'El pago no existe.' }, { status: 404, statusText: 'Not Found' });

    expect(leer<string | null>('error')).toBe('No encontramos este pago.');
    expect(leer<boolean>('cargando')).toBe(false);
  });

  it('una falla del servidor muestra un mensaje genérico para reintentar', async () => {
    await abrir();

    http.expectOne(`${API_URL}/app/pagos/${PEDIDO}`).flush('caído', { status: 500, statusText: 'Server Error' });

    expect(leer<string | null>('error')).toBe('No pudimos consultar tu pago. Inténtalo nuevamente.');
  });

  it('reenviar el aviso avisa si el correo salió', async () => {
    await abrir();
    http.expectOne(`${API_URL}/app/pagos/${PEDIDO}`).flush(pago({ estado: 'RECHAZADO' }));

    accion('reenviarAviso');
    const solicitud = http.expectOne(`${API_URL}/app/pagos/${PEDIDO}/reenviar-aviso`);
    expect(solicitud.request.method).toBe('POST');
    solicitud.flush(pago({ estado: 'RECHAZADO', estadoCorreo: 'ENVIADO' }));

    expect(TestBed.inject(AlertaGlobalService).alerta()).toEqual({ tipo: 'exito', texto: 'Reenviamos el aviso a tu correo.' });
    expect(leer<boolean>('ocupado')).toBe(false);
  });

  it('si el aviso no se puede reenviar muestra el motivo del servidor', async () => {
    await abrir();
    http.expectOne(`${API_URL}/app/pagos/${PEDIDO}`).flush(pago());

    accion('reenviarAviso');
    http.expectOne(`${API_URL}/app/pagos/${PEDIDO}/reenviar-aviso`).flush(
      { message: 'Culqi todavía no comunica un resultado: aún no hay aviso que reenviar.' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(TestBed.inject(AlertaGlobalService).alerta()).toEqual({
      tipo: 'error',
      texto: 'Culqi todavía no comunica un resultado: aún no hay aviso que reenviar.',
    });
  });
});
