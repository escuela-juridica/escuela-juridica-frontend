import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { API_URL } from '../../core/api/api.config';
import { AlertaGlobalService } from '../../core/notificaciones/alerta-global.service';
import { AulaSesionService } from '../aula/aula-sesion.service';
import { ExamenFicha, Intento, PreguntaIntento } from './examen.model';
import { ExamenPantalla } from './examen-pantalla';

function ficha(extra: Partial<ExamenFicha> = {}): ExamenFicha {
  return {
    id: 100, cursoId: 7, titulo: 'Examen final', descripcion: null, tipo: 'CALIFICADO', finalidad: 'FINAL', modulo: null,
    totalPreguntas: 2, puntajeTotal: 20, tieneRespuestaAbierta: false, tiempoLimiteMinutos: null, intentosMaximos: 2,
    intentosUsados: 0, intentosRestantes: 2, mostrarRespuestas: 'AL_APROBAR', notaMinima: 12, afectaCertificacion: true,
    bloqueaSiguienteModulo: false, habilitado: true, puedeIniciar: true, motivoNoPuedeIniciar: null,
    agotadoSinAprobar: false, soloLectura: false, intentoEnCursoId: null, aprobado: false, mejorNota: null, intentos: [],
    ...extra,
  };
}

function pregunta(id: number, tipo: PreguntaIntento['tipo'] = 'SELECCION_UNICA'): PreguntaIntento {
  return {
    id, tipo, enunciado: `Pregunta ${id}`, puntaje: 10, posicion: id,
    opciones: tipo === 'RESPUESTA_ABIERTA' ? [] : [
      { id: id * 10 + 1, texto: 'Correcta', esCorrecta: null },
      { id: id * 10 + 2, texto: 'Incorrecta', esCorrecta: null },
    ],
    seleccionadas: [], texto: null, respondida: false, puntajeObtenido: null, correcta: null, estadoRevision: null,
    observacion: null,
  };
}

function intento(extra: Partial<Intento> = {}): Intento {
  const ahora = new Date().toISOString();
  return {
    id: 900, examenId: 100, cursoId: 7, examenTitulo: 'Examen final', tipo: 'CALIFICADO', numero: 1, estado: 'EN_PROGRESO',
    iniciadoEn: ahora, expiraEn: null, segundosRestantes: null, ahora, puntajeTotal: 20, puntajeObtenido: null, nota: null,
    aprobado: null, notaMinima: 12, enviadoEn: null, cerradoPorTiempo: false, fechaLimiteRevision: null,
    respuestasVisibles: false, afectaCertificacion: true, preguntas: [pregunta(1), pregunta(2)], ...extra,
  };
}

/** EP05 · HU-028 / HU-029 — Rendir un examen en el aula: ficha, intento, guardado de respuestas, envío y resultado. */
describe('ExamenPantalla', () => {
  let fixture: ComponentFixture<ExamenPantalla>;
  let http: HttpTestingController;

  const leer = <T>(nombre: string): T => (fixture.componentInstance as unknown as Record<string, () => T>)[nombre]();
  const accion = (nombre: string, ...args: unknown[]): void =>
    (fixture.componentInstance as unknown as Record<string, (...a: unknown[]) => void>)[nombre](...args);

  async function abrir(respuestaFicha: ExamenFicha | null = ficha()): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ExamenPantalla],
      providers: [
        AulaSesionService, provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ examenId: '100' })) } },
      ],
    }).compileComponents();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ExamenPantalla);
    fixture.detectChanges();
    if (respuestaFicha) {
      http.expectOne(`${API_URL}/app/examenes/100`).flush(respuestaFicha);
      fixture.detectChanges();
    }
  }

  /** Inicia el intento con las preguntas dadas y deja la pantalla en "rindiendo". */
  function iniciar(resultado: Intento): void {
    accion('iniciar');
    const solicitud = http.expectOne(`${API_URL}/app/examenes/100/intentos`);
    expect(solicitud.request.method).toBe('POST');
    solicitud.flush(resultado);
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.inject(AlertaGlobalService).cerrar();
    vi.useRealTimers();
    vi.restoreAllMocks();
    http.verify();
    localStorage.clear();
  });

  it('al abrir carga la ficha del examen y la muestra antes de iniciar un intento', async () => {
    await abrir();

    expect(leer<string>('vista')).toBe('ficha');
    expect(leer<ExamenFicha>('ficha').titulo).toBe('Examen final');
    expect(fixture.nativeElement.textContent).toContain('Examen final');
  });

  it('si la ficha no se puede abrir muestra el mensaje del servidor', async () => {
    await abrir(null);

    http.expectOne(`${API_URL}/app/examenes/100`).flush(
      { message: 'No tienes una matrícula en este curso.' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(leer<string>('vista')).toBe('error');
    expect(leer<string | null>('error')).toBe('No tienes una matrícula en este curso.');
  });

  it('iniciar un intento abre la primera pregunta con todo sin responder', async () => {
    await abrir();

    iniciar(intento());

    expect(leer<string>('vista')).toBe('rindiendo');
    expect(leer<PreguntaIntento>('preguntaActual').id).toBe(1);
    expect(leer<number>('totalRespondidas')).toBe(0);
  });

  it('si no se puede iniciar avisa el motivo y vuelve a cargar la ficha', async () => {
    await abrir();

    accion('iniciar');
    http.expectOne(`${API_URL}/app/examenes/100/intentos`).flush(
      { message: 'Agotaste tus intentos sin aprobar: no puedes reintentar ni certificar.' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(TestBed.inject(AlertaGlobalService).alerta()?.texto).toContain('Agotaste tus intentos');
    http.expectOne(`${API_URL}/app/examenes/100`).flush(ficha({ agotadoSinAprobar: true, puedeIniciar: false }));
    expect(leer<boolean>('iniciando')).toBe(false);
  });

  it('marcar una alternativa guarda la respuesta en el servidor al instante', async () => {
    await abrir();
    iniciar(intento());
    const primera = leer<PreguntaIntento>('preguntaActual');

    accion('elegirOpcion', primera, 11);

    const solicitud = http.expectOne(`${API_URL}/app/intentos/900/respuestas/1`);
    expect(solicitud.request.method).toBe('PUT');
    expect(solicitud.request.body).toEqual({ opcionesIds: [11], texto: null });
    solicitud.flush(null, { status: 204, statusText: 'No Content' });

    expect(leer<string>('guardado')).toBe('ok');
    expect(leer<number>('totalRespondidas')).toBe(1);
  });

  it('en una selección múltiple marcar dos alternativas las conserva y desmarcar una la quita', async () => {
    await abrir();
    iniciar(intento({ preguntas: [pregunta(1, 'SELECCION_MULTIPLE'), pregunta(2)] }));
    const multiple = leer<PreguntaIntento>('preguntaActual');

    accion('elegirOpcion', multiple, 11);
    http.expectOne(`${API_URL}/app/intentos/900/respuestas/1`).flush(null, { status: 204, statusText: 'No Content' });
    accion('elegirOpcion', multiple, 12);
    const segunda = http.expectOne(`${API_URL}/app/intentos/900/respuestas/1`);
    expect(segunda.request.body).toEqual({ opcionesIds: [11, 12], texto: null });
    segunda.flush(null, { status: 204, statusText: 'No Content' });
    accion('elegirOpcion', multiple, 11);
    const tercera = http.expectOne(`${API_URL}/app/intentos/900/respuestas/1`);
    expect(tercera.request.body).toEqual({ opcionesIds: [12], texto: null });
    tercera.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('enviar con todo respondido muestra la nota y si el alumno aprobó', async () => {
    await abrir();
    iniciar(intento());
    for (const [pregunta, opcion] of [[1, 11], [2, 21]]) {
      const p = leer<{ preguntas: PreguntaIntento[] }>('intento').preguntas.find((x) => x.id === pregunta)!;
      accion('elegirOpcion', p, opcion);
      http.expectOne(`${API_URL}/app/intentos/900/respuestas/${pregunta}`).flush(null, { status: 204, statusText: 'No Content' });
    }

    accion('enviar');
    const envio = http.expectOne(`${API_URL}/app/intentos/900/enviar`);
    expect(envio.request.method).toBe('POST');
    envio.flush(intento({ estado: 'CALIFICADO', nota: 20, puntajeObtenido: 20, aprobado: true, enviadoEn: new Date().toISOString() }));
    fixture.detectChanges();

    expect(leer<string>('vista')).toBe('resultado');
    expect(leer<Intento>('intento').nota).toBe(20);
    expect(leer<Intento>('intento').aprobado).toBe(true);
    expect(leer<boolean>('enviando')).toBe(false);
  });

  it('un intento no aprobado se muestra como resultado con su nota', async () => {
    await abrir();
    iniciar(intento());

    accion('enviar');
    http.expectOne(`${API_URL}/app/intentos/900/enviar`).flush(
      intento({ estado: 'CALIFICADO', nota: 8, puntajeObtenido: 8, aprobado: false, enviadoEn: new Date().toISOString() }),
    );

    expect(leer<string>('vista')).toBe('resultado');
    expect(leer<Intento>('intento').aprobado).toBe(false);
  });

  it('con una respuesta abierta el intento queda pendiente de revisión, sin nota todavía', async () => {
    await abrir(ficha({ tieneRespuestaAbierta: true }));
    iniciar(intento({ preguntas: [pregunta(1, 'RESPUESTA_ABIERTA')] }));

    accion('enviar');
    http.expectOne(`${API_URL}/app/intentos/900/enviar`).flush(
      intento({ estado: 'PENDIENTE_REVISION', nota: null, aprobado: null, enviadoEn: new Date().toISOString(),
        fechaLimiteRevision: '2026-10-05T12:00:00Z' }),
    );

    expect(leer<string>('vista')).toBe('resultado');
    expect(leer<Intento>('intento').estado).toBe('PENDIENTE_REVISION');
    expect(leer<Intento>('intento').nota).toBeNull();
  });

  it('si el envío falla muestra el error y el alumno puede intentarlo de nuevo', async () => {
    await abrir();
    iniciar(intento());

    accion('enviar');
    http.expectOne(`${API_URL}/app/intentos/900/enviar`).flush(
      { message: 'Este intento ya fue enviado.' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(leer<boolean>('enviando')).toBe(false);
    expect(leer<string>('vista')).toBe('rindiendo');
    expect(TestBed.inject(AlertaGlobalService).alerta()?.texto).toBe('Este intento ya fue enviado.');
  });

  it('al agotarse el tiempo consulta el intento y muestra el resultado cerrado por tiempo', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    await abrir();
    const ahora = new Date();
    iniciar(intento({
      iniciadoEn: ahora.toISOString(), ahora: ahora.toISOString(), segundosRestantes: 2,
      expiraEn: new Date(ahora.getTime() + 2000).toISOString(),
    }));
    expect(leer<number | null>('segundos')).toBe(2);

    vi.advanceTimersByTime(2000);

    http.expectOne(`${API_URL}/app/intentos/900`).flush(
      intento({ estado: 'CALIFICADO', nota: 10, aprobado: false, cerradoPorTiempo: true, enviadoEn: new Date().toISOString() }),
    );
    expect(leer<boolean>('cerradoPorTiempoAviso')).toBe(true);
    expect(leer<string>('vista')).toBe('resultado');
  });
});
