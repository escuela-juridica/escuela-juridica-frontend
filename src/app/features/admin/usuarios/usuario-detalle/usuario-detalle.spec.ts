import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsuarioDetalle } from './usuario-detalle';

describe('UsuarioDetalle', () => {
  let component: UsuarioDetalle;
  let fixture: ComponentFixture<UsuarioDetalle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsuarioDetalle],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(UsuarioDetalle);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('usuarioId', 1);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
