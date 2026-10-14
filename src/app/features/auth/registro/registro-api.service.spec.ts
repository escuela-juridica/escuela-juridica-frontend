import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { RegistroApiService } from './registro-api.service';
import { RegistroFormularioPeticion, RegistroGooglePeticion } from './registro.models';

describe('RegistroApiService', () => {
  let servicio: RegistroApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    servicio = TestBed.inject(RegistroApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envía el registro tradicional mediante POST', () => {
    const peticion: RegistroFormularioPeticion = {
      nombres: 'Lucía',
      apellidoPaterno: 'Caminos',
      apellidoMaterno: null,
      correo: 'lucia@example.com',
      telefono: null,
      documentoIdentidad: null,
      contrasena: 'Clave123',
      confirmarContrasena: 'Clave123',
      aceptaTerminos: true,
      evidenciaAntiRobot: 'token-control',
    };

    servicio.registrarFormulario(peticion).subscribe();

    const solicitud = http.expectOne('/api/auth/registro');
    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual(peticion);
    solicitud.flush({
      usuarioId: 1,
      correo: peticion.correo,
      envioAceptado: true,
      referenciaVerificacion: 'verificacion-1',
    });
  });

  it('codifica la referencia al consultar el contexto Google', () => {
    servicio.obtenerContextoGoogle('ref con/espacios').subscribe();

    const solicitud = http.expectOne('/api/auth/registro/google/ref%20con%2Fespacios');
    expect(solicitud.request.method).toBe('GET');
    solicitud.flush({ correo: 'lucia@example.com' });
  });

  it('completa Google mediante POST sin enviar el correo verificado', () => {
    const peticion: RegistroGooglePeticion = {
      referencia: 'google-1',
      nombres: 'Lucía',
      apellidoPaterno: 'Caminos Quiroz',
      apellidoMaterno: null,
      telefono: null,
      documentoIdentidad: null,
      aceptaTerminos: true,
    };

    servicio.completarRegistroGoogle(peticion).subscribe();

    const solicitud = http.expectOne('/api/auth/registro/google');
    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual(peticion);
    expect(solicitud.request.body.correo).toBeUndefined();
    solicitud.flush({ nombre: 'Lucía', email: 'lucia@example.com', rol: 'alumno' });
  });
});
