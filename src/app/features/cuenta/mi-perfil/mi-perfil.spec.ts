import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MiPerfil } from './mi-perfil';

describe('MiPerfil', () => {
  let component: MiPerfil;
  let fixture: ComponentFixture<MiPerfil>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiPerfil],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(MiPerfil);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
