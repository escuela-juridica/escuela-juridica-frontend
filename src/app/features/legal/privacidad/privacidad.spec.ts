import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Privacidad } from './privacidad';

describe('Privacidad', () => {
  let component: Privacidad;
  let fixture: ComponentFixture<Privacidad>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Privacidad],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Privacidad);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('presenta el contenido de la maqueta sin instrucciones de desarrollo', () => {
    const pagina = fixture.nativeElement as HTMLElement;
    expect(pagina.querySelector('h1')?.textContent).toBe('Política de privacidad');
    expect(pagina.querySelectorAll('.legal-secciones h2')).toHaveLength(5);
    expect(pagina.textContent).not.toContain('Pegar acá');
    expect(pagina.querySelector('header')).toBeNull();
    expect(pagina.querySelector('footer')).toBeNull();
  });

  it('incluye índice nativo abierto y destinos accesibles para sus cinco enlaces', () => {
    const pagina = fixture.nativeElement as HTMLElement;
    expect(pagina.querySelector('details')?.open).toBe(true);
    expect(pagina.querySelector('summary')?.textContent).toContain('Índice del documento');
    for (let i = 1; i <= 5; i++) {
      expect(pagina.querySelector('a[fragment="seccion-' + i + '"]')).not.toBeNull();
      expect(pagina.querySelector('#seccion-' + i)?.getAttribute('tabindex')).toBe('-1');
    }
  });

  it('enlaza al otro documento y al catálogo mediante rutas Angular', () => {
    const pagina = fixture.nativeElement as HTMLElement;
    expect(pagina.querySelector('a[routerLink="/terminos"]')?.getAttribute('href')).toBe(
      '/terminos',
    );
    expect(pagina.querySelector('[routerLink="/catalogo"]')).not.toBeNull();
    expect(pagina.querySelector('[onclick]')).toBeNull();
  });
});
