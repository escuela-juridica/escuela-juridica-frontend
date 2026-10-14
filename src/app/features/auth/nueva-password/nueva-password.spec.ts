import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NuevaPassword } from './nueva-password';

describe('NuevaPassword', () => {
  let component: NuevaPassword;
  let fixture: ComponentFixture<NuevaPassword>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NuevaPassword],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(NuevaPassword);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
