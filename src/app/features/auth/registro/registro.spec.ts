import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';

import { RegistroApiService } from './registro-api.service';
import {
  ContextoRegistroGoogle,
  GoogleRegistroSesion,
  RegistroFormularioPeticion,
  RegistroFormularioRespuesta,
  RegistroGooglePeticion,
} from './registro.models';
import { Session } from '../../../core/session/session';
import { Registro } from './registro';

interface RegistroApiMock {
  registrarFormulario: ReturnType<
    typeof vi.fn<(peticion: RegistroFormularioPeticion) => Observable<RegistroFormularioRespuesta>>
  >;
  obtenerContextoGoogle: ReturnType<
    typeof vi.fn<(referencia: string) => Observable<ContextoRegistroGoogle>>
  >;
  completarRegistroGoogle: ReturnType<
    typeof vi.fn<(peticion: RegistroGooglePeticion) => Observable<GoogleRegistroSesion>>
  >;
}

describe('Registro', () => {
  let component: Registro;
  let fixture: ComponentFixture<Registro>;
  let api: RegistroApiMock;
  let router: Router;

  beforeEach(async () => {
    api = {
      registrarFormulario: vi.fn(() =>
        of({
          usuarioId: 1,
          correo: 'lucia@example.com',
          envioAceptado: true,
          referenciaVerificacion: 'verificacion-1',
        }),
      ),
      obtenerContextoGoogle: vi.fn(() => of({ correo: 'lucia@example.com' })),
      completarRegistroGoogle: vi.fn(() =>
        of({ nombre: 'Lucía', email: 'google@example.com', rol: 'alumno' }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [Registro],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RegistroApiService, useValue: api },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(Registro);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('se crea', () => {
    expect(component).toBeTruthy();
  });

  it('permite consultar los documentos legales en otra pestaña sin enviar el formulario', () => {
    component.formulario.controls.nombres.setValue('Ana');
    for (const ruta of ['/terminos', '/privacidad']) {
      const enlace = fixture.nativeElement.querySelector(
        'a[routerLink="' + ruta + '"]',
      ) as HTMLAnchorElement;
      expect(enlace.getAttribute('href')).toBe(ruta);
      expect(enlace.target).toBe('_blank');
      expect(enlace.rel).toContain('noopener');
    }
    expect(component.formulario.controls.nombres.value).toBe('Ana');
    expect(api.registrarFormulario).not.toHaveBeenCalled();
  });

  it('abre sin error de conexión ni solicitudes innecesarias', () => {
    expect(component.errorGeneral).toBe('');
    expect(api.obtenerContextoGoogle).not.toHaveBeenCalled();
    expect(api.registrarFormulario).not.toHaveBeenCalled();
    expect(api.completarRegistroGoogle).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.alerta--error')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Demostración académica');
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('input[name="antiRobot"]')).toBeNull();
  });

  it('mantiene bloqueado el envío visible sin evidencia aunque los demás datos sean válidos', () => {
    completarFormularioValido();
    component.actualizarAntiRobot('');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    component.registrar();
    expect(api.registrarFormulario).not.toHaveBeenCalled();
  });

  it('explica la integración Google pendiente sin simular un fallo de creación', () => {
    api.obtenerContextoGoogle.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 503,
            error: { code: 'GOOGLE_PENDIENTE', message: 'Integración pendiente' },
          }),
      ),
    );
    const route = TestBed.inject(ActivatedRoute);
    vi.spyOn(route.snapshot.queryParamMap, 'get').mockImplementation((nombre) =>
      nombre === 'referenciaGoogle' ? 'referencia-hu001' : null,
    );
    component.ngOnInit();
    fixture.detectChanges();
    expect(component.avisoGoogle).toContain('pendiente de integración');
    expect(component.errorGeneral).toBe('');
    expect(component.contextoGoogleValido).toBe(false);
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    expect(api.completarRegistroGoogle).not.toHaveBeenCalled();
    component.reiniciarGoogle();
    expect(component.modoGoogle).toBe(false);
    expect(component.avisoGoogle).toBe('');
    expect(component.formulario.controls.correo.enabled).toBe(true);
  });

  it('informa rechazo del backend por anti-robot pendiente sin navegar ni perder datos', () => {
    completarFormularioValido(); // Evidencia simulada solo en esta prueba.
    api.registrarFormulario.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 503,
            error: {
              code: 'ANTIROBOT_PENDIENTE',
              message: 'El control anti-robot todavía no está integrado.',
            },
          }),
      ),
    );
    component.registrar();
    expect(component.errorGeneral).toContain('todavía no está integrado');
    expect(component.formulario.controls.nombres.value).toBe('Lucía');
    expect(component.formulario.controls.evidenciaAntiRobot.value).toBe('');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.cuentaCreada).toBe(false);
  });

  it('rechaza el formulario vacío y muestra los errores después del intento', () => {
    component.registrar();

    expect(component.intentoEnvio).toBe(true);
    expect(component.formulario.invalid).toBe(true);
    expect(component.campoInvalido('nombres')).toBe(true);
    expect(api.registrarFormulario).not.toHaveBeenCalled();
  });

  it('permite dejar vacíos los tres campos opcionales', () => {
    completarFormularioValido();

    expect(component.formulario.valid).toBe(true);
  });

  it('no envía si falta la aceptación legal', () => {
    completarFormularioValido();
    component.formulario.controls.aceptaTerminos.setValue(false);

    component.registrar();

    expect(component.campoInvalido('aceptaTerminos')).toBe(true);
    expect(api.registrarFormulario).not.toHaveBeenCalled();
  });

  it('no envía si falta el token del control anti-robot', () => {
    completarFormularioValido();
    component.formulario.controls.evidenciaAntiRobot.setValue('');

    component.registrar();

    expect(component.campoInvalido('evidenciaAntiRobot')).toBe(true);
    expect(api.registrarFormulario).not.toHaveBeenCalled();
  });

  it('normaliza textos y convierte los opcionales vacíos a null', () => {
    completarFormularioValido();
    component.formulario.patchValue({
      nombres: '  Lucía  ',
      apellidoPaterno: '  Caminos ',
      correo: '  LUCIA@EXAMPLE.COM ',
      apellidoMaterno: '   ',
      telefono: '   ',
      documentoIdentidad: '   ',
    });

    component.registrar();

    expect(api.registrarFormulario).toHaveBeenCalledWith({
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
    });
  });

  it('navega a verificar correo con la referencia recibida', () => {
    completarFormularioValido();

    component.registrar();

    expect(router.navigate).toHaveBeenCalledWith(['/verificar-correo'], {
      queryParams: { referencia: 'verificacion-1' },
      state: { envioAceptado: true, correo: 'lucia@example.com' },
    });
  });

  it('evita dos solicitudes mientras la primera sigue pendiente', () => {
    const respuestaPendiente = new Subject<RegistroFormularioRespuesta>();
    api.registrarFormulario.mockReturnValue(respuestaPendiente.asObservable());
    completarFormularioValido();

    component.registrar();
    component.registrar();

    expect(api.registrarFormulario).toHaveBeenCalledTimes(1);
    expect(component.enviando).toBe(true);

    respuestaPendiente.complete();
    expect(component.enviando).toBe(false);
  });

  it('marca el correo duplicado y conserva los valores escritos', () => {
    api.registrarFormulario.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: {
              timestamp: '2026-09-04T00:00:00Z',
              status: 409,
              code: 'CORREO_DUPLICADO',
              message: 'El correo ya se encuentra registrado',
              path: '/api/auth/registro',
              fieldErrors: [],
            },
          }),
      ),
    );
    completarFormularioValido();

    component.registrar();

    expect(component.formulario.controls.correo.hasError('servidor')).toBe(true);
    expect(component.mensajeErrorServidor('correo')).toBe('El correo ya se encuentra registrado');
    expect(component.formulario.controls.nombres.value).toBe('Lucía');
  });

  it('carga el contexto Google, bloquea el correo y oculta requisitos propios', () => {
    api.obtenerContextoGoogle.mockReturnValue(
      of({
        correo: 'google@example.com',
        nombres: 'Lucía',
        apellidos: 'Caminos Quiroz',
      }),
    );
    const route = TestBed.inject(ActivatedRoute);
    vi.spyOn(route.snapshot.queryParamMap, 'get').mockImplementation((nombre) =>
      nombre === 'referenciaGoogle' ? 'google-1' : null,
    );

    component.ngOnInit();

    expect(api.obtenerContextoGoogle).toHaveBeenCalledWith('google-1');
    expect(component.modoGoogle).toBe(true);
    expect(component.contextoGoogleValido).toBe(true);
    expect(component.formulario.controls.correo.disabled).toBe(true);
    expect(component.formulario.controls.correo.value).toBe('google@example.com');
    expect(component.formulario.controls.apellidoPaterno.value).toBe('Caminos Quiroz');
    expect(component.formulario.controls.contrasena.hasError('required')).toBe(false);
    expect(component.formulario.controls.evidenciaAntiRobot.hasError('required')).toBe(false);
  });

  it('bloquea el registro cuando la referencia Google no es válida', () => {
    api.obtenerContextoGoogle.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 410 })),
    );
    const route = TestBed.inject(ActivatedRoute);
    vi.spyOn(route.snapshot.queryParamMap, 'get').mockImplementation((nombre) =>
      nombre === 'referenciaGoogle' ? 'google-vencido' : null,
    );

    component.ngOnInit();

    expect(component.modoGoogle).toBe(true);
    expect(component.contextoGoogleValido).toBe(false);
    expect(component.errorGeneral).toContain('venció');
    component.registrar();
    expect(api.completarRegistroGoogle).not.toHaveBeenCalled();
  });

  it('completa Google sin enviar el correo y navega al panel', () => {
    activarModoGoogleValido();

    component.registrar();

    expect(api.completarRegistroGoogle).toHaveBeenCalledWith({
      referencia: 'google-1',
      nombres: 'Lucía',
      apellidoPaterno: 'Caminos Quiroz',
      apellidoMaterno: null,
      telefono: null,
      documentoIdentidad: null,
      aceptaTerminos: true,
    });
    expect(router.navigate).toHaveBeenCalledWith(['/app/panel']);
    expect(TestBed.inject(Session).estaAutenticado()).toBe(true);
    expect(TestBed.inject(Session).usuario()?.correo).toBe('google@example.com');
  });

  function completarFormularioValido(): void {
    component.formulario.setValue({
      nombres: 'Lucía',
      apellidoPaterno: 'Caminos',
      apellidoMaterno: '',
      correo: 'lucia@example.com',
      telefono: '',
      documentoIdentidad: '',
      contrasena: 'Clave123',
      confirmarContrasena: 'Clave123',
      aceptaTerminos: true,
      evidenciaAntiRobot: 'token-control',
    });
  }

  function activarModoGoogleValido(): void {
    api.obtenerContextoGoogle.mockReturnValue(
      of({
        correo: 'google@example.com',
        nombres: 'Lucía',
        apellidos: 'Caminos Quiroz',
      }),
    );
    const route = TestBed.inject(ActivatedRoute);
    vi.spyOn(route.snapshot.queryParamMap, 'get').mockImplementation((nombre) =>
      nombre === 'referenciaGoogle' ? 'google-1' : null,
    );
    component.ngOnInit();
    component.formulario.controls.aceptaTerminos.setValue(true);
  }
});
