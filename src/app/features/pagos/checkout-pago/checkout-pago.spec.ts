import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { API_URL } from '../../../core/api/api.config';
import { AlertaGlobalService } from '../../../core/notificaciones/alerta-global.service';
import { FichaCursoDetalle } from '../../cursos/curso.model';
import { CulqiCheckoutService, ManejadoresCulqi } from '../culqi-checkout.service';
import { PagoCheckout, PagoDetalle, PagosCurso } from '../pago.model';
import { CheckoutPago } from './checkout-pago';

const URL_CURSO = 'derecho-procesal-penal';
const PEDIDO = 'PED-2026-000011';

function ficha(extra: Partial<FichaCursoDetalle['estadoComercial']> = {}): FichaCursoDetalle {
  return {
    cursoId: 7, urlAmigable: URL_CURSO, titulo: 'Derecho Procesal Penal', descripcion: null, imagenPortadaUrl: null,
    modalidad: 'VIRTUAL', tipoVenta: 'PAGADO', tipoCursoCodigo: null, tipoCursoNombre: 'Curso', categoriaCodigo: null,
    categoriaNombre: null, entidadCertificadoraNombre: null, entidadCertificadoraLogoUrl: null, horasAcademicas: 40,
    beneficios: [], fechaInicio: null, fechaFin: null, docentes: [], modulos: [],
    estadoComercial: {
      codigo: 'IMMEDIATE_START', etiqueta: 'Inicio inmediato', fechaInicio: null, matriculaPermitida: true,
      precioActual: 320, precioRegular: 320, promocionActiva: false, accion: 'PAY_NOW', ...extra,
    },
  } as FichaCursoDetalle;
}

function intentos(extra: Partial<PagosCurso> = {}): PagosCurso {
  return { estadoMatricula: null, pendiente: null, intentos: [], ...extra };
}

const CHECKOUT: PagoCheckout = {
  numeroPedido: PEDIDO, importe: 320, moneda: 'PEN', reanudado: false, llavePublica: 'pk_test_demo', ordenId: `ord_${PEDIDO}`,
  montoCentimos: 32000, titulo: 'Escuela Jurídica', correo: 'ana@example.com', nombres: 'Ana', apellidos: 'Pérez',
};

/** EP06 · HU-047 — Confirmación de compra: precio vigente, confirmación, checkout de Culqi y resultado. */
describe('CheckoutPago', () => {
  let fixture: ComponentFixture<CheckoutPago>;
  let http: HttpTestingController;
  let navegar: ReturnType<typeof vi.spyOn>;
  let manejadores: ManejadoresCulqi | null;
  const abrirCulqi = vi.fn();

  const leer = <T>(nombre: string): T => (fixture.componentInstance as unknown as Record<string, () => T>)[nombre]();
  const accion = (nombre: string, ...args: unknown[]): void =>
    (fixture.componentInstance as unknown as Record<string, (...a: unknown[]) => void>)[nombre](...args);
  const marcarConfirmacion = (marcado: boolean): void =>
    accion('alternarConfirmacion', { target: { checked: marcado } } as unknown as Event);

  async function abrir(respuestaFicha: FichaCursoDetalle = ficha(), respuestaIntentos: PagosCurso = intentos()): Promise<void> {
    manejadores = null;
    abrirCulqi.mockReset();
    abrirCulqi.mockImplementation((_pago: PagoCheckout, m: ManejadoresCulqi) => {
      manejadores = m;
      return Promise.resolve();
    });
    await TestBed.configureTestingModule({
      imports: [CheckoutPago],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ urlAmigable: URL_CURSO })) } },
        { provide: CulqiCheckoutService, useValue: { abrir: abrirCulqi } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(CheckoutPago);
    fixture.detectChanges();
    http.expectOne(`${API_URL}/publico/cursos/${URL_CURSO}`).flush(respuestaFicha);
    http.expectOne(`${API_URL}/app/cursos/7/pagos`).flush(respuestaIntentos);
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.inject(AlertaGlobalService).cerrar();
    vi.restoreAllMocks();
    http.verify();
  });

  it('carga el curso y los intentos previos y deja la compra lista para confirmar', async () => {
    await abrir();

    expect(leer<string>('estado')).toBe('listo');
    expect(leer<boolean>('puedePagar')).toBe(true);
    expect(leer<string[]>('medios')).toEqual(['Tarjeta de crédito o débito', 'Yape']);
    expect(leer<boolean>('confirmado')).toBe(false);
  });

  it('si el alumno ya tiene la matrícula activa lo lleva a su panel en lugar de cobrar otra vez', async () => {
    await abrir(ficha(), intentos({ estadoMatricula: 'ACTIVA' }));

    expect(navegar).toHaveBeenCalledWith(['/app/panel']);
  });

  it('un curso gratuito no pasa por el pago', async () => {
    await abrir(ficha({ accion: 'ACCESS_FREE', precioActual: 0 }));

    expect(navegar).toHaveBeenCalledWith(['/app/panel']);
  });

  it('un curso inexistente informa que no se encontró', async () => {
    await TestBed.configureTestingModule({
      imports: [CheckoutPago],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ urlAmigable: 'no-existe' })) } },
        { provide: CulqiCheckoutService, useValue: { abrir: abrirCulqi } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CheckoutPago);
    fixture.detectChanges();

    http.expectOne(`${API_URL}/publico/cursos/no-existe`).flush({ message: 'x' }, { status: 404, statusText: 'Not Found' });

    expect(leer<string>('estado')).toBe('error');
    expect(leer<string>('mensajeError')).toBe('No encontramos este curso.');
  });

  it('sin confirmar el precio no se inicia ningún pago', async () => {
    await abrir();

    accion('pagar');

    http.expectNone(() => true);
    expect(abrirCulqi).not.toHaveBeenCalled();
  });

  it('confirmado el precio inicia el pago, abre Culqi y al recibir el token lo envía y va al resultado', async () => {
    await abrir();
    marcarConfirmacion(true);

    accion('pagar');
    const inicio = http.expectOne(`${API_URL}/app/cursos/7/pagos/iniciar`);
    expect(inicio.request.method).toBe('POST');
    expect(inicio.request.body).toEqual({ importeConfirmado: 320 });
    inicio.flush(CHECKOUT);
    await fixture.whenStable();

    expect(abrirCulqi).toHaveBeenCalledTimes(1);
    expect(abrirCulqi.mock.calls[0][0]).toEqual(CHECKOUT);

    manejadores!.alCrearToken('tkn_test_abc');
    const cobro = http.expectOne(`${API_URL}/app/pagos/${PEDIDO}/token`);
    expect(cobro.request.body).toEqual({ tokenId: 'tkn_test_abc' });
    cobro.flush({ numeroPedido: PEDIDO, estado: 'APROBADO' });

    expect(navegar).toHaveBeenCalledWith(['/app/pagos', PEDIDO]);
  });

  it('si el cobro del token falla avisa y lleva igual a la pantalla de resultado para ver el estado real', async () => {
    await abrir();
    marcarConfirmacion(true);
    accion('pagar');
    http.expectOne(`${API_URL}/app/cursos/7/pagos/iniciar`).flush(CHECKOUT);
    await fixture.whenStable();

    manejadores!.alCrearToken('tkn_test_abc');
    http.expectOne(`${API_URL}/app/pagos/${PEDIDO}/token`).flush('error', { status: 502, statusText: 'Bad Gateway' });

    expect(TestBed.inject(AlertaGlobalService).alerta()?.tipo).toBe('error');
    expect(navegar).toHaveBeenCalledWith(['/app/pagos', PEDIDO]);
  });

  it('si el precio cambió pide confirmarlo otra vez y vuelve a cargar el precio vigente', async () => {
    await abrir();
    marcarConfirmacion(true);

    accion('pagar');
    http.expectOne(`${API_URL}/app/cursos/7/pagos/iniciar`).flush(
      { code: 'PRICE_CHANGED', message: 'El precio vigente es S/ 350.00. Confírmalo para continuar.' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(leer<boolean>('confirmado')).toBe(false);
    expect(leer<string | null>('errorPago')).toBe('El precio vigente es S/ 350.00. Confírmalo para continuar.');
    http.expectOne(`${API_URL}/publico/cursos/${URL_CURSO}`).flush(ficha({ precioActual: 350 }));
    expect(leer<FichaCursoDetalle>('ficha').estadoComercial.precioActual).toBe(350);
    expect(abrirCulqi).not.toHaveBeenCalled();
  });

  it('un error al iniciar el pago muestra el mensaje del servidor y no abre Culqi', async () => {
    await abrir();
    marcarConfirmacion(true);

    accion('pagar');
    http.expectOne(`${API_URL}/app/cursos/7/pagos/iniciar`).flush(
      { message: 'Este curso fue cancelado: ya no admite pagos.' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(leer<string | null>('errorPago')).toBe('Este curso fue cancelado: ya no admite pagos.');
    expect(leer<boolean>('procesando')).toBe(false);
    expect(abrirCulqi).not.toHaveBeenCalled();
  });

  it('con un intento pendiente se reanuda sin volver a confirmar el precio', async () => {
    await abrir(ficha({ matriculaPermitida: false }), intentos({ estadoMatricula: 'PENDIENTE_PAGO', pendiente: PEDIDO }));
    const pendiente: Partial<PagoDetalle> = { numeroPedido: PEDIDO, estado: 'PENDIENTE', instrucciones: null };
    http.expectOne(`${API_URL}/app/pagos/${PEDIDO}`).flush(pendiente);

    expect(leer<string | null>('enProceso')).toBe(PEDIDO);
    expect(leer<boolean>('puedePagar')).toBe(true);

    accion('pagar');
    http.expectOne(`${API_URL}/app/cursos/7/pagos/iniciar`).flush({ ...CHECKOUT, reanudado: true });
    await fixture.whenStable();

    expect(abrirCulqi).toHaveBeenCalledTimes(1);
  });

  it('muestra los intentos anteriores que no quedaron pendientes', async () => {
    const rechazado = { numeroPedido: 'PED-2026-000010', estado: 'RECHAZADO' } as PagoDetalle;
    const pendiente = { numeroPedido: PEDIDO, estado: 'PENDIENTE' } as PagoDetalle;

    await abrir(ficha(), intentos({ estadoMatricula: 'PENDIENTE_PAGO', intentos: [pendiente, rechazado] }));

    expect(leer<PagoDetalle[]>('anteriores').map((i) => i.numeroPedido)).toEqual(['PED-2026-000010']);
  });
});
