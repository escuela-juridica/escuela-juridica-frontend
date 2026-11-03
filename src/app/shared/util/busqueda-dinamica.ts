import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';

/** Pausa tras la última tecla antes de consultar al servidor. */
export const RETARDO_BUSQUEDA_MS = 300;

/**
 * Búsqueda dinámica para los listados del panel: cada pulsación del campo de texto llama a la función devuelta y,
 * cuando el usuario hace una pausa, se ejecuta `ejecutar` una sola vez (la consulta al servidor). Así se escribe
 * «Gabriel» sin lanzar una petición por letra. Se limpia sola al destruirse el componente.
 */
export function crearBusquedaDinamica(
  destroyRef: DestroyRef,
  ejecutar: () => void,
  retardoMs: number = RETARDO_BUSQUEDA_MS,
): () => void {
  const pulsaciones = new Subject<void>();
  pulsaciones.pipe(debounceTime(retardoMs), takeUntilDestroyed(destroyRef)).subscribe(() => ejecutar());
  return () => pulsaciones.next();
}
