import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AntiRobot } from './anti-robot';

describe('AntiRobot nativo', () => {
  let fixture: ComponentFixture<AntiRobot>;
  let component: AntiRobot;
  let http: HttpTestingController;
  let emitir: ReturnType<typeof vi.spyOn>;
  const base = '/api/auth/registro/antirobot';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AntiRobot],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(AntiRobot);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    emitir = vi.spyOn(component.evidencia, 'emit');
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
    vi.useRealTimers();
  });

  function crear() {
    component.crear();
    const peticion = http.expectOne(`${base}/desafios`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.withCredentials).toBe(true);
    peticion.flush({
      desafioId: 'id-del-servidor',
      pregunta: '¿Cuánto es 4 + 5?',
      vigenciaSegundos: 120,
    });
  }

  function resolver() {
    component.respuesta.setValue('9');
    component.verificar();
    const peticion = http.expectOne(`${base}/verificar`);
    expect(peticion.request.body).toEqual({ desafioId: 'id-del-servidor', respuesta: 9 });
    expect(peticion.request.withCredentials).toBe(true);
    peticion.flush({ evidencia: 'prueba-del-servidor', vigenciaSegundos: 120 });
  }

  it('no solicita desafíos hasta pulsar el botón y no envía formularios por sus botones', () => {
    http.expectNone(() => true);
    expect(fixture.nativeElement.querySelector('button').type).toBe('button');
    expect(component.completado()).toBe(false);
  });

  it('solo emite evidencia después de que el servidor acepta la respuesta', () => {
    crear();
    expect(emitir).not.toHaveBeenCalledWith('prueba-del-servidor');
    resolver();
    expect(emitir).toHaveBeenLastCalledWith('prueba-del-servidor');
    expect(component.completado()).toBe(true);
    expect(component.desafio()).toBeNull();
  });

  it('rechaza respuestas no numéricas antes de enviarlas', () => {
    crear();
    component.respuesta.setValue('abc');
    component.verificar();
    http.expectNone(`${base}/verificar`);
  });

  it('muestra el rechazo del servidor y permite corregir la respuesta', () => {
    crear();
    component.respuesta.setValue('8');
    component.verificar();
    http
      .expectOne(`${base}/verificar`)
      .flush({ message: 'Respuesta incorrecta' }, { status: 400, statusText: 'Bad Request' });
    expect(component.mensaje()).toBe('Respuesta incorrecta');
    expect(emitir).toHaveBeenLastCalledWith('');
    expect(component.ocupado()).toBe(false);
    resolver();
    expect(component.completado()).toBe(true);
  });

  it('invalida la evidencia al vencer', () => {
    vi.useFakeTimers();
    crear();
    resolver();
    vi.advanceTimersByTime(120_000);
    expect(emitir).toHaveBeenLastCalledWith('');
    expect(component.completado()).toBe(false);
    expect(component.mensaje()).toContain('venció');
  });

  it('descarta una respuesta HTTP tardía cuando vence el desafío', () => {
    vi.useFakeTimers();
    crear();
    component.respuesta.setValue('9');
    component.verificar();
    const pendiente = http.expectOne(`${base}/verificar`);
    vi.advanceTimersByTime(120_000);
    expect(pendiente.cancelled).toBe(true);
    expect(component.completado()).toBe(false);
    expect(emitir).toHaveBeenLastCalledWith('');
  });

  it('reinicia después del envío del formulario sin generar otra solicitud automática', () => {
    crear();
    resolver();
    fixture.componentRef.setInput('reinicio', 1);
    fixture.detectChanges();
    expect(emitir).toHaveBeenLastCalledWith('');
    expect(component.completado()).toBe(false);
    http.expectNone(() => true);
  });

  it('respeta el bloqueo mientras el registro está enviándose', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    component.crear();
    http.expectNone(() => true);
  });

  it('explica el fallo de conexión y permite volver a solicitar', () => {
    component.crear();
    http.expectOne(`${base}/desafios`).error(new ProgressEvent('error'));
    expect(component.mensaje()).toContain('backend');
    expect(component.ocupado()).toBe(false);
    crear();
    expect(component.desafio()).not.toBeNull();
  });
});
