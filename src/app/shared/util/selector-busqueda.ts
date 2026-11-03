import { DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, debounceTime, switchMap, tap } from 'rxjs';

export interface OpcionSelect {
  id: number;
  etiqueta: string;
  /** Texto secundario que solo se ve en la lista desplegable. */
  detalle?: string;
}

/**
 * Estado de un `ng-select` con búsqueda en el servidor: cada tecleo (con retardo) consulta por texto y el
 * desplegable muestra lo que devuelve, en vez de filtrar una lista recortada. Sirve para filtros: elegir una
 * opción no recarga nada, eso lo decide el botón «Buscar» de la pantalla.
 *
 * Se usa en el contexto de inyección del componente y se enlaza con `[items]`, `[typeahead]` y `[loading]`.
 * `seleccionada` devuelve el identificador elegido para que su etiqueta no se pierda si la búsqueda no lo incluye.
 */
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
      // ng-select emite null al elegir una opción: se trata como búsqueda vacía.
      switchMap((texto) => consultar(texto ?? '')),
      takeUntilDestroyed(destroyRef),
    )
    .subscribe(publicar);

  // Primeras opciones, para que el desplegable no esté vacío antes de escribir.
  buscando.set(true);
  consultar('').pipe(takeUntilDestroyed(destroyRef)).subscribe(publicar);

  return { opciones, buscando, busqueda$ };
}
