/** HU-026 — Estado de una sesión EN_VIVO vista por el alumno. */
export type EstadoSesion = 'FUTURA' | 'EN_VENTANA' | 'REALIZADA' | 'CANCELADA';

/** Una sesión en vivo dentro del calendario del alumno. `enlaceReunion` solo viene informado
 * cuando `estadoSesion === 'EN_VENTANA'`. */
export interface SesionCalendarioRespuesta {
  leccionId: number;
  cursoId: number;
  cursoTitulo: string;
  titulo: string;
  fechaHoraInicio: string | null;
  fechaHoraFin: string | null;
  estadoSesion: EstadoSesion;
  enlaceReunion: string | null;
  grabacionDisponible: boolean;
}

/** Enlace real de la reunión, entregado solo dentro de la ventana de inicio a fin. */
export interface IngresarSesionRespuesta {
  enlaceReunion: string;
}
