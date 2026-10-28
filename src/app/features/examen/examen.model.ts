/** HU-028 / HU-029 — Modelos de la rendición de exámenes (espejo de los DTO del backend). */

export type TipoExamen = 'CALIFICADO' | 'PRACTICA';
export type TipoPregunta = 'SELECCION_UNICA' | 'SELECCION_MULTIPLE' | 'VERDADERO_FALSO' | 'RESPUESTA_ABIERTA';
export type EstadoIntento = 'EN_PROGRESO' | 'PENDIENTE_REVISION' | 'CALIFICADO' | 'VENCIDO';

export interface IntentoResumen {
  id: number;
  numero: number;
  estado: EstadoIntento;
  nota: number | null;
  aprobado: boolean | null;
  iniciadoEn: string;
  enviadoEn: string | null;
  fechaLimiteRevision: string | null;
}

export interface ExamenFicha {
  id: number;
  cursoId: number;
  titulo: string;
  descripcion: string | null;
  tipo: TipoExamen;
  finalidad: 'MODULO' | 'FINAL';
  modulo: string | null;
  totalPreguntas: number;
  puntajeTotal: number;
  tieneRespuestaAbierta: boolean;
  tiempoLimiteMinutos: number | null;
  /** null = intentos ilimitados. */
  intentosMaximos: number | null;
  intentosUsados: number;
  intentosRestantes: number | null;
  mostrarRespuestas: 'AL_APROBAR' | 'AL_AGOTAR' | 'NUNCA';
  notaMinima: number;
  afectaCertificacion: boolean;
  bloqueaSiguienteModulo: boolean;
  habilitado: boolean;
  puedeIniciar: boolean;
  motivoNoPuedeIniciar: string | null;
  agotadoSinAprobar: boolean;
  soloLectura: boolean;
  intentoEnCursoId: number | null;
  aprobado: boolean;
  mejorNota: number | null;
  intentos: IntentoResumen[];
}

export interface OpcionIntento {
  id: number;
  texto: string;
  /** Solo se informa cuando las respuestas ya pueden mostrarse. */
  esCorrecta: boolean | null;
}

export interface PreguntaIntento {
  id: number;
  tipo: TipoPregunta;
  enunciado: string;
  puntaje: number;
  posicion: number;
  opciones: OpcionIntento[];
  seleccionadas: number[];
  texto: string | null;
  respondida: boolean;
  puntajeObtenido: number | null;
  correcta: boolean | null;
  estadoRevision: 'NO_APLICA' | 'PENDIENTE' | 'REVISADA' | null;
}

export interface Intento {
  id: number;
  examenId: number;
  cursoId: number;
  examenTitulo: string;
  tipo: TipoExamen;
  numero: number;
  estado: EstadoIntento;
  iniciadoEn: string;
  expiraEn: string | null;
  segundosRestantes: number | null;
  /** Hora del servidor al responder: permite corregir diferencias de reloj. */
  ahora: string;
  puntajeTotal: number;
  puntajeObtenido: number | null;
  nota: number | null;
  aprobado: boolean | null;
  notaMinima: number;
  enviadoEn: string | null;
  cerradoPorTiempo: boolean;
  fechaLimiteRevision: string | null;
  respuestasVisibles: boolean;
  afectaCertificacion: boolean;
  preguntas: PreguntaIntento[];
}

export interface GuardarRespuesta {
  opcionesIds: number[];
  texto: string | null;
}
