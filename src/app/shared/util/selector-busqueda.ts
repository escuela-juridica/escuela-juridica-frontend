import { DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, debounceTime, switchMap, tap } from 'rxjs';

export interface OpcionSelect {
  id: number;
  etiqueta: string;
  detalle?: string;
}

export function crearSelectorBusqueda(
  destroyRef: DestroyRef,
  consultar: (texto: string) => Observable<OpcionSelect[]>,
  seleccionada: () => number | null,
  retardoMs = 300,
) {
  const opciones = signal<OpcionSelect[]>([]);
  const buscando = signal(false);
  const busqueda$ = new Subject<string>();

  const publicar = (nuevas: OpcionSelect[]): void => {
    const id = seleccionada();
    const elegida = id ? opciones().find((o) => o.id === id) : undefined;
    opciones.set(elegida && !nuevas.some((o) => o.id === elegida.id) ? [elegida, ...nuevas] : nuevas);
    buscando.set(false);
  };

  busqueda$
    .pipe(
      debounceTime(retardoMs),
      tap(() => buscando.set(true)),
      switchMap((texto) => consultar(texto ?? '')),
      takeUntilDestroyed(destroyRef),
    )
    .subscribe(publicar);

  buscando.set(true);
  consultar('').pipe(takeUntilDestroyed(destroyRef)).subscribe(publicar);

  return { opciones, buscando, busqueda$ };
}
