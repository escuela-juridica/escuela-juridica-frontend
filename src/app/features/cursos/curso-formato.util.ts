import { CodigoEstadoComercial, Modalidad } from './curso.model';

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

/** "31 de octubre de 2026": una instancia (fecha y hora ISO) mostrada como fecha larga en hora de Lima. */
export function formatearFechaLarga(fechaHoraIso: string): string {
  return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' })
    .format(new Date(fechaHoraIso));
}

/** "31 oct 2026, 2:01 p. m.": fecha y hora cortas, en hora de Lima. */
export function formatearFechaHoraCorta(fechaHoraIso: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Lima',
  }).format(new Date(fechaHoraIso));
}

/** "31 oct": solo día y mes abreviado, en hora de Lima. */
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

export function formatearDuracion(segundos: number): string {
  const minutos = Math.round(segundos / 60);
  return minutos <= 1 ? '1 min' : `${minutos} min`;
}
