import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { API_URL } from '../../../core/api/api.config';
import { AlertaGlobalService } from '../../../core/notificaciones/alerta-global.service';
import { MiCertificado } from '../certificacion.model';
import { MisCertificados } from './mis-certificados';

function certificado(estado: 'VIGENTE' | 'ANULADO'): MiCertificado {
  return {
    codigo: 'ESEJUR-2026-ABCD2345', titular: 'Ana María Pérez Gómez', cursoId: 7, curso: 'Derecho Procesal Penal',
    nivel: 'NORMAL', entidad: null, horas: 40, emitidoEn: '2026-09-20T15:00:00Z', estado,
    anuladoEn: estado === 'ANULADO' ? '2026-09-25T15:00:00Z' : null,
    descargaUrl: estado === 'VIGENTE' ? '/api/app/certificados/ESEJUR-2026-ABCD2345/descargar' : null,
  };
}

/** EP05 · HU-033 — Mis certificados: solo los del alumno; uno vigente se descarga, uno anulado queda sin descarga. */
describe('MisCertificados', () => {
  let fixture: ComponentFixture<MisCertificados>;
  let http: HttpTestingController;

  const leer = <T>(nombre: string): T => (fixture.componentInstance as unknown as Record<string, () => T>)[nombre]();
  const accion = (nombre: string, ...args: unknown[]): void =>
    (fixture.componentInstance as unknown as Record<string, (...a: unknown[]) => void>)[nombre](...args);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MisCertificados],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MisCertificados);
  });

  afterEach(() => {
    TestBed.inject(AlertaGlobalService).cerrar();
    vi.restoreAllMocks();
    http.verify();
  });

  it('al abrir pide los certificados del alumno autenticado y los muestra', () => {
    fixture.detectChanges();
    expect(leer<boolean>('cargando')).toBe(true);

    const solicitud = http.expectOne(`${API_URL}/app/certificados`);
    expect(solicitud.request.method).toBe('GET');
    solicitud.flush([certificado('VIGENTE'), certificado('ANULADO')]);
    fixture.detectChanges();

    expect(leer<boolean>('cargando')).toBe(false);
    expect(leer<MiCertificado[]>('certificados').map((c) => c.estado)).toEqual(['VIGENTE', 'ANULADO']);
    expect(fixture.nativeElement.textContent).toContain('Derecho Procesal Penal');
  });

  it('sin certificados emitidos la lista queda vacía sin error', () => {
    fixture.detectChanges();

    http.expectOne(`${API_URL}/app/certificados`).flush([]);

    expect(leer<MiCertificado[]>('certificados')).toEqual([]);
    expect(leer<string | null>('error')).toBeNull();
  });

  it('si la carga falla informa el mensaje del servidor', () => {
    fixture.detectChanges();

    http.expectOne(`${API_URL}/app/certificados`).flush(
      { message: 'No tienes permiso para realizar esta operación' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(leer<string | null>('error')).toBe('No tienes permiso para realizar esta operación');
    expect(leer<boolean>('cargando')).toBe(false);
  });

  it('ver abre el visor privado del PDF en una pestaña nueva', () => {
    fixture.detectChanges();
    http.expectOne(`${API_URL}/app/certificados`).flush([certificado('VIGENTE')]);
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);

    accion('ver', certificado('VIGENTE'));

    expect(abrir).toHaveBeenCalledTimes(1);
    const [url, destino] = abrir.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/app\/certificados\/ESEJUR-2026-ABCD2345\/descargar\?enLinea=true$/);
    expect(destino).toBe('_blank');
  });

  it('un certificado anulado no tiene descarga: ver y descargar no hacen nada', () => {
    fixture.detectChanges();
    http.expectOne(`${API_URL}/app/certificados`).flush([certificado('ANULADO')]);
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);

    accion('ver', certificado('ANULADO'));
    accion('descargar', certificado('ANULADO'));

    expect(abrir).not.toHaveBeenCalled();
    http.expectNone((r) => r.url.includes('/descargar'));
  });

  it('si la descarga del PDF falla avisa al alumno', () => {
    fixture.detectChanges();
    http.expectOne(`${API_URL}/app/certificados`).flush([certificado('VIGENTE')]);

    accion('descargar', certificado('VIGENTE'));
    http.expectOne((r) => r.url.endsWith('/descargar')).error(new ProgressEvent('error'), { status: 500, statusText: 'Server Error' });

    expect(TestBed.inject(AlertaGlobalService).alerta()?.tipo).toBe('error');
  });
});
