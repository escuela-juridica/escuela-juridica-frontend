import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { API_URL } from '../../../core/api/api.config';
import { AlertaGlobalService } from '../../../core/notificaciones/alerta-global.service';
import { AulaSesionService } from '../../aula/aula-sesion.service';
import { Certificacion } from '../certificacion.model';
import { CertificacionBloque } from './certificacion-bloque';

function certificacion(extra: Partial<Certificacion> = {}): Certificacion {
  return {
    cursoId: 7, curso: 'Derecho Procesal Penal', estado: 'PENDIENTE_REQUISITOS',
    mensaje: 'Te falta: aprobar 1 examen más.',
    condiciones: [{ codigo: 'EXAMENES', titulo: 'Exámenes calificados', valorActual: '0 de 1 aprobados', meta: 'todos aprobados', cumplida: false }],
    fraseAccionable: 'Te falta: aprobar 1 examen más.', exigeExamenes: true, notaFinal: null, nivelProyectado: 'NORMAL',
    entidadProyectada: null, fechaFinalizacion: null, fechaBaseEmision: null, fechaEmisionProgramada: null,
    diasEspera: 0, emisionAutomatica: false,
    datos: { nombres: 'Ana', apellidoPaterno: 'Pérez', apellidoMaterno: null, confirmados: false, confirmadosEn: null },
    puedeConfirmarDatos: false, puedeGenerarAhora: false, certificado: null, ...extra,
  };
}

const EMITIDO = {
  codigo: 'ESEJUR-2026-ABCD2345', estado: 'VIGENTE', nivel: 'NORMAL' as const, nota: 16, emitidoEn: '2026-09-20T15:00:00Z',
  nombresImpresos: 'Ana María Pérez Gómez', entidad: null, descargaUrl: '/api/app/certificados/ESEJUR-2026-ABCD2345/descargar',
};

/** EP05 · HU-032 — "Tu certificado": estado de la certificación, confirmación de datos y emisión. */
describe('CertificacionBloque', () => {
  let fixture: ComponentFixture<CertificacionBloque>;
  let http: HttpTestingController;

  const leer = <T>(nombre: string): T => (fixture.componentInstance as unknown as Record<string, () => T>)[nombre]();
  const accion = (nombre: string): void => (fixture.componentInstance as unknown as Record<string, () => void>)[nombre]();
  const formulario = () =>
    (fixture.componentInstance as unknown as {
      formulario: { patchValue: (v: object) => void; getRawValue: () => object; markAsDirty: () => void; invalid: boolean };
    }).formulario;

  async function abrir(inicial: Certificacion): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [CertificacionBloque],
      providers: [AulaSesionService, provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CertificacionBloque);
    fixture.componentRef.setInput('cursoId', 7);
    fixture.detectChanges();
    http.expectOne(`${API_URL}/app/cursos/7/certificacion`).flush(inicial);
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.inject(AlertaGlobalService).cerrar();
    vi.restoreAllMocks();
    http.verify();
  });

  it('al abrir consulta la certificación del curso y muestra por qué todavía no está disponible', async () => {
    await abrir(certificacion());

    expect(leer<boolean>('cargando')).toBe(false);
    expect(leer<Certificacion>('cert').estado).toBe('PENDIENTE_REQUISITOS');
    expect(fixture.nativeElement.textContent).toContain('Te falta: aprobar 1 examen más.');
    expect(leer<boolean>('editandoDatos')).toBe(false);
  });

  it('si no puede consultarla muestra el mensaje del servidor', async () => {
    await TestBed.configureTestingModule({
      imports: [CertificacionBloque],
      providers: [AulaSesionService, provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CertificacionBloque);
    fixture.componentRef.setInput('cursoId', 7);
    fixture.detectChanges();

    http.expectOne(`${API_URL}/app/cursos/7/certificacion`).flush(
      { message: 'No tienes una matrícula en este curso.' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(leer<string | null>('error')).toBe('No tienes una matrícula en este curso.');
    expect(leer<boolean>('cargando')).toBe(false);
  });

  it('cuando faltan los datos abre el formulario precargado con los nombres de la cuenta', async () => {
    await abrir(certificacion({ estado: 'PENDIENTE_DATOS', puedeConfirmarDatos: true, fechaFinalizacion: '2026-09-18T12:00:00Z' }));

    expect(leer<boolean>('editandoDatos')).toBe(true);
    expect(formulario().getRawValue()).toEqual({ nombres: 'Ana', apellidoPaterno: 'Pérez', apellidoMaterno: '' });
  });

  it('no envía los datos si el formulario está incompleto', async () => {
    await abrir(certificacion({ estado: 'PENDIENTE_DATOS', puedeConfirmarDatos: true, fechaFinalizacion: '2026-09-18T12:00:00Z' }));

    accion('confirmarDatos');

    expect(formulario().invalid).toBe(true);
    http.expectNone((r) => r.method === 'PUT');
  });

  it('confirma los datos con PUT y pasa a "listo para generar"', async () => {
    await abrir(certificacion({ estado: 'PENDIENTE_DATOS', puedeConfirmarDatos: true, fechaFinalizacion: '2026-09-18T12:00:00Z' }));
    formulario().patchValue({ nombres: 'Ana María', apellidoPaterno: 'Pérez', apellidoMaterno: 'Gómez' });

    accion('confirmarDatos');

    const solicitud = http.expectOne(`${API_URL}/app/cursos/7/certificacion/datos`);
    expect(solicitud.request.method).toBe('PUT');
    expect(solicitud.request.body).toEqual({ nombres: 'Ana María', apellidoPaterno: 'Pérez', apellidoMaterno: 'Gómez' });
    solicitud.flush(certificacion({ estado: 'LISTO_PARA_EMITIR', puedeGenerarAhora: true, fechaFinalizacion: '2026-09-18T12:00:00Z' }));

    expect(leer<Certificacion>('cert').estado).toBe('LISTO_PARA_EMITIR');
    expect(leer<boolean>('editandoDatos')).toBe(false);
    expect(TestBed.inject(AlertaGlobalService).alerta()).toEqual({ tipo: 'exito', texto: 'Datos confirmados.' });
  });

  it('si el servidor rechaza los datos los conserva en pantalla y muestra el motivo', async () => {
    await abrir(certificacion({ estado: 'PENDIENTE_DATOS', puedeConfirmarDatos: true, fechaFinalizacion: '2026-09-18T12:00:00Z' }));
    formulario().patchValue({ nombres: 'Ana María', apellidoPaterno: 'Pérez', apellidoMaterno: 'Gómez' });

    accion('confirmarDatos');
    http.expectOne(`${API_URL}/app/cursos/7/certificacion/datos`).flush(
      { message: 'Tu certificado ya fue emitido: sus datos no se pueden cambiar.' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(leer<string | null>('errorDatos')).toBe('Tu certificado ya fue emitido: sus datos no se pueden cambiar.');
    expect(leer<boolean>('guardando')).toBe(false);
  });

  it('generar el certificado exige confirmar primero y luego lo emite con POST', async () => {
    await abrir(certificacion({ estado: 'LISTO_PARA_EMITIR', puedeGenerarAhora: true, fechaFinalizacion: '2026-09-18T12:00:00Z' }));

    accion('pedirEmision');
    expect(leer<boolean>('confirmandoEmision')).toBe(true);
    http.expectNone((r) => r.method === 'POST');

    accion('emitir');
    const solicitud = http.expectOne(`${API_URL}/app/cursos/7/certificacion/emitir`);
    expect(solicitud.request.method).toBe('POST');
    solicitud.flush(certificacion({ estado: 'VIGENTE', certificado: EMITIDO, fechaFinalizacion: '2026-09-18T12:00:00Z' }));

    expect(leer<Certificacion>('cert').certificado?.codigo).toBe('ESEJUR-2026-ABCD2345');
    expect(leer<boolean>('confirmandoEmision')).toBe(false);
    expect(leer<boolean>('emitiendo')).toBe(false);
    expect(TestBed.inject(AlertaGlobalService).alerta()).toEqual({ tipo: 'exito', texto: 'Tu certificado fue emitido.' });
  });

  it('si la emisión falla informa el motivo y mantiene el diálogo abierto', async () => {
    await abrir(certificacion({ estado: 'LISTO_PARA_EMITIR', puedeGenerarAhora: true, fechaFinalizacion: '2026-09-18T12:00:00Z' }));

    accion('pedirEmision');
    accion('emitir');
    http.expectOne(`${API_URL}/app/cursos/7/certificacion/emitir`).flush(
      { message: 'Tu certificado ya fue emitido.' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(leer<string | null>('errorEmision')).toBe('Tu certificado ya fue emitido.');
    expect(leer<boolean>('confirmandoEmision')).toBe(true);
    expect(leer<boolean>('emitiendo')).toBe(false);
  });

  it('con el certificado emitido ofrece la descarga y la abre en el visor privado', async () => {
    await abrir(certificacion({ estado: 'VIGENTE', certificado: EMITIDO, fechaFinalizacion: '2026-09-18T12:00:00Z' }));
    const abrirVentana = vi.spyOn(window, 'open').mockReturnValue(null);

    accion('ver');

    expect(String(abrirVentana.mock.calls[0][0])).toMatch(/descargar\?enLinea=true$/);
  });
});
