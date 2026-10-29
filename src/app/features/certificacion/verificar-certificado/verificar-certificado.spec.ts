import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { API_URL } from '../../../core/api/api.config';
import { VerificacionCertificado } from '../certificacion.model';
import { VerificarCertificado } from './verificar-certificado';

const CODIGO = 'ESEJUR-2026-ABCD2345';

function verificacion(estado: 'VIGENTE' | 'ANULADO'): VerificacionCertificado {
  return {
    estado, codigo: CODIGO, titular: 'Ana María Pérez Gómez', curso: 'Derecho Procesal Penal', horas: 40,
    nivel: 'NORMAL', entidad: null, emitidoEn: '2026-09-20T15:00:00Z',
    anuladoEn: estado === 'ANULADO' ? '2026-09-25T15:00:00Z' : null,
  };
}

/** EP05 · HU-034 — Verificación pública de un certificado, sin sesión: por el código del QR o escrito a mano. */
describe('VerificarCertificado', () => {
  let fixture: ComponentFixture<VerificarCertificado>;
  let http: HttpTestingController;
  let parametros: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const leer = <T>(nombre: string): T => (fixture.componentInstance as unknown as Record<string, () => T>)[nombre]();

  async function crear(codigoEnUrl: string | null): Promise<void> {
    parametros = new BehaviorSubject(convertToParamMap(codigoEnUrl ? { codigo: codigoEnUrl } : {}));
    await TestBed.configureTestingModule({
      imports: [VerificarCertificado],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: parametros.asObservable() } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(VerificarCertificado);
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  it('al abrir sin código no consulta nada y espera a que el usuario lo escriba', async () => {
    await crear(null);

    http.expectNone(() => true);
    expect(leer<string>('resultado')).toBe('ninguno');
  });

  it('un enlace con ?codigo= (el del QR) consulta de inmediato y muestra un certificado vigente', async () => {
    await crear(CODIGO);

    expect(leer<string>('resultado')).toBe('cargando');
    const solicitud = http.expectOne(`${API_URL}/publico/certificados/${CODIGO}`);
    expect(solicitud.request.method).toBe('GET');
    solicitud.flush(verificacion('VIGENTE'));
    fixture.detectChanges();

    expect(leer<string>('resultado')).toBe('vigente');
    expect(leer<VerificacionCertificado>('datos').titular).toBe('Ana María Pérez Gómez');
    expect(fixture.nativeElement.textContent).toContain('Ana María Pérez Gómez');
  });

  it('un certificado anulado se muestra como no válido', async () => {
    await crear(CODIGO);

    http.expectOne(`${API_URL}/publico/certificados/${CODIGO}`).flush(verificacion('ANULADO'));

    expect(leer<string>('resultado')).toBe('anulado');
  });

  it('un código que no existe responde "no encontrado" sin mostrar datos', async () => {
    await crear(CODIGO);

    http.expectOne(`${API_URL}/publico/certificados/${CODIGO}`).flush(
      { message: 'Certificado no encontrado.' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(leer<string>('resultado')).toBe('noEncontrado');
    expect(leer<VerificacionCertificado | null>('datos')).toBeNull();
  });

  it('una falla del servidor se distingue de un código inexistente', async () => {
    await crear(CODIGO);

    http.expectOne(`${API_URL}/publico/certificados/${CODIGO}`).flush('caído', { status: 500, statusText: 'Server Error' });

    expect(leer<string>('resultado')).toBe('error');
  });

  it('escribir el código a mano lo consulta y lo deja en la URL para poder compartirlo', async () => {
    await crear(null);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const componente = fixture.componentInstance as unknown as {
      formulario: { controls: { codigo: { setValue: (v: string) => void } } };
      verificar: () => void;
    };

    componente.formulario.controls.codigo.setValue(`  ${CODIGO}  `);
    componente.verificar();

    expect(navegar).toHaveBeenCalledWith([], { queryParams: { codigo: CODIGO }, queryParamsHandling: 'merge' });
    http.expectOne(`${API_URL}/publico/certificados/${CODIGO}`).flush(verificacion('VIGENTE'));
    expect(leer<string>('codigoConsultado')).toBe(CODIGO);
    expect(leer<string>('resultado')).toBe('vigente');
  });

  it('con el campo vacío no consulta y marca el campo como pendiente de completar', async () => {
    await crear(null);
    const componente = fixture.componentInstance as unknown as {
      formulario: { controls: { codigo: { touched: boolean } } };
      verificar: () => void;
    };

    componente.verificar();

    http.expectNone(() => true);
    expect(componente.formulario.controls.codigo.touched).toBe(true);
    expect(leer<string>('resultado')).toBe('ninguno');
  });
});
