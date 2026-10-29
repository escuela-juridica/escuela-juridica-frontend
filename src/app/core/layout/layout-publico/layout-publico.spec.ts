import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LayoutPublico } from './layout-publico';

describe('LayoutPublico', () => {
  let component: LayoutPublico;
  let fixture: ComponentFixture<LayoutPublico>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutPublico],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(LayoutPublico);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
