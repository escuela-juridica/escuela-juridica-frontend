import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';

import { TablaPaginacion } from './tabla-paginacion';

/** Pie de tabla con paginación del servidor: resumen de registros y controles de página. */
describe('TablaPaginacion', () => {
  let fixture: ComponentFixture<TablaPaginacion>;

  function montar(pagina: number, tamano: number, total: number): HTMLElement {
    fixture.componentRef.setInput('pagina', pagina);
    fixture.componentRef.setInput('tamano', tamano);
    fixture.componentRef.setInput('total', total);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const resumen = (el: HTMLElement) => el.querySelector('.tp__resumen')!.textContent!.replace(/\s+/g, ' ').trim();
  const numeros = (el: HTMLElement) =>
    [...el.querySelectorAll('.tp__numero, .tp__puntos')].map((n) => n.textContent!.trim());

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TablaPaginacion] }).compileComponents();
    fixture = TestBed.createComponent(TablaPaginacion);
  });

  it('muestra el rango y el total de registros de la página actual', () => {
    const el = montar(4, 10, 95);
    expect(resumen(el)).toBe('Mostrando 41 a 50 de 95 registros');
  });

  it('la última página recorta el rango al total', () => {
    const el = montar(9, 10, 95);
    expect(resumen(el)).toBe('Mostrando 91 a 95 de 95 registros');
  });

  it('sin resultados muestra ceros y no dibuja los controles', () => {
    const el = montar(0, 10, 0);
    expect(resumen(el)).toBe('Mostrando 0 a 0 de 0 registros');
    expect(el.querySelector('.tp__nav')).toBeNull();
  });

  it('con un solo registro usa el singular y no pagina', () => {
    const el = montar(0, 10, 1);
    expect(resumen(el)).toBe('Mostrando 1 a 1 de 1 registro');
    expect(el.querySelector('.tp__nav')).toBeNull();
  });

  it('con una sola página llena no muestra controles', () => {
    const el = montar(0, 10, 8);
    expect(resumen(el)).toBe('Mostrando 1 a 8 de 8 registros');
    expect(el.querySelector('.tp__nav')).toBeNull();
  });

  it('resume con «…» los saltos entre la primera, la actual y la última página', () => {
    const el = montar(4, 10, 95);
    expect(numeros(el)).toEqual(['1', '…', '4', '5', '6', '…', '10']);
  });

  it('no deja saltos cuando las páginas son pocas o contiguas', () => {
    expect(numeros(montar(0, 10, 30))).toEqual(['1', '2', '3']);
    expect(numeros(montar(1, 10, 50))).toEqual(['1', '2', '3', '…', '5']);
  });

  it('marca la página actual y emite la página elegida (base 0)', () => {
    const el = montar(4, 10, 95);
    const emitidas: number[] = [];
    fixture.componentInstance.cambiar.subscribe((p) => emitidas.push(p));

    const activa = el.querySelector('.tp__numero--activa')!;
    expect(activa.textContent!.trim()).toBe('5');
    expect(activa.getAttribute('aria-current')).toBe('page');

    (el.querySelector('[aria-label="Página 6"]') as HTMLButtonElement).click();
    expect(emitidas).toEqual([5]);
  });

  it('Anterior y Siguiente avanzan de a una página y se deshabilitan en los extremos', () => {
    let el = montar(0, 10, 30);
    const botones = () => [...el.querySelectorAll<HTMLButtonElement>('.tp__boton')];
    expect(botones()[0].disabled).toBe(true);
    expect(botones()[1].disabled).toBe(false);

    const emitidas: number[] = [];
    fixture.componentInstance.cambiar.subscribe((p) => emitidas.push(p));
    botones()[1].click();
    expect(emitidas).toEqual([1]);

    el = montar(2, 10, 30);
    expect(botones()[0].disabled).toBe(false);
    expect(botones()[1].disabled).toBe(true);
  });

  it('no emite al pulsar la página que ya está activa', () => {
    const el = montar(2, 10, 50);
    const emitidas: number[] = [];
    fixture.componentInstance.cambiar.subscribe((p) => emitidas.push(p));
    (el.querySelector('.tp__numero--activa') as HTMLButtonElement).click();
    expect(emitidas).toEqual([]);
  });
});
