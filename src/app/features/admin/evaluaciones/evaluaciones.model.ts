/** HU-030 — Calificar respuestas abiertas (administrador). Espejo de los DTO del backend. */
export type PlazoRevision = 'VENCIDO' | 'PROXIMO' | 'EN_PLAZO';

export interface IntentoPendiente {
  intentoId: number;
  matriculaId: number;
  alumno: string;
  correo: string;
  cursoId: number;
  curso: string;
  examenId: number;
  examen: string;
  numeroIntento: number;
  enviadoEn: string;
  fechaLimite: string;
  plazo: PlazoRevision;
  /** Negativo cuando ya está vencido. */
  minutosRestantes: number;
  respuestasPendientes: number;
}

export interface ResumenBandeja {
  pendientes: number;
  proximos: number;
  vencidos: number;
}

export interface PreguntaRevision {
  respuestaId: number;
  posicion: number;
  enunciado: string;
  puntajeMaximo: number;
  texto: string | null;
  estadoRevision: 'PENDIENTE' | 'REVISADA' | 'NO_APLICA';
  /** Solo existe si la respuesta ya fue revisada. */
  puntajeAsignado: number | null;
  observacion: string | null;
  revisadoEn: string | null;
}

export interface RevisionIntento {
  intentoId: number;
  estado: 'PENDIENTE_REVISION' | 'CALIFICADO';
  matriculaId: number;
  alumno: string;
  correo: string;
  cursoId: number;
  curso: string;
  examenId: number;
  examen: string;
  tipo: 'CALIFICADO' | 'PRACTICA';
  numeroIntento: number;
  enviadoEn: string;
  fechaLimite: string | null;
  plazo: PlazoRevision | null;
  puntajeTotal: number;
  /** Lo que ya sumaron las preguntas objetivas. */
  puntajeObjetivo: number;
  notaMinima: number;
  nota: number | null;
  aprobado: boolean | null;
  calificadoEn: string | null;
  preguntas: PreguntaRevision[];
}

export interface PuntajeRespuesta {
  respuestaId: number;
  puntaje: number;
  observacion: string | null;
}

export interface FiltrosBandeja {
  texto: string;
  cursoId: number | null;
  plazo: string;
}
