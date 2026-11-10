export type EstadoSesion = 'FUTURA' | 'EN_VENTANA' | 'REALIZADA' | 'CANCELADA';

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

export interface IngresarSesionRespuesta {
  enlaceReunion: string;
}
