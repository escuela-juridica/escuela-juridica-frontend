import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_URL } from '../../core/api/api.config';
import { ExamenApiService } from './examen-api.service';

/** EP05 · HU-028 / HU-029 — Rendir un examen: ficha, intento, guardado de respuestas y envío. */
describe('ExamenApiService', () => {
  let servicio: ExamenApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(ExamenApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta la ficha del examen con GET', () => {
    let titulo = '';
    servicio.ficha(100).subscribe((f) => (titulo = f.titulo));

    const solicitud = http.expectOne(`${API_URL}/app/examenes/100`);
    expect(solicitud.request.method).toBe('GET');
    solicitud.flush({ id: 100, titulo: 'Examen final' });

    expect(titulo).toBe('Examen final');
  });

  it('inicia un intento con POST y devuelve el intento en progreso', () => {
    let estado = '';
    servicio.iniciar(100).subscribe((i) => (estado = i.estado));

    const solicitud = http.expectOne(`${API_URL}/app/examenes/100/intentos`);
    expect(solicitud.request.method).toBe('POST');
    solicitud.flush({ id: 900, estado: 'EN_PROGRESO' });

    expect(estado).toBe('EN_PROGRESO');
  });

  it('no inicia otro intento cuando se agotaron: el servidor explica el motivo', () => {
    let mensaje = '';
    servicio.iniciar(100).subscribe({ error: (e) => (mensaje = e.error.message) });

    http.expectOne(`${API_URL}/app/examenes/100/intentos`).flush(
      { message: 'Agotaste tus intentos sin aprobar: no puedes reintentar ni certificar.' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(mensaje).toContain('Agotaste tus intentos');
  });

  it('guarda la respuesta de una pregunta con PUT enviando las alternativas marcadas', () => {
    servicio.guardarRespuesta(900, 55, { opcionesIds: [201], texto: null }).subscribe();

    const solicitud = http.expectOne(`${API_URL}/app/intentos/900/respuestas/55`);
    expect(solicitud.request.method).toBe('PUT');
    expect(solicitud.request.body).toEqual({ opcionesIds: [201], texto: null });
    solicitud.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('guarda una respuesta abierta enviando el texto', () => {
    servicio.guardarRespuesta(900, 56, { opcionesIds: [], texto: 'No hay delito sin ley previa.' }).subscribe();

    const solicitud = http.expectOne(`${API_URL}/app/intentos/900/respuestas/56`);
    expect(solicitud.request.body).toEqual({ opcionesIds: [], texto: 'No hay delito sin ley previa.' });
    solicitud.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('envía el intento y recibe la nota calificada automáticamente', () => {
    let nota = -1;
    let aprobado: boolean | null = null;
    servicio.enviar(900).subscribe((i) => {
      nota = i.nota ?? -1;
      aprobado = i.aprobado;
    });

    const solicitud = http.expectOne(`${API_URL}/app/intentos/900/enviar`);
    expect(solicitud.request.method).toBe('POST');
    solicitud.flush({ id: 900, estado: 'CALIFICADO', nota: 20, aprobado: true });

    expect(nota).toBe(20);
    expect(aprobado).toBe(true);
  });

  it('consulta un intento ya existente por su identificador', () => {
    servicio.intento(900).subscribe();

    const solicitud = http.expectOne(`${API_URL}/app/intentos/900`);
    expect(solicitud.request.method).toBe('GET');
    solicitud.flush({ id: 900, estado: 'PENDIENTE_REVISION' });
  });
});
