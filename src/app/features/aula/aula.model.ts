import { EstadoSesion } from '../sesiones/sesion-alumno.model';

/** HU-022 — Ingresar y continuar un curso. Espejo de `AulaRespuesta` (backend). */
export type TipoLeccionAula = 'GRABADA' | 'EN_VIVO';
export type EstadoLeccionAula = 'COMPLETADA' | 'DISPONIBLE' | 'BLOQUEADA';

export interface LeccionAulaRespuesta {
  id: number;
  titulo: string;
  tipo: TipoLeccionAula;
  orden: number;
  esObligatoria: boolean;
  estado: EstadoLeccionAula;
  /** Solo viene relleno cuando `estado === 'BLOQUEADA'`. */
  motivoBloqueo: string | null;
  /** Informados solo cuando `tipo === 'EN_VIVO'`; `null` en lecciones GRABADA. */
  fechaHoraInicio: string | null;
  fechaHoraFin: string | null;
  estadoSesion: EstadoSesion | null;
  grabacionDisponible: boolean;
}

export interface ModuloAulaRespuesta {
  id: number;
  titulo: string;
  orden: number;
  lecciones: LeccionAulaRespuesta[];
}

export interface AulaRespuesta {
  matriculaId: number;
  cursoId: number;
  cursoTitulo: string;
  modalidad: string;
  porcentaje: number;
  modulos: ModuloAulaRespuesta[];
  ultimaLeccionIdValida: number | null;
}
