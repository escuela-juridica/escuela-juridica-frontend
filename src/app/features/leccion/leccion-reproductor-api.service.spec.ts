import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_URL } from '../../core/api/api.config';
import { LeccionReproductorApiService } from './leccion-reproductor-api.service';

/** EP04 · HU-023 / HU-024 — Materiales protegidos y registro de progreso de la lección. */
describe('LeccionReproductorApiService', () => {
  let servicio: LeccionReproductorApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(LeccionReproductorApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista los materiales de una lección con GET', () => {
    let materiales: unknown;
    servicio.listarMateriales(11).subscribe((m) => (materiales = m));

    const solicitud = http.expectOne(`${API_URL}/app/lecciones/11/materiales`);
    expect(solicitud.request.method).toBe('GET');
    solicitud.flush([{ id: 31, titulo: 'Clase 1', verUrl: '/api/app/materiales/31/contenido' }]);

    expect(materiales).toEqual([{ id: 31, titulo: 'Clase 1', verUrl: '/api/app/materiales/31/contenido' }]);
  });

  it('sin matrícula el servidor rechaza los materiales y el error llega al llamador', () => {
    let estado = 0;
    servicio.listarMateriales(11).subscribe({ error: (e) => (estado = e.status) });

    http.expectOne(`${API_URL}/app/lecciones/11/materiales`).flush(
      { message: 'No tienes una matrícula en este curso.' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(estado).toBe(404);
  });

  it('registra el avance del video enviando segundos reproducidos y última posición', () => {
    const peticion = { segundosReproducidos: 300, ultimaPosicionSegundos: 300, duracionSegundosTotal: 600 };

    servicio.registrarProgresoVideo(31, peticion).subscribe();

    const solicitud = http.expectOne(`${API_URL}/app/materiales/31/progreso-video`);
    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual(peticion);
    solicitud.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('completa la lección con POST y cuerpo vacío', () => {
    let terminado = false;
    servicio.completarLeccion(12).subscribe(() => (terminado = true));

    const solicitud = http.expectOne(`${API_URL}/app/lecciones/12/completar`);
    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual({});
    solicitud.flush(null, { status: 204, statusText: 'No Content' });

    expect(terminado).toBe(true);
  });

  it('una lección bloqueada no se completa: el motivo del servidor llega al llamador', () => {
    let mensaje = '';
    servicio.completarLeccion(21).subscribe({ error: (e) => (mensaje = e.error.message) });

    http.expectOne(`${API_URL}/app/lecciones/21/completar`).flush(
      { message: 'Completa la lección anterior: Lección 12' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(mensaje).toBe('Completa la lección anterior: Lección 12');
  });
});
