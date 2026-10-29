import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_URL } from '../../core/api/api.config';
import { PagosApiService } from './pagos-api.service';

/** EP06 · HU-047 — Matrícula pagada con Culqi: inicio del pago, token, consulta de resultado y constancia. */
describe('PagosApiService', () => {
  let servicio: PagosApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(PagosApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('inicia el pago confirmando el importe vigente que vio el alumno', () => {
    let pedido = '';
    servicio.iniciar(7, 320).subscribe((c) => (pedido = c.numeroPedido));

    const solicitud = http.expectOne(`${API_URL}/app/cursos/7/pagos/iniciar`);
    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual({ importeConfirmado: 320 });
    solicitud.flush({ numeroPedido: 'PED-2026-000011', montoCentimos: 32000 });

    expect(pedido).toBe('PED-2026-000011');
  });

  it('si el precio cambió el servidor responde PRICE_CHANGED y no se inicia el pago', () => {
    let codigo = '';
    servicio.iniciar(7, 250).subscribe({ error: (e) => (codigo = e.error.code) });

    http.expectOne(`${API_URL}/app/cursos/7/pagos/iniciar`).flush(
      { code: 'PRICE_CHANGED', message: 'El precio vigente es S/ 320.00. Confírmalo para continuar.' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(codigo).toBe('PRICE_CHANGED');
  });

  it('envía el token del checkout para que el servidor cobre', () => {
    let estado = '';
    servicio.enviarToken('PED-2026-000011', 'tkn_test_abc').subscribe((p) => (estado = p.estado));

    const solicitud = http.expectOne(`${API_URL}/app/pagos/PED-2026-000011/token`);
    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual({ tokenId: 'tkn_test_abc' });
    solicitud.flush({ numeroPedido: 'PED-2026-000011', estado: 'APROBADO' });

    expect(estado).toBe('APROBADO');
  });

  it('consulta el estado de un intento y sus intentos por curso', () => {
    servicio.detalle('PED-2026-000011').subscribe();
    servicio.intentos(7).subscribe();

    const detalle = http.expectOne(`${API_URL}/app/pagos/PED-2026-000011`);
    expect(detalle.request.method).toBe('GET');
    detalle.flush({ estado: 'PENDIENTE' });
    const intentos = http.expectOne(`${API_URL}/app/cursos/7/pagos`);
    expect(intentos.request.method).toBe('GET');
    intentos.flush({ estadoMatricula: 'PENDIENTE_PAGO', pendiente: null, intentos: [] });
  });

  it('la constancia solo existe para un pago aprobado: otro estado responde 400', () => {
    let mensaje = '';
    servicio.constancia('PED-2026-000010').subscribe({ error: (e) => (mensaje = e.error.message) });

    http.expectOne(`${API_URL}/app/pagos/PED-2026-000010/constancia`).flush(
      { message: 'La constancia solo existe para un pago aprobado por Culqi. Este intento está RECHAZADO.' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(mensaje).toContain('La constancia solo existe para un pago aprobado');
  });

  it('reenvía el aviso del resultado con POST', () => {
    servicio.reenviarAviso('PED-2026-000011').subscribe();

    const solicitud = http.expectOne(`${API_URL}/app/pagos/PED-2026-000011/reenviar-aviso`);
    expect(solicitud.request.method).toBe('POST');
    solicitud.flush({ estadoCorreo: 'ENVIADO' });
  });
});
