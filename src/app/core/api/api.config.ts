import { environment } from '../../../environments/environment';

export const API_URL = environment.apiUrl;

export function resolverUrlApi(ruta: string): string {
  if (!ruta.startsWith('/api/') && !ruta.startsWith('/uploads/')) {
    return ruta;
  }
  const origen = new URL(API_URL, window.location.origin).origin;
  return origen + ruta;
}
