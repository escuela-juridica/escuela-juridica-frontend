import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_URL } from '../../core/api/api.config';
import { AulaSesionService } from './aula-sesion.service';
import { AulaRespuesta, LeccionAulaRespuesta } from './aula.model';

function leccion(id: number, estado: LeccionAulaRespuesta['estado'], motivo: string | null = null): LeccionAulaRespuesta {
  return {
    id, titulo: `Lección ${id}`, tipo: 'GRABADA', orden: id, esObligatoria: true, estado, motivoBloqueo: motivo,
    fechaHoraInicio: null, fechaHoraFin: null, estadoSesion: null, grabacionDisponible: false, descripcion: null,
    duracionSegundos: null,
  };
}

function aula(porcentaje: number, ultima: number | null): AulaRespuesta {
  return {
    matriculaId: 5, cursoId: 7, cursoTitulo: 'Derecho Procesal Penal', modalidad: 'VIRTUAL', porcentaje,
    modulos: [
      { id: 1, titulo: 'Módulo 1', orden: 1, examenes: [],
        lecciones: [leccion(11, 'COMPLETADA'), leccion(12, 'DISPONIBLE')] },
      { id: 2, titulo: 'Módulo 2', orden: 2, examenes: [],
        lecciones: [leccion(21, 'BLOQUEADA', 'Completa la lección anterior: Lección 12')] },
    ],
    ultimaLeccionIdValida: ultima,
    avanceCertificado: { condiciones: [], cumpleTodo: false, fraseAccionable: '' },
    examenesFinales: [], imagenPortadaUrl: null, horasAcademicas: 40, cursoCancelado: false, motivoCancelacionCurso: null,
  };
}

/** EP04 · HU-022 — Estado compartido del aula: carga del temario, orden de lecciones y "Continuar". */
describe('AulaSesionService', () => {
  let estado: AulaSesionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AulaSesionService, provideHttpClient(), provideHttpClientTesting()],
    });
    estado = TestBed.inject(AulaSesionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('al ingresar al aula pide el temario del curso y muestra el estado de carga hasta recibirlo', () => {
    estado.cargar(7);

    expect(estado.cargando()).toBe(true);
    const solicitud = http.expectOne(`${API_URL}/aula/cursos/7`);
    expect(solicitud.request.method).toBe('GET');
    solicitud.flush(aula(33, 12));

    expect(estado.cargando()).toBe(false);
    expect(estado.errorMensaje()).toBeNull();
    expect(estado.aula()?.cursoTitulo).toBe('Derecho Procesal Penal');
  });

  it('aplana módulos y lecciones en el orden del curso con su posición global y por módulo', () => {
    estado.cargar(7);
    http.expectOne(`${API_URL}/aula/cursos/7`).flush(aula(33, 12));

    expect(estado.lecciones().map((l) => [l.leccion.id, l.indice, l.numeroEnModulo, l.modulo.id])).toEqual([
      [11, 0, 1, 1],
      [12, 1, 2, 1],
      [21, 2, 1, 2],
    ]);
    expect(estado.totalCompletadas()).toBe(1);
  });

  it('"Continuar" reabre la lección que indica el servidor', () => {
    estado.cargar(7);
    http.expectOne(`${API_URL}/aula/cursos/7`).flush(aula(33, 12));

    expect(estado.leccionParaContinuar()?.leccion.id).toBe(12);
  });

  it('sin lección de continuación válida no hay a dónde continuar', () => {
    estado.cargar(7);
    http.expectOne(`${API_URL}/aula/cursos/7`).flush(aula(0, null));

    expect(estado.leccionParaContinuar()).toBeNull();
  });

  it('navega a la lección anterior y a la siguiente a partir de la lección actual', () => {
    estado.cargar(7);
    http.expectOne(`${API_URL}/aula/cursos/7`).flush(aula(33, 12));

    estado.leccionActualId.set(12);
    expect(estado.anterior()?.leccion.id).toBe(11);
    expect(estado.siguiente()?.leccion.id).toBe(21);

    estado.leccionActualId.set(11);
    expect(estado.anterior()).toBeNull();
    estado.leccionActualId.set(21);
    expect(estado.siguiente()).toBeNull();
  });

  it('si el alumno no está matriculado muestra el mensaje real del servidor', () => {
    estado.cargar(7);

    http.expectOne(`${API_URL}/aula/cursos/7`).flush(
      { message: 'No tienes una matrícula en este curso.' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(estado.aula()).toBeNull();
    expect(estado.cargando()).toBe(false);
    expect(estado.errorMensaje()).toBe('No tienes una matrícula en este curso.');
  });

  it('ante una falla sin cuerpo usa un mensaje genérico', () => {
    estado.cargar(7);

    http.expectOne(`${API_URL}/aula/cursos/7`).flush('caído', { status: 500, statusText: 'Server Error' });

    expect(estado.errorMensaje()).toBe('No pudimos abrir el aula de este curso.');
  });

  it('refrescar vuelve a pedir el temario sin mostrar la pantalla de carga', () => {
    estado.cargar(7);
    http.expectOne(`${API_URL}/aula/cursos/7`).flush(aula(33, 12));

    estado.refrescar();

    expect(estado.cargando()).toBe(false);
    http.expectOne(`${API_URL}/aula/cursos/7`).flush(aula(67, 21));
    expect(estado.aula()?.porcentaje).toBe(67);
    expect(estado.leccionParaContinuar()?.leccion.id).toBe(21);
  });

  it('refrescar sin haber cargado ningún curso no llama al servidor', () => {
    estado.refrescar();

    http.expectNone(() => true);
  });
});
