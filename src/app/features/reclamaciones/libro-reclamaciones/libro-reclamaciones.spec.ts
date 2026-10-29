import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { API_URL } from '../../../core/api/api.config';
import { Session } from '../../../core/session/session';
import { ReclamacionConstancia } from '../reclamacion.model';
import { LibroReclamaciones } from './libro-reclamaciones';

const CONSTANCIA: ReclamacionConstancia = {
  codigo: 'LR-2026-000001', tipo: 'RECLAMO', estado: 'PENDIENTE_RESPUESTA', registradoEn: '2026-10-01T15:00:00Z',
  fechaLimiteRespuesta: '2026-10-22', nombres: 'María', apellidos: 'Quispe Rojas', tipoDocumento: 'DNI',
  numeroDocumento: '12345678', correo: 'maria@example.com', celular: '999 888 777', direccion: 'Av. Arequipa 1234, Lima',
  montoReclamado: 320, descripcionBien: 'Curso de Derecho Procesal Penal', detalle: 'El pago fue descontado.',
  pedido: 'Solicito la activación de mi matrícula.', adjuntos: [], constanciaEnviada: true,
};

const FORMULARIO_VALIDO = {
  tipo: 'RECLAMO', tipoDocumento: 'DNI', numeroDocumento: '12345678', nombres: 'María', apellidos: 'Quispe Rojas',
  correo: 'maria@example.com', celular: '999 888 777', direccion: 'Av. Arequipa 1234, Lima', montoReclamado: 320,
  descripcionBien: 'Curso de Derecho Procesal Penal', detalle: 'El pago fue descontado pero no pude ingresar.',
  pedido: 'Solicito la activación de mi matrícula.', declaracionJurada: true, autorizaRespuestaCorreo: true,
};

/** EP06 · HU-039 — Libro de Reclamaciones: validaciones del formulario, adjuntos y presentación del caso. */
describe('LibroReclamaciones', () => {
  let fixture: ComponentFixture<LibroReclamaciones>;
  let http: HttpTestingController;

  const leer = <T>(nombre: string): T => (fixture.componentInstance as unknown as Record<string, () => T>)[nombre]();
  const accion = (nombre: string, ...args: unknown[]): void =>
    (fixture.componentInstance as unknown as Record<string, (...a: unknown[]) => void>)[nombre](...args);
  const formulario = () =>
    (fixture.componentInstance as unknown as {
      formulario: { patchValue: (v: object) => void; getRawValue: () => Record<string, unknown>; invalid: boolean };
    }).formulario;

  async function abrir(conSesion: boolean): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [LibroReclamaciones],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: Session, useValue: { estaAutenticado: () => conSesion } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    fixture = TestBed.createComponent(LibroReclamaciones);
    fixture.detectChanges();
  }

  function seleccionar(archivos: File[]): void {
    const entrada = { files: archivos, value: 'ruta' } as unknown as HTMLInputElement;
    accion('elegirImagenes', { target: entrada } as unknown as Event);
  }

  afterEach(() => {
    vi.restoreAllMocks();
    http.verify();
  });

  it('sin sesión el formulario arranca vacío y no consulta datos de la cuenta', async () => {
    await abrir(false);

    http.expectNone(() => true);
    expect(leer<boolean>('prellenado')).toBe(false);
    expect(formulario().getRawValue()['correo']).toBe('');
  });

  it('con sesión prellena los datos conocidos para que la persona los revise', async () => {
    await abrir(true);

    http.expectOne(`${API_URL}/app/reclamaciones/precarga`).flush({
      nombres: 'Ana', apellidos: 'Pérez Gómez', correo: 'ana@example.com', celular: '999111222',
      tipoDocumento: 'DNI', numeroDocumento: '87654321',
    });

    expect(leer<boolean>('prellenado')).toBe(true);
    expect(formulario().getRawValue()).toMatchObject({ nombres: 'Ana', correo: 'ana@example.com', numeroDocumento: '87654321' });
  });

  it('si falla la precarga el formulario sigue siendo utilizable', async () => {
    await abrir(true);

    http.expectOne(`${API_URL}/app/reclamaciones/precarga`).flush('error', { status: 500, statusText: 'Server Error' });

    expect(leer<boolean>('prellenado')).toBe(false);
  });

  it('enviar el formulario vacío no llama al servidor y pide revisar los campos', async () => {
    await abrir(false);

    accion('enviar');

    http.expectNone(() => true);
    expect(leer<string | null>('errorEnvio')).toBe('Revisa los campos marcados antes de enviar.');
    expect(leer<boolean>('enviando')).toBe(false);
  });

  it('un DNI que no tiene 8 dígitos se marca inválido según el tipo de documento', async () => {
    await abrir(false);
    formulario().patchValue({ ...FORMULARIO_VALIDO, numeroDocumento: '1234567' });
    (fixture.componentInstance as unknown as { formulario: { controls: { numeroDocumento: { markAsDirty: () => void } } } })
      .formulario.controls.numeroDocumento.markAsDirty();

    expect(leer<boolean>('documentoInvalido')).toBe(true);
    expect(leer<string>('ayudaDocumento')).toBe('El DNI tiene 8 dígitos.');

    accion('enviar');
    http.expectNone(() => true);
  });

  it('sin aceptar la declaración jurada el caso no se envía', async () => {
    await abrir(false);
    formulario().patchValue({ ...FORMULARIO_VALIDO, declaracionJurada: false });

    accion('enviar');

    http.expectNone(() => true);
    expect(formulario().invalid).toBe(true);
  });

  it('con todo en regla presenta el caso por la ruta pública y muestra la constancia', async () => {
    await abrir(false);
    formulario().patchValue(FORMULARIO_VALIDO);

    accion('enviar');

    const solicitud = http.expectOne(`${API_URL}/publico/reclamaciones`);
    expect(solicitud.request.method).toBe('POST');
    expect(leer<boolean>('enviando')).toBe(true);
    solicitud.flush(CONSTANCIA);

    expect(leer<boolean>('enviando')).toBe(false);
    expect(leer<ReclamacionConstancia>('constancia').codigo).toBe('LR-2026-000001');
  });

  it('con sesión el caso se presenta por la ruta de la cuenta', async () => {
    await abrir(true);
    http.expectOne(`${API_URL}/app/reclamaciones/precarga`).flush({
      nombres: 'Ana', apellidos: 'Pérez', correo: 'ana@example.com', celular: '', tipoDocumento: 'DNI', numeroDocumento: '',
    });
    formulario().patchValue(FORMULARIO_VALIDO);

    accion('enviar');

    http.expectOne(`${API_URL}/app/reclamaciones`).flush(CONSTANCIA);
    expect(leer<ReclamacionConstancia>('constancia').codigo).toBe('LR-2026-000001');
  });

  it('si el servidor rechaza el caso muestra su mensaje y permite corregir', async () => {
    await abrir(false);
    formulario().patchValue(FORMULARIO_VALIDO);

    accion('enviar');
    http.expectOne(`${API_URL}/publico/reclamaciones`).flush(
      { message: 'El DNI debe tener 8 dígitos.' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(leer<string | null>('errorEnvio')).toBe('El DNI debe tener 8 dígitos.');
    expect(leer<ReclamacionConstancia | null>('constancia')).toBeNull();
    expect(leer<boolean>('enviando')).toBe(false);
  });

  it('solo acepta imágenes PNG, JPG o WEBP', async () => {
    await abrir(false);

    seleccionar([new File(['x'], 'contrato.pdf', { type: 'application/pdf' })]);

    expect(leer<string | null>('errorImagenes')).toBe('«contrato.pdf» no es una imagen válida (PNG, JPG o WEBP).');
    expect(leer<File[]>('imagenes')).toEqual([]);
  });

  it('rechaza una imagen de más de 5 MB y acepta una válida', async () => {
    await abrir(false);
    const pesada = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'pesada.png', { type: 'image/png' });

    seleccionar([pesada]);
    expect(leer<string | null>('errorImagenes')).toBe('«pesada.png» supera el máximo de 5 MB.');

    seleccionar([new File(['x'], 'captura.png', { type: 'image/png' })]);
    expect(leer<string | null>('errorImagenes')).toBeNull();
    expect(leer<File[]>('imagenes').map((f) => f.name)).toEqual(['captura.png']);
  });

  it('permite hasta 10 imágenes', async () => {
    await abrir(false);
    const once = Array.from({ length: 11 }, (_, i) => new File(['x'], `foto-${i}.png`, { type: 'image/png' }));

    seleccionar(once);

    expect(leer<string | null>('errorImagenes')).toBe('Puedes adjuntar hasta 10 imágenes.');
    expect(leer<File[]>('imagenes')).toEqual([]);
  });
});
