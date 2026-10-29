import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Registro } from './registro';
import { WHATSAPP_REGISTRO, enlaceAyudaRegistro } from './registro-contacto';

describe('Ayuda por WhatsApp de HU-002', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [Registro],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );

  it('no construye enlaces con número ausente o inválido', () => {
    for (const numero of ['', '+51999999999', 'abc', '123', '000000000', '51999?text=otro']) {
      expect(enlaceAyudaRegistro(numero)).toBeNull();
    }
  });

  it('informa que falta configuración sin enlazar a un destinatario inventado', () => {
    TestBed.overrideProvider(WHATSAPP_REGISTRO, { useValue: '' });
    const fixture = TestBed.createComponent(Registro);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.registro-whatsapp a')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('WhatsApp pendiente de configurar');
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });

  it('prepara ayuda en otra pestaña sin crear cuenta ni incluir los datos del formulario', () => {
    // Número ficticio solo para inspeccionar el DOM: la prueba no abre ni envía mensajes.
    TestBed.overrideProvider(WHATSAPP_REGISTRO, { useValue: '51999999999' });
    const fixture = TestBed.createComponent(Registro);
    fixture.detectChanges();
    fixture.componentInstance.formulario.controls.correo.setValue('privado@example.com');
    const enlace = fixture.nativeElement.querySelector('.registro-whatsapp a') as HTMLAnchorElement;
    const url = new URL(enlace.href);
    expect(url.hostname).toBe('wa.me');
    expect(url.pathname).toBe('/51999999999');
    expect(url.searchParams.get('text')).toBe(
      'Hola, necesito ayuda para crear mi cuenta en ESEJUR.',
    );
    expect(enlace.href).not.toContain('privado');
    expect(enlace.target).toBe('_blank');
    expect(enlace.rel).toContain('noopener');
    expect(fixture.nativeElement.textContent).toContain(
      'No crea una cuenta ni realiza una matrícula',
    );
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });
});
