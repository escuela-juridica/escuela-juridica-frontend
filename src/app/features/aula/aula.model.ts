import { EstadoSesion } from '../sesiones/sesion-alumno.model';

export type TipoLeccionAula = 'GRABADA' | 'EN_VIVO';
export type EstadoLeccionAula = 'COMPLETADA' | 'DISPONIBLE' | 'BLOQUEADA';

export interface LeccionAulaRespuesta {
  id: number;
  titulo: string;
  tipo: TipoLeccionAula;
  orden: number;
  esObligatoria: boolean;
  estado: EstadoLeccionAula;
  motivoBloqueo: string | null;
  fechaHoraInicio: string | null;
  fechaHoraFin: string | null;
  estadoSesion: EstadoSesion | null;
  grabacionDisponible: boolean;
  descripcion: string | null;
  duracionSegundos: number | null;
}

export type EstadoExamenAula = 'PENDIENTE' | 'EN_CURSO' | 'EN_REVISION' | 'APROBADO' | 'NO_APROBADO';

export interface ExamenAulaRespuesta {
  id: number;
  titulo: string;
  tipo: 'CALIFICADO' | 'PRACTICA';
  finalidad: 'MODULO' | 'FINAL';
  bloqueaSiguienteModulo: boolean;
  aprobado: boolean;
  mejorNota: number | null;
  estado: EstadoExamenAula;
  habilitado: boolean;
  motivoNoHabilitado: string | null;
  intentosUsados: number;
  intentosMaximos: number | null;
  fechaLimiteRevision: string | null;
}

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
  examenesFinales: ExamenAulaRespuesta[];
  imagenPortadaUrl: string | null;
  horasAcademicas: number | null;
  cursoCancelado: boolean;
  motivoCancelacionCurso: string | null;
}
