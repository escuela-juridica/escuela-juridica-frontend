import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LayoutAdmin } from './layout-admin';

describe('LayoutAdmin', () => {
  let component: LayoutAdmin;
  let fixture: ComponentFixture<LayoutAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutAdmin],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(LayoutAdmin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
