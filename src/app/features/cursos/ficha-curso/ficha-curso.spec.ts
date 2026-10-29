import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FichaCurso } from './ficha-curso';

describe('FichaCurso', () => {
  let component: FichaCurso;
  let fixture: ComponentFixture<FichaCurso>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FichaCurso],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(FichaCurso);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
