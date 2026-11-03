import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { API_URL } from '../../../core/api/api.config';
import { AlertaGlobalService } from '../../../core/notificaciones/alerta-global.service';
import { PageResponse } from '../../../core/api/page-response.model';
import { ExcepcionesPago } from './excepciones-pago';
import { Excepcion } from './excepciones-pago.model';

const URL = `${API_URL}/admin/atenciones-pago`;

function excepcion(id: number, estado: Excepcion['estado'] = 'PENDIENTE'): Excepcion {
  return {
    id, tipo: 'CURSO_CANCELADO', estado, descripcion: 'Culqi aprobó el pago, pero el curso fue cancelado antes del resultado.',
    resultado: estado === 'ATENDIDO' ? 'Se coordinó la devolución con Culqi.' : null, creadoEn: '2026-10-01T15:00:00Z',
    atendidoEn: null, atendidoPor: null, matriculaId: 5, alumno: 'Ana Pérez', correo: 'ana@example.com', cursoId: 7,
    curso: 'Derecho Procesal Penal', pago: null, matricula: null, cursoDetalle: null, relacionados: [],
  };
}

function pagina(items: Excepcion[]): PageResponse<Excepcion> {
  return { items, page: 0, size: 20, totalElements: items.length, totalPages: 1, first: true, last: true };
}

/** EP06 · HU-037 — Excepciones de matrícula y pago: consulta por estado y registro de la atención brindada. */
describe('ExcepcionesPago', () => {
  let fixture: ComponentFixture<ExcepcionesPago>;
  let http: HttpTestingController;

  const leer = <T>(nombre: string): T => (fixture.componentInstance as unknown as Record<string, T>)[nombre];
  const accion = (nombre: string, ...args: unknown[]): void =>
    (fixture.componentInstance as unknown as Record<string, (...a: unknown[]) => void>)[nombre](...args);
  const escribirResultado = (texto: string): void =>
    (fixture.componentInstance as unknown as { formulario: { patchValue: (v: object) => void } }).formulario.patchValue({ resultado: texto });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExcepcionesPago],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ExcepcionesPago);
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.inject(AlertaGlobalService).cerrar();
    http.verify();
  });

  /** Abre el detalle de la primera excepción de una lista pendiente. */
  function abrirDetalle(): void {
    const lista = http.expectOne((r) => r.url === URL);
    lista.flush(pagina([excepcion(1)]));
    accion('revisar', excepcion(1));
    http.expectOne(`${URL}/1`).flush(excepcion(1));
  }

  it('al abrir lista las excepciones pendientes, paginadas desde el servidor', () => {
    const solicitud = http.expectOne((r) => r.url === URL);
    expect(solicitud.request.params.get('estado')).toBe('PENDIENTE');
    expect(solicitud.request.params.get('page')).toBe('0');
    expect(solicitud.request.params.get('size')).toBe('20');
    solicitud.flush(pagina([excepcion(1), excepcion(2)]));

    expect(leer<() => Excepcion[]>('filas')().length).toBe(2);
    expect(leer<() => boolean>('cargando')()).toBe(false);
  });

  it('filtrar por tipo vuelve a la primera página con ese tipo', () => {
    http.expectOne((r) => r.url === URL).flush(pagina([excepcion(1)]));
    (fixture.componentInstance as unknown as Record<string, unknown>)['tipo'] = 'SOBRECUPO';

    accion('buscar');

    const solicitud = http.expectOne((r) => r.url === URL);
    expect(solicitud.request.params.get('tipo')).toBe('SOBRECUPO');
    expect(solicitud.request.params.get('page')).toBe('0');
    solicitud.flush(pagina([]));
  });

  it('si la lista falla informa el error del servidor', () => {
    http.expectOne((r) => r.url === URL).flush(
      { message: 'No tienes permiso para realizar esta operación' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(leer<() => string | null>('error')()).toContain('No tienes permiso');
  });

  it('revisar una excepción carga su detalle completo', () => {
    abrirDetalle();

    expect(leer<() => Excepcion | null>('seleccionada')()?.id).toBe(1);
    expect(leer<() => boolean>('cargandoDetalle')()).toBe(false);
  });

  it('no registra la atención si la descripción es demasiado corta', () => {
    abrirDetalle();
    escribirResultado('corto');

    accion('atender');

    http.expectNone((r) => r.method === 'POST');
    expect((fixture.componentInstance as unknown as { invalido: () => boolean }).invalido()).toBe(true);
  });

  it('registra la atención brindada y avisa que el pago y la matrícula no se modificaron', () => {
    abrirDetalle();
    escribirResultado('  Se coordinó la devolución directamente con Culqi.  ');

    accion('atender');

    const solicitud = http.expectOne(`${URL}/1/atender`);
    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual({ resultado: 'Se coordinó la devolución directamente con Culqi.' });
    solicitud.flush(excepcion(1, 'ATENDIDO'));

    expect(leer<() => Excepcion | null>('seleccionada')()?.estado).toBe('ATENDIDO');
    expect(TestBed.inject(AlertaGlobalService).alerta()).toEqual({
      tipo: 'exito', texto: 'Registramos la atención. El pago y la matrícula no se modificaron.',
    });
    http.expectOne((r) => r.url === URL).flush(pagina([]));
  });

  it('atender dos veces el mismo caso muestra el conflicto del servidor', () => {
    abrirDetalle();
    escribirResultado('Se intenta atender de nuevo el mismo caso.');

    accion('atender');
    http.expectOne(`${URL}/1/atender`).flush(
      { code: 'YA_ATENDIDO', message: 'Esta excepción ya fue atendida.' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(leer<() => string | null>('errorModal')()).toBe('Esta excepción ya fue atendida.');
    expect(leer<() => boolean>('guardando')()).toBe(false);
  });
});
