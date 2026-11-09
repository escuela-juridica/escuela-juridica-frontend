import { InjectionToken } from '@angular/core';

export const NUMERO_WHATSAPP_REGISTRO = '';

export const WHATSAPP_REGISTRO = new InjectionToken<string>('WHATSAPP_REGISTRO', {
  providedIn: 'root',
  factory: () => NUMERO_WHATSAPP_REGISTRO,
});

export function enlaceAyudaRegistro(numero: string): string | null {
  if (!/^[1-9]\d{7,14}$/.test(numero)) return null;
  const mensaje = 'Hola, necesito ayuda para crear mi cuenta en ESEJUR.';
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
