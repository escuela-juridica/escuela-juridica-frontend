import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_URL } from '../../core/api/api.config';
import { PresentarReclamacion } from './reclamacion.model';
import { ReclamacionesApiService } from './reclamaciones-api.service';

const DATOS: PresentarReclamacion = {
  tipo: 'RECLAMO', tipoDocumento: 'DNI', numeroDocumento: '12345678', nombres: 'María', apellidos: 'Quispe Rojas',
  correo: 'maria@example.com', celular: '999 888 777', direccion: 'Av. Arequipa 1234, Lima', montoReclamado: 320,
  descripcionBien: 'Curso de Derecho Procesal Penal', detalle: 'El pago fue descontado pero no pude ingresar.',
  pedido: 'Solicito la activación de mi matrícula.', declaracionJurada: true, autorizaRespuestaCorreo: true,
};

/** EP06 · HU-039 — Libro de Reclamaciones: precarga con sesión y presentación con o sin sesión. */
describe('ReclamacionesApiService', () => {
  let servicio: ReclamacionesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(ReclamacionesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('con sesión consulta los datos conocidos para prellenar el formulario', () => {
    let correo = '';
    servicio.precarga().subscribe((p) => (correo = p.correo));

    const solicitud = http.expectOne(`${API_URL}/app/reclamaciones/precarga`);
    expect(solicitud.request.method).toBe('GET');
    solicitud.flush({ nombres: 'Ana', apellidos: 'Pérez', correo: 'ana@example.com', celular: '', tipoDocumento: 'DNI', numeroDocumento: '' });

    expect(correo).toBe('ana@example.com');
  });

  it('sin sesión presenta el caso por la ruta pública con los datos como parte JSON "datos"', async () => {
    servicio.presentar(DATOS, [], false).subscribe();

    const solicitud = http.expectOne(`${API_URL}/publico/reclamaciones`);
    expect(solicitud.request.method).toBe('POST');
    const cuerpo = solicitud.request.body as FormData;
    expect(cuerpo).toBeInstanceOf(FormData);
    const parte = cuerpo.get('datos') as Blob;
    expect(parte.type).toBe('application/json');
    expect(JSON.parse(await parte.text())).toEqual(DATOS);
    expect(cuerpo.getAll('imagenes')).toEqual([]);
    solicitud.flush({ codigo: 'LR-2026-000001' });
  });

  it('con sesión usa la ruta de la cuenta para que el caso quede ligado a ella', () => {
    servicio.presentar(DATOS, [], true).subscribe();

    http.expectOne(`${API_URL}/app/reclamaciones`).flush({ codigo: 'LR-2026-000002' });
  });

  it('adjunta cada imagen como parte "imagenes" conservando su nombre', () => {
    const captura = new File(['x'], 'captura.png', { type: 'image/png' });
    const voucher = new File(['y'], 'voucher.jpg', { type: 'image/jpeg' });
    servicio.presentar(DATOS, [captura, voucher], false).subscribe();

    const solicitud = http.expectOne(`${API_URL}/publico/reclamaciones`);
    const nombres = (solicitud.request.body as FormData).getAll('imagenes').map((f) => (f as File).name);
    expect(nombres).toEqual(['captura.png', 'voucher.jpg']);
    solicitud.flush({ codigo: 'LR-2026-000003' });
  });

  it('un DNI inválido es rechazado por el servidor y el mensaje llega al llamador', () => {
    let mensaje = '';
    servicio.presentar({ ...DATOS, numeroDocumento: '1234567' }, [], false).subscribe({ error: (e) => (mensaje = e.error.message) });

    http.expectOne(`${API_URL}/publico/reclamaciones`).flush(
      { message: 'El DNI debe tener 8 dígitos.' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(mensaje).toBe('El DNI debe tener 8 dígitos.');
  });
});
