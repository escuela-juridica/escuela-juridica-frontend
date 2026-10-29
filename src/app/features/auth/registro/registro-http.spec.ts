import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Session } from '../../../core/session/session';
import { Registro } from './registro';
import { By } from '@angular/platform-browser';
import { AntiRobot } from './anti-robot';

describe('Registro: llamadas HTTP reales del componente', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [Registro],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('entrega a HU-003 la referencia y el fallo SMTP sin recrear la cuenta', () => {
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Registro);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.formulario.patchValue({
      nombres: 'Ana',
      apellidoPaterno: 'Pérez',
      correo: 'ana@example.com',
      contrasena: 'Clave123',
      confirmarContrasena: 'Clave123',
      aceptaTerminos: true,
      evidenciaAntiRobot: 'evidencia-simulada-solo-en-prueba',
    });
    component.registrar();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/auth/registro').flush({
      usuarioId: 123,
      correo: 'ana@example.com',
      envioAceptado: false,
      referenciaVerificacion: '123',
    });
    expect(navegar).toHaveBeenCalledWith(['/verificar-correo'], {
      queryParams: { referencia: '123' },
      state: { envioAceptado: false, correo: 'ana@example.com' },
    });
    expect(component.cuentaCreada).toBe(true);
    component.registrar();
    http.expectNone(() => true);
    fixture.destroy();
  });

  it('acepta el contrato Google del backend y entrega la sesión al panel', () => {
    const route = TestBed.inject(ActivatedRoute);
    vi.spyOn(route.snapshot.queryParamMap, 'get').mockImplementation((nombre) =>
      nombre === 'referenciaGoogle' ? 'contexto-hu001' : null,
    );
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Registro);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/auth/registro/google/contexto-hu001').flush({
      correo: 'ana@example.com',
      nombres: 'Ana',
      apellidos: 'Pérez García',
      fotoUrl: null,
      venceEn: new Date(Date.now() + 120_000).toISOString(),
    });
    const component = fixture.componentInstance;
    expect(component.formulario.controls.correo.disabled).toBe(true);
    expect(component.formulario.controls.apellidoPaterno.value).toBe('Pérez García');
    component.formulario.controls.aceptaTerminos.setValue(true);
    component.registrar();
    const solicitud = http.expectOne('/api/auth/registro/google');
    expect(solicitud.request.body).toEqual({
      referencia: 'contexto-hu001',
      nombres: 'Ana',
      apellidoPaterno: 'Pérez García',
      apellidoMaterno: null,
      telefono: null,
      documentoIdentidad: null,
      aceptaTerminos: true,
    });
    solicitud.flush({ nombre: 'Ana', email: 'ana@example.com', rol: 'alumno' });
    expect(TestBed.inject(Session).usuario()).toEqual({
      nombre: 'Ana',
      email: 'ana@example.com',
      rol: 'alumno',
    });
    expect(navegar).toHaveBeenCalledWith(['/app/panel']);
    http.expectNone(() => true);
    fixture.destroy();
  });

  it('conecta el desafío con el registro y lo reinicia si el envío falla', () => {
    const fixture = TestBed.createComponent(Registro);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const antiRobot = fixture.debugElement.query(By.directive(AntiRobot))
      .componentInstance as AntiRobot;
    const http = TestBed.inject(HttpTestingController);
    antiRobot.crear();
    http.expectOne('/api/auth/registro/antirobot/desafios').flush({
      desafioId: 'desafio',
      pregunta: '¿Cuánto es 1 + 2?',
      vigenciaSegundos: 120,
    });
    antiRobot.respuesta.setValue('3');
    antiRobot.verificar();
    http.expectOne('/api/auth/registro/antirobot/verificar').flush({
      evidencia: 'evidencia-validada',
      vigenciaSegundos: 120,
    });
    component.formulario.patchValue({
      nombres: 'Ana',
      apellidoPaterno: 'Pérez',
      correo: 'ana@example.com',
      contrasena: 'Clave123',
      confirmarContrasena: 'Clave123',
      aceptaTerminos: true,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
    component.registrar();
    const registro = http.expectOne('/api/auth/registro');
    expect(registro.request.body.evidenciaAntiRobot).toBe('evidencia-validada');
    registro.flush(
      { message: 'Servicio no disponible' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    fixture.detectChanges();
    expect(component.formulario.controls.correo.value).toBe('ana@example.com');
    expect(component.formulario.controls.evidenciaAntiRobot.value).toBe('');
    expect(antiRobot.completado()).toBe(false);
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    fixture.destroy();
  });

  it('abrir el formulario no consulta configuración, sesión ni proveedores retirados', async () => {
    const fixture = TestBed.createComponent(Registro);
    fixture.detectChanges();
    await fixture.whenStable();
    TestBed.inject(HttpTestingController).expectNone(() => true);
    expect(fixture.componentInstance.errorGeneral).toBe('');
    expect(fixture.nativeElement.querySelector('.alerta--error')).toBeNull();
  });

  it('con referencia solo consulta la operación Google indicada en el mapa', async () => {
    const route = TestBed.inject(ActivatedRoute);
    vi.spyOn(route.snapshot.queryParamMap, 'get').mockImplementation((nombre) =>
      nombre === 'referenciaGoogle' ? 'contexto-hu001' : null,
    );
    const fixture = TestBed.createComponent(Registro);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    const solicitud = http.expectOne('/api/auth/registro/google/contexto-hu001');
    expect(solicitud.request.method).toBe('GET');
    solicitud.flush(
      { code: 'GOOGLE_PENDIENTE', message: 'Pendiente de integrar HU-001.' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    await fixture.whenStable();
    expect(fixture.componentInstance.avisoGoogle).toContain('pendiente');
    expect(fixture.nativeElement.querySelector('.alerta--error')).toBeNull();
    http.expectNone(() => true);
  });
});
