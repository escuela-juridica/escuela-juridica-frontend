import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { API_URL } from '../../../../core/api/api.config';
import { PageResponse } from '../../../../core/api/page-response.model';
import { ReportePagosPantalla } from './reporte-pagos';
import { ReportePagosApiService } from './reporte-pagos-api.service';
import { ReportePago } from './reporte-pagos.model';

const BASE = `${API_URL}/admin/reportes/pagos`;
const URL_CURSOS = `${API_URL}/admin/reportes/academico/cursos`;

function fila(id: number, estado: ReportePago['estado'], monto: number): ReportePago {
  return {
    pagoId: id, fecha: '2026-10-01T15:00:00Z', alumno: 'Ana Pérez', correo: 'ana@example.com', cursoId: 7,
    curso: 'Derecho Procesal Penal', monto, medio: 'TARJETA', estado, numeroPedido: `PED-2026-00000${id}`,
    referencia: null, origen: 'EN_LINEA', motivo: null, suma: estado === 'APROBADO',
  };
}

function pagina(items: ReportePago[], totalPages = 1, page = 0): PageResponse<ReportePago> {
  return { items, page, size: 20, totalElements: items.length, totalPages, first: page === 0, last: page === totalPages - 1 };
}

/** EP06 · HU-042 — Reporte de pagos: detalle, total confirmado y exportación comparten los mismos filtros. */
describe('ReportePagosPantalla', () => {
  let fixture: ComponentFixture<ReportePagosPantalla>;
  let http: HttpTestingController;

  const leer = <T>(nombre: string): T => (fixture.componentInstance as unknown as Record<string, T>)[nombre];
  const accion = (nombre: string, ...args: unknown[]): void =>
    (fixture.componentInstance as unknown as Record<string, (...a: unknown[]) => void>)[nombre](...args);
  const fijar = (campo: string, valor: unknown): void => {
    (fixture.componentInstance as unknown as Record<string, unknown>)[campo] = valor;
  };

  /** La pantalla pide cursos, medios, total y detalle al abrir. */
  function responderCarga(items: ReportePago[] = [fila(1, 'APROBADO', 320), fila(2, 'RECHAZADO', 320)], totalPages = 1): void {
    http.expectOne(URL_CURSOS).flush([{ id: 7, etiqueta: 'Derecho Procesal Penal', detalle: 'Virtual', fecha: null }]);
    http.expectOne(`${BASE}/medios`).flush(['tarjeta', 'yape']);
    http.expectOne((r) => r.url === `${BASE}/total`).flush({ totalConfirmado: 320, cantidadConfirmados: 1, moneda: 'PEN' });
    http.expectOne((r) => r.url === BASE).flush(pagina(items, totalPages));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportePagosPantalla],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ReportePagosPantalla);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    http.verify();
  });

  it('al abrir carga el detalle, el total confirmado y los medios para el filtro', () => {
    responderCarga();

    expect(leer<() => ReportePago[]>('filas')().map((f) => f.estado)).toEqual(['APROBADO', 'RECHAZADO']);
    expect(leer<() => { totalConfirmado: number } | null>('total')()?.totalConfirmado).toBe(320);
    expect(leer<() => string[]>('medios')()).toEqual(['tarjeta', 'yape']);
    expect(leer<() => boolean>('cargando')()).toBe(false);
  });

  it('solo el pago aprobado suma: el rechazado aparece en el detalle sin sumar', () => {
    responderCarga();

    expect(leer<() => ReportePago[]>('filas')().map((f) => f.suma)).toEqual([true, false]);
  });

  it('filtrar por estado vuelve al inicio y repite los mismos filtros en detalle y total', () => {
    responderCarga();
    fijar('estado', 'RECHAZADO');
    fijar('texto', 'ana');

    accion('buscar');

    const total = http.expectOne((r) => r.url === `${BASE}/total`);
    const detalle = http.expectOne((r) => r.url === BASE);
    for (const solicitud of [total, detalle]) {
      expect(solicitud.request.params.get('estado')).toBe('RECHAZADO');
      expect(solicitud.request.params.get('texto')).toBe('ana');
    }
    expect(detalle.request.params.get('page')).toBe('0');
    expect(detalle.request.params.get('size')).toBe('20');
    total.flush({ totalConfirmado: 0, cantidadConfirmados: 0, moneda: 'PEN' });
    detalle.flush(pagina([fila(2, 'RECHAZADO', 320)]));
    expect(leer<() => ReportePago[]>('filas')().length).toBe(1);
  });

  it('una fecha final anterior a la inicial no consulta y avisa', () => {
    responderCarga();
    fijar('fechaDesde', '2026-06-30');
    fijar('fechaHasta', '2026-06-01');

    accion('buscar');

    http.expectNone((r) => r.url.startsWith(BASE));
    expect(leer<() => string | null>('error')()).toBe('La fecha final no puede ser anterior a la inicial.');
  });

  it('cambiar de página pide esa página y no sale del rango disponible', () => {
    responderCarga([fila(1, 'APROBADO', 320)], 3);

    accion('irAPagina', 5);
    http.expectNone((r) => r.url.startsWith(BASE));
    accion('irAPagina', -1);
    http.expectNone((r) => r.url.startsWith(BASE));

    accion('irAPagina', 2);
    const total = http.expectOne((r) => r.url === `${BASE}/total`);
    const detalle = http.expectOne((r) => r.url === BASE);
    expect(detalle.request.params.get('page')).toBe('2');
    total.flush({ totalConfirmado: 320, cantidadConfirmados: 1, moneda: 'PEN' });
    detalle.flush(pagina([fila(3, 'APROBADO', 320)], 3, 2));
  });

  it('limpiar los filtros deja todo en blanco y vuelve a consultar', () => {
    responderCarga();
    fijar('estado', 'RECHAZADO');
    fijar('medio', 'yape');

    accion('limpiarFiltros');

    const detalle = http.expectOne((r) => r.url === BASE);
    expect(detalle.request.params.get('estado')).toBe('');
    expect(detalle.request.params.get('medio')).toBe('');
    http.expectOne((r) => r.url === `${BASE}/total`).flush({ totalConfirmado: 0, cantidadConfirmados: 0, moneda: 'PEN' });
    detalle.flush(pagina([]));
  });

  it('si el reporte falla muestra el mensaje del servidor', () => {
    http.expectOne(URL_CURSOS).flush([]);
    http.expectOne(`${BASE}/medios`).flush([]);
    http.expectOne((r) => r.url === `${BASE}/total`).flush({ totalConfirmado: 0, cantidadConfirmados: 0, moneda: 'PEN' });
    http.expectOne((r) => r.url === BASE).flush(
      { message: 'El resultado del pago no es válido.' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(leer<() => string | null>('error')()).toBe('El resultado del pago no es válido.');
    expect(leer<() => boolean>('cargando')()).toBe(false);
  });

  it('exportar a Excel abre la descarga con los mismos filtros de la pantalla', () => {
    responderCarga();
    fijar('estado', 'APROBADO');
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);

    accion('exportarExcel');

    const [url, destino] = abrir.mock.calls[0];
    expect(String(url)).toContain(`${BASE}/exportar-excel?`);
    expect(String(url)).toContain('estado=APROBADO');
    expect(destino).toBe('_blank');
  });
});

/** EP06 · HU-042 — Parámetros del reporte de pagos. */
describe('ReportePagosApiService', () => {
  let servicio: ReportePagosApiService;
  let http: HttpTestingController;
  const filtros = { texto: '', cursoId: null, estado: '', medio: '', origen: '', fechaDesde: '', fechaHasta: '' };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(ReportePagosApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envía los filtros con valor y omite las fechas y el curso vacíos', () => {
    servicio.reporte({ ...filtros, estado: 'APROBADO', cursoId: 7, fechaDesde: '2026-10-01' }, 2, 10).subscribe();

    const solicitud = http.expectOne((r) => r.url === BASE);
    expect(solicitud.request.params.get('estado')).toBe('APROBADO');
    expect(solicitud.request.params.get('cursoId')).toBe('7');
    expect(solicitud.request.params.get('fechaDesde')).toBe('2026-10-01');
    expect(solicitud.request.params.has('fechaHasta')).toBe(false);
    expect(solicitud.request.params.get('page')).toBe('2');
    expect(solicitud.request.params.get('size')).toBe('10');
    solicitud.flush(pagina([]));
  });

  it('el total y el Excel usan exactamente los mismos filtros que el detalle', () => {
    servicio.total({ ...filtros, medio: 'yape' }).subscribe();
    const total = http.expectOne((r) => r.url === `${BASE}/total`);
    expect(total.request.params.get('medio')).toBe('yape');
    total.flush({ totalConfirmado: 0, cantidadConfirmados: 0, moneda: 'PEN' });

    expect(servicio.urlExportacionExcel({ ...filtros, medio: 'yape' })).toBe(
      `${BASE}/exportar-excel?texto=&estado=&medio=yape&origen=`,
    );
  });
});
