import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { API_URL } from '../../../core/api/api.config';
import { Panel } from './panel';

describe('Panel', () => {
  let component: Panel;
  let fixture: ComponentFixture<Panel>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Panel],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Panel);
    component = fixture.componentInstance;
    const solicitud = http.expectOne((r) => r.url === `${API_URL}/app/panel/cursos`);
    expect(solicitud.request.params.get('estado')).toBe('EN_PROGRESO');
    expect(solicitud.request.params.get('size')).toBe('10');
    solicitud.flush({
      cursos: { items: [], page: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true },
      enProgreso: 0,
      completados: 0,
    });
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
