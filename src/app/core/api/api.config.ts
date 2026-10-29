import { environment } from '../../../environments/environment';

export const API_URL = environment.apiUrl;

/** Resuelve una ruta que el backend devuelve relativa a sí mismo (p. ej. "/api/app/materiales/5/contenido")
 * a una URL completa usable desde el navegador. Si ya es una URL externa completa (no empieza con
 * "/api/"), la devuelve intacta. */
export function resolverUrlApi(ruta: string): string {
  if (!ruta.startsWith('/api/') && !ruta.startsWith('/uploads/')) {
    return ruta;
  }
  const origen = new URL(API_URL, window.location.origin).origin;
  return origen + ruta;
}
