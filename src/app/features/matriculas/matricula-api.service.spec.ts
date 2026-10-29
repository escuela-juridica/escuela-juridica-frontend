import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_URL } from '../../core/api/api.config';
import { MatriculaApiService } from './matricula-api.service';

/** EP06 · HU-017 / HU-019 / HU-020 / HU-041 — Matrículas: mis cursos, gratuita, administrativa, cancelación y reporte. */
describe('MatriculaApiService', () => {
  let servicio: MatriculaApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(MatriculaApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista los cursos del alumno autenticado', () => {
    let cantidad = -1;
    servicio.misCursos().subscribe((m) => (cantidad = m.length));

    const solicitud = http.expectOne(`${API_URL}/app/matriculas`);
    expect(solicitud.request.method).toBe('GET');
    solicitud.flush([{ id: 5, estado: 'ACTIVA' }]);

    expect(cantidad).toBe(1);
  });

  it('matricula gratis en un curso gratuito con POST', () => {
    servicio.matricularGratis(9).subscribe();

    const solicitud = http.expectOne(`${API_URL}/cursos/9/matricula-gratuita`);
    expect(solicitud.request.method).toBe('POST');
    solicitud.flush({ id: 6, estado: 'ACTIVA' });
  });

  it('una matrícula duplicada se informa con el mensaje del servidor', () => {
    let mensaje = '';
    servicio.matricularGratis(9).subscribe({ error: (e) => (mensaje = e.error.message) });

    http.expectOne(`${API_URL}/cursos/9/matricula-gratuita`).flush(
      { message: 'Ya tienes una matrícula en este curso.' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(mensaje).toBe('Ya tienes una matrícula en este curso.');
  });

  it('la matrícula administrativa envía la condición económica y la confirmación de la advertencia', () => {
    const peticion = {
      usuarioId: 10, cursoId: 7, condicionEconomica: 'EXONERADO' as const, importe: null, medio: null,
      referencia: null, motivo: 'Beca institucional', confirmoAdvertenciaAcademica: true,
    };
    servicio.crearAdministrativa(peticion).subscribe();

    const solicitud = http.expectOne(`${API_URL}/admin/matriculas`);
    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual(peticion);
    solicitud.flush({ id: 7 });
  });

  it('lista las matrículas administrativas filtrando por texto y estado con paginación del servidor', () => {
    servicio.listarAdministrativas('  ana  ', 'ACTIVA', 1, 10).subscribe();

    const solicitud = http.expectOne((r) => r.url === `${API_URL}/admin/matriculas`);
    expect(solicitud.request.params.get('texto')).toBe('ana');
    expect(solicitud.request.params.get('estado')).toBe('ACTIVA');
    expect(solicitud.request.params.get('page')).toBe('1');
    expect(solicitud.request.params.get('size')).toBe('10');
    solicitud.flush({ items: [], page: 1, size: 10, totalElements: 0, totalPages: 0, first: false, last: true });
  });

  it('cancela una matrícula con PATCH enviando el motivo', () => {
    servicio.cancelarAdministrativa(5, 'Pago observado').subscribe();

    const solicitud = http.expectOne(`${API_URL}/admin/matriculas/5/cancelacion`);
    expect(solicitud.request.method).toBe('PATCH');
    expect(solicitud.request.body).toEqual({ motivo: 'Pago observado' });
    solicitud.flush({});
  });

  it('el reporte de matrículas envía los filtros y la exportación conserva los mismos', () => {
    const filtros = { texto: 'ana', estado: 'ACTIVA', cursoId: 7, modalidad: 'VIRTUAL', fechaDesde: '2026-10-01' };
    servicio.reporte(filtros, 0, 20).subscribe();

    const solicitud = http.expectOne((r) => r.url === `${API_URL}/admin/reportes/matriculas`);
    expect(solicitud.request.params.get('cursoId')).toBe('7');
    expect(solicitud.request.params.get('modalidad')).toBe('VIRTUAL');
    expect(solicitud.request.params.has('fechaHasta')).toBe(false);
    solicitud.flush({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true });

    expect(servicio.urlExportacionExcel(filtros)).toContain('/admin/reportes/matriculas/exportar-excel?texto=ana&estado=ACTIVA');
    expect(servicio.urlExportacionPdf(filtros)).toContain('/admin/reportes/matriculas/exportar-pdf?');
  });
});
