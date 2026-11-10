import { resolverUrlApi } from '../../core/api/api.config';
import { CodigoEstadoComercial, Modalidad } from './curso.model';

export function urlPortadaCurso(ruta: string | null | undefined): string {
  return ruta ? resolverUrlApi(ruta) : '';
}

export function claseModalidad(modalidad: Modalidad | null): string {
  switch (modalidad) {
    case 'EN_VIVO':
      return 'badge--modalidad-vivo';
    case 'HIBRIDO':
      return 'badge--modalidad-hibrido';
    default:
      return 'badge--modalidad-virtual';
  }
}

export function etiquetaModalidad(modalidad: Modalidad | null): string {
  switch (modalidad) {
    case 'EN_VIVO':
      return 'En vivo';
    case 'HIBRIDO':
      return 'Híbrido';
    default:
      return 'Virtual';
  }
}

export function claseDisponibilidad(codigo: CodigoEstadoComercial): string {
  switch (codigo) {
    case 'IMMEDIATE_START':
      return 'badge--disp-inmediato';
    case 'ENROLLMENT_CLOSED':
    case 'NO_CAPACITY':
      return 'badge--disp-cerrado';
    default:
      return 'badge--disp-proximo';
  }
}

export function formatearFecha(fecha: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Lima',
  }).format(new Date(`${fecha}T12:00:00`));
}

export function formatearFechaHora(fechaHoraIso: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Lima',
  }).format(new Date(fechaHoraIso));
}

export function formatearFechaLarga(fechaHoraIso: string): string {
  return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' })
    .format(new Date(fechaHoraIso));
}

export function formatearFechaHoraCorta(fechaHoraIso: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Lima',
  }).format(new Date(fechaHoraIso));
}

export function formatearDiaMes(fechaHoraIso: string): string {
  return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'America/Lima' })
    .format(new Date(fechaHoraIso));
}

export function formatearHora(fechaHoraIso: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Lima',
  }).format(new Date(fechaHoraIso));
}

export function formatearPrecio(monto: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(monto);
}

export const BILLETERAS_HABILITADAS = false;

export const LIMITE_BILLETERA_SOLES = 500;

export function mediosDePago(precio: number): string[] {
  const conBilletera = BILLETERAS_HABILITADAS && precio <= LIMITE_BILLETERA_SOLES;
  return ['Tarjeta de crédito o débito', 'Yape', ...(conBilletera ? ['Plin'] : [])];
}

export function descripcionMedios(precio: number): string {
  const medios = mediosDePago(precio).map((m) => (m.startsWith('Tarjeta') ? 'tarjeta' : m));
  return medios.length > 1 ? `${medios.slice(0, -1).join(', ')} o ${medios[medios.length - 1]}` : medios[0];
}

export function formatearDuracion(segundos: number): string {
  const minutos = Math.round(segundos / 60);
  return minutos <= 1 ? '1 min' : `${minutos} min`;
}
