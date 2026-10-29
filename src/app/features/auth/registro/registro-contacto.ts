import { InjectionToken } from '@angular/core';

// Completar únicamente con el número oficial acordado: código de país y número,
// sin +, espacios ni guiones. Vacío mantiene el canal deshabilitado.
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
