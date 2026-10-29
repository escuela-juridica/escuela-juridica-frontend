import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_URL } from '../../core/api/api.config';
import { CertificacionApiService } from './certificacion-api.service';

/** EP05 · HU-032 a HU-034 — Estado de la certificación, confirmación de datos, emisión, mis certificados,
 * descarga y verificación pública. */
describe('CertificacionApiService', () => {
  let servicio: CertificacionApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(CertificacionApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta el estado de certificación de un curso', () => {
    let estado = '';
    servicio.consultar(7).subscribe((c) => (estado = c.estado));

    const solicitud = http.expectOne(`${API_URL}/app/cursos/7/certificacion`);
    expect(solicitud.request.method).toBe('GET');
    solicitud.flush({ cursoId: 7, estado: 'PENDIENTE_REQUISITOS' });

    expect(estado).toBe('PENDIENTE_REQUISITOS');
  });

  it('confirma los datos a imprimir con PUT y devuelve la certificación actualizada', () => {
    const datos = { nombres: 'Ana María', apellidoPaterno: 'Pérez', apellidoMaterno: 'Gómez' };
    let estado = '';
    servicio.confirmarDatos(7, datos).subscribe((c) => (estado = c.estado));

    const solicitud = http.expectOne(`${API_URL}/app/cursos/7/certificacion/datos`);
    expect(solicitud.request.method).toBe('PUT');
    expect(solicitud.request.body).toEqual(datos);
    solicitud.flush({ cursoId: 7, estado: 'LISTO_PARA_EMITIR' });

    expect(estado).toBe('LISTO_PARA_EMITIR');
  });

  it('emite el certificado con POST', () => {
    let codigo = '';
    servicio.emitir(7).subscribe((c) => (codigo = c.certificado?.codigo ?? ''));

    const solicitud = http.expectOne(`${API_URL}/app/cursos/7/certificacion/emitir`);
    expect(solicitud.request.method).toBe('POST');
    solicitud.flush({ cursoId: 7, estado: 'VIGENTE', certificado: { codigo: 'ESEJUR-2026-ABCD2345' } });

    expect(codigo).toBe('ESEJUR-2026-ABCD2345');
  });

  it('emitir sin cumplir los requisitos devuelve el motivo del servidor', () => {
    let mensaje = '';
    servicio.emitir(7).subscribe({ error: (e) => (mensaje = e.error.message) });

    http.expectOne(`${API_URL}/app/cursos/7/certificacion/emitir`).flush(
      { message: 'Te falta: aprobar 1 examen más.' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(mensaje).toBe('Te falta: aprobar 1 examen más.');
  });

  it('lista solo los certificados del alumno autenticado', () => {
    let cantidad = -1;
    servicio.misCertificados().subscribe((lista) => (cantidad = lista.length));

    const solicitud = http.expectOne(`${API_URL}/app/certificados`);
    expect(solicitud.request.method).toBe('GET');
    solicitud.flush([{ codigo: 'ESEJUR-2026-ABCD2345', estado: 'VIGENTE' }]);

    expect(cantidad).toBe(1);
  });

  it('verifica un certificado por código sin sesión, codificando el código en la URL', () => {
    let titular = '';
    servicio.verificar(' ESEJUR-2026/AB CD ').subscribe((v) => (titular = v.titular));

    const solicitud = http.expectOne(`${API_URL}/publico/certificados/ESEJUR-2026%2FAB%20CD`);
    expect(solicitud.request.method).toBe('GET');
    solicitud.flush({ estado: 'VIGENTE', codigo: 'ESEJUR-2026-ABCD2345', titular: 'Ana María Pérez Gómez' });

    expect(titular).toBe('Ana María Pérez Gómez');
  });

  it('un código inexistente se informa como 404', () => {
    let estado = 0;
    servicio.verificar('NO-EXISTE').subscribe({ error: (e) => (estado = e.status) });

    http.expectOne(`${API_URL}/publico/certificados/NO-EXISTE`).flush(
      { message: 'Certificado no encontrado.' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(estado).toBe(404);
  });

  it('descarga el PDF privado y lo guarda con el nombre certificado-CODIGO.pdf', () => {
    const original = { crear: URL.createObjectURL, revocar: URL.revokeObjectURL };
    const crearUrl = vi.fn().mockReturnValue('blob:prueba');
    URL.createObjectURL = crearUrl;
    URL.revokeObjectURL = vi.fn();
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    let nombre = '';
    clic.mockImplementation(function (this: HTMLAnchorElement) {
      nombre = this.download;
    });
    let terminado = false;

    try {
      servicio.descargarPdf('/api/app/certificados/ESEJUR-2026-ABCD2345/descargar', 'ESEJUR-2026-ABCD2345')
        .subscribe(() => (terminado = true));

      const solicitud = http.expectOne((r) => r.url.endsWith('/api/app/certificados/ESEJUR-2026-ABCD2345/descargar'));
      expect(solicitud.request.responseType).toBe('blob');
      solicitud.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));

      expect(terminado).toBe(true);
      expect(clic).toHaveBeenCalledTimes(1);
      expect(crearUrl).toHaveBeenCalledTimes(1);
      expect(nombre).toBe('certificado-ESEJUR-2026-ABCD2345.pdf');
    } finally {
      URL.createObjectURL = original.crear;
      URL.revokeObjectURL = original.revocar;
      vi.restoreAllMocks();
    }
  });
});
