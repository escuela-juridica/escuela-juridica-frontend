import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { API_URL } from '../../../core/api/api.config';
import { AlertaGlobalService } from '../../../core/notificaciones/alerta-global.service';
import { AulaSesionService, LeccionDelCurso } from '../aula-sesion.service';
import { AulaRespuesta, ExamenAulaRespuesta, LeccionAulaRespuesta } from '../aula.model';
import { AulaResumen } from './aula-resumen';

function leccion(id: number, estado: LeccionAulaRespuesta['estado'], extra: Partial<LeccionAulaRespuesta> = {}): LeccionAulaRespuesta {
  return {
    id, titulo: `Lección ${id}`, tipo: 'GRABADA', orden: id, esObligatoria: true, estado, motivoBloqueo: null,
    fechaHoraInicio: null, fechaHoraFin: null, estadoSesion: null, grabacionDisponible: false, descripcion: null,
    duracionSegundos: null, ...extra,
  };
}

function examen(id: number, extra: Partial<ExamenAulaRespuesta> = {}): ExamenAulaRespuesta {
  return {
    id, titulo: `Examen ${id}`, tipo: 'CALIFICADO', finalidad: 'MODULO', bloqueaSiguienteModulo: true, aprobado: false,
    mejorNota: null, estado: 'PENDIENTE', habilitado: true, motivoNoHabilitado: null, intentosUsados: 0,
    intentosMaximos: 2, fechaLimiteRevision: null, ...extra,
  };
}

function aula(lecciones: LeccionAulaRespuesta[], ultima: number | null, examenes: ExamenAulaRespuesta[] = []): AulaRespuesta {
  return {
    matriculaId: 5, cursoId: 7, cursoTitulo: 'Derecho Procesal Penal', modalidad: 'EN_VIVO', porcentaje: 50,
    modulos: [{ id: 1, titulo: 'Módulo 1', orden: 1, lecciones, examenes }],
    ultimaLeccionIdValida: ultima,
    avanceCertificado: { condiciones: [], cumpleTodo: false, fraseAccionable: 'Te falta completar lecciones.' },
    examenesFinales: [], imagenPortadaUrl: null, horasAcademicas: 40, cursoCancelado: false, motivoCancelacionCurso: null,
  };
}

/** EP04 · HU-022 / HU-026 — Resumen del aula: "Continuar", bloqueos, próximas sesiones e ingreso a una sesión en vivo. */
describe('AulaResumen', () => {
  let fixture: ComponentFixture<AulaResumen>;
  let componente: AulaResumen;
  let estado: AulaSesionService;
  let http: HttpTestingController;

  /** Los miembros protegidos son parte de lo que ve la plantilla: se consultan por nombre. */
  const leer = <T>(nombre: string): T => (componente as unknown as Record<string, () => T>)[nombre]();

  function cargar(respuesta: AulaRespuesta): void {
    estado.cargar(7);
    http.expectOne(`${API_URL}/aula/cursos/7`).flush(respuesta);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AulaResumen],
      providers: [AulaSesionService, provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    estado = TestBed.inject(AulaSesionService);
    fixture = TestBed.createComponent(AulaResumen);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.inject(AlertaGlobalService).cerrar();
    vi.restoreAllMocks();
    http.verify();
  });

  it('al entrar al aula no hay una lección abierta y "Continuar" apunta a la primera disponible', () => {
    cargar(aula([leccion(11, 'COMPLETADA'), leccion(12, 'DISPONIBLE'), leccion(13, 'BLOQUEADA')], 12));

    expect(estado.leccionActualId()).toBeNull();
    expect(leer<LeccionDelCurso | null>('continuar')?.leccion.id).toBe(12);
    expect(leer<string | null>('bloqueo')).toBeNull();
  });

  it('con todo completado ya no ofrece continuar', () => {
    cargar(aula([leccion(11, 'COMPLETADA'), leccion(12, 'COMPLETADA')], 12));

    expect(leer<LeccionDelCurso | null>('continuar')).toBeNull();
    expect(leer<boolean>('terminoLecciones')).toBe(true);
  });

  it('si solo queda una lección bloqueada muestra el motivo en lugar de "Continuar"', () => {
    cargar(aula(
      [leccion(11, 'COMPLETADA'), leccion(12, 'BLOQUEADA', { motivoBloqueo: 'Aprueba el examen «Examen 100» para continuar.' })],
      null,
    ));

    expect(leer<LeccionDelCurso | null>('continuar')).toBeNull();
    expect(leer<string | null>('bloqueo')).toBe('Aprueba el examen «Examen 100» para continuar.');
  });

  it('identifica el examen que frena el avance y cuenta los calificados pendientes', () => {
    cargar(aula([leccion(11, 'COMPLETADA')], 11, [examen(100), examen(101, { estado: 'APROBADO', aprobado: true, mejorNota: 16 })]));

    expect(leer<ExamenAulaRespuesta | null>('examenBloqueante')?.id).toBe(100);
    expect(leer<number>('examenesPendientes')).toBe(1);
    expect(leer<{ evaluaciones: number }>('cifras').evaluaciones).toBe(2);
  });

  it('lista las próximas sesiones en vivo ordenadas por fecha e ignora las ya realizadas', () => {
    cargar(aula([
      leccion(11, 'DISPONIBLE', { tipo: 'EN_VIVO', estadoSesion: 'FUTURA', fechaHoraInicio: '2026-09-25T15:00:00Z' }),
      leccion(12, 'DISPONIBLE', { tipo: 'EN_VIVO', estadoSesion: 'FUTURA', fechaHoraInicio: '2026-09-20T15:00:00Z' }),
      leccion(13, 'COMPLETADA', { tipo: 'EN_VIVO', estadoSesion: 'REALIZADA', fechaHoraInicio: '2026-09-10T15:00:00Z' }),
    ], 12));

    expect(leer<LeccionDelCurso[]>('proximasSesiones').map((s) => s.leccion.id)).toEqual([12, 11]);
  });

  it('ingresar a una sesión registra la asistencia, abre el enlace y refresca el aula', () => {
    cargar(aula([leccion(21, 'DISPONIBLE', { tipo: 'EN_VIVO', estadoSesion: 'EN_VENTANA' })], 21));
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);
    const sesion = estado.lecciones()[0];

    (componente as unknown as { ingresar: (i: LeccionDelCurso) => void }).ingresar(sesion);

    expect(leer<number | null>('ingresando')).toBe(21);
    const ingreso = http.expectOne(`${API_URL}/app/lecciones/21/sesion/ingresar`);
    expect(ingreso.request.method).toBe('POST');
    ingreso.flush({ enlaceReunion: 'https://meet.example.com/clase' });

    expect(abrir).toHaveBeenCalledWith('https://meet.example.com/clase', '_blank');
    expect(leer<number | null>('ingresando')).toBeNull();
    http.expectOne(`${API_URL}/aula/cursos/7`).flush(aula([leccion(21, 'COMPLETADA', { tipo: 'EN_VIVO' })], 21));
    expect(estado.totalCompletadas()).toBe(1);
  });

  it('si el ingreso es rechazado muestra el mensaje del servidor y no abre ninguna ventana', () => {
    cargar(aula([leccion(21, 'DISPONIBLE', { tipo: 'EN_VIVO', estadoSesion: 'FUTURA' })], 21));
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);

    (componente as unknown as { ingresar: (i: LeccionDelCurso) => void }).ingresar(estado.lecciones()[0]);
    http.expectOne(`${API_URL}/app/lecciones/21/sesion/ingresar`).flush(
      { message: 'La sesión solo está disponible entre la hora de inicio y la hora de fin.' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(abrir).not.toHaveBeenCalled();
    expect(leer<number | null>('ingresando')).toBeNull();
    expect(TestBed.inject(AlertaGlobalService).alerta()).toEqual({
      tipo: 'error',
      texto: 'La sesión solo está disponible entre la hora de inicio y la hora de fin.',
    });
  });

  it('mientras un ingreso está en curso ignora un segundo clic', () => {
    cargar(aula([leccion(21, 'DISPONIBLE', { tipo: 'EN_VIVO', estadoSesion: 'EN_VENTANA' })], 21));
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);
    const ingresar = (componente as unknown as { ingresar: (i: LeccionDelCurso) => void }).ingresar.bind(componente);
    const sesion = estado.lecciones()[0];

    ingresar(sesion);
    ingresar(sesion);

    // expectOne falla si el segundo clic hubiera generado otra petición.
    http.expectOne(`${API_URL}/app/lecciones/21/sesion/ingresar`).flush({ enlaceReunion: 'https://meet.example.com/x' });
    expect(abrir).toHaveBeenCalledTimes(1);
    http.expectOne(`${API_URL}/aula/cursos/7`).flush(aula([leccion(21, 'DISPONIBLE')], 21));
  });
});
