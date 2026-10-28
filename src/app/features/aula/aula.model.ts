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
  descripcion: string | null;
  /** Duración del video más largo de la lección, si se conoce. */
  duracionSegundos: number | null;
}

/** HU-025 — Examen de un módulo. Rendirlo es Épica 5; aquí solo se informa su estado. */
export interface ExamenAulaRespuesta {
  id: number;
  titulo: string;
  tipo: string;
  bloqueaSiguienteModulo: boolean;
  aprobado: boolean;
  mejorNota: number | null;
}

/** HU-025 — Una condición activa del certificado con su valor real y su meta. */
export interface CondicionAvance {
  codigo: 'PROGRESO' | 'EXAMENES' | 'NOTA' | 'ASISTENCIA';
  titulo: string;
  valorActual: string;
  meta: string;
  cumplida: boolean;
}

export interface AvanceCertificado {
  condiciones: CondicionAvance[];
  cumpleTodo: boolean;
  fraseAccionable: string;
}

export interface ModuloAulaRespuesta {
  id: number;
  titulo: string;
  orden: number;
  lecciones: LeccionAulaRespuesta[];
  examenes: ExamenAulaRespuesta[];
}

export interface AulaRespuesta {
  matriculaId: number;
  cursoId: number;
  cursoTitulo: string;
  modalidad: string;
  porcentaje: number;
  modulos: ModuloAulaRespuesta[];
  ultimaLeccionIdValida: number | null;
  avanceCertificado: AvanceCertificado;
}
