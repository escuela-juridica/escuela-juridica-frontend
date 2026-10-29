import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_URL } from '../../core/api/api.config';
import { SesionAlumnoApiService } from './sesion-alumno-api.service';

/** EP04 · HU-026 — Calendario de sesiones en vivo e ingreso del alumno. */
describe('SesionAlumnoApiService', () => {
  let servicio: SesionAlumnoApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(SesionAlumnoApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sin fechas pide el calendario sin parámetros (el servidor usa el mes actual)', () => {
    servicio.calendario().subscribe();

    const solicitud = http.expectOne((r) => r.url === `${API_URL}/app/sesiones/calendario`);
    expect(solicitud.request.method).toBe('GET');
    expect(solicitud.request.params.keys()).toEqual([]);
    solicitud.flush([]);
  });

  it('con un rango pide las sesiones entre esas fechas', () => {
    let sesiones: unknown[] = [];
    servicio.calendario('2026-09-01', '2026-09-30').subscribe((s) => (sesiones = s));

    const solicitud = http.expectOne((r) => r.url === `${API_URL}/app/sesiones/calendario`);
    expect(solicitud.request.params.get('desde')).toBe('2026-09-01');
    expect(solicitud.request.params.get('hasta')).toBe('2026-09-30');
    solicitud.flush([{ leccionId: 11, titulo: 'Sesión 1', estadoSesion: 'FUTURA', enlaceReunion: null }]);

    expect(sesiones.length).toBe(1);
  });

  it('un rango invertido se informa con el mensaje del servidor', () => {
    let mensaje = '';
    servicio.calendario('2026-09-30', '2026-09-01').subscribe({ error: (e) => (mensaje = e.error.message) });

    http.expectOne((r) => r.url === `${API_URL}/app/sesiones/calendario`).flush(
      { message: 'La fecha final no puede ser anterior a la fecha inicial.' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(mensaje).toBe('La fecha final no puede ser anterior a la fecha inicial.');
  });

  it('al ingresar a una sesión en su ventana recibe el enlace de la reunión', () => {
    let enlace = '';
    servicio.ingresar(21).subscribe((r) => (enlace = r.enlaceReunion));

    const solicitud = http.expectOne(`${API_URL}/app/lecciones/21/sesion/ingresar`);
    expect(solicitud.request.method).toBe('POST');
    solicitud.flush({ enlaceReunion: 'https://meet.example.com/clase' });

    expect(enlace).toBe('https://meet.example.com/clase');
  });

  it('fuera de la ventana de la sesión el ingreso se rechaza', () => {
    let estado = 0;
    servicio.ingresar(21).subscribe({ error: (e) => (estado = e.status) });

    http.expectOne(`${API_URL}/app/lecciones/21/sesion/ingresar`).flush(
      { message: 'La sesión solo está disponible entre la hora de inicio y la hora de fin.' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(estado).toBe(400);
  });
});
