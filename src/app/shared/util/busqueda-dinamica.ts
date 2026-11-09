import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';

export const RETARDO_BUSQUEDA_MS = 300;

export function crearBusquedaDinamica(
  destroyRef: DestroyRef,
  ejecutar: () => void,
  retardoMs: number = RETARDO_BUSQUEDA_MS,
): () => void {
  const pulsaciones = new Subject<void>();
  pulsaciones.pipe(debounceTime(retardoMs), takeUntilDestroyed(destroyRef)).subscribe(() => ejecutar());
  return () => pulsaciones.next();
}
