import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { VerificarCorreo } from './verificar-correo';

describe('VerificarCorreo', () => {
  let component: VerificarCorreo;
  let fixture: ComponentFixture<VerificarCorreo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerificarCorreo],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(VerificarCorreo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
