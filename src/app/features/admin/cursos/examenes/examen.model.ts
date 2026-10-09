export type TipoExamen = 'CALIFICADO' | 'PRACTICA';
export type FinalidadExamen = 'MODULO' | 'FINAL';
export type MostrarRespuestas = 'AL_APROBAR' | 'AL_AGOTAR' | 'NUNCA';
export type TipoPregunta = 'SELECCION_UNICA' | 'SELECCION_MULTIPLE' | 'VERDADERO_FALSO' | 'RESPUESTA_ABIERTA';

export interface OpcionRespuesta {
  id: number;
  texto: string;
  esCorrecta: boolean;
  orden: number;
}

export interface PreguntaRespuesta {
  id: number;
  tipo: TipoPregunta;
  enunciado: string;
  puntaje: number;
  orden: number;
  activo: boolean;
  opciones: OpcionRespuesta[];
}

export interface ExamenRespuesta {
  id: number;
  cursoId: number;
  moduloId: number | null;
  moduloTitulo: string | null;
  titulo: string;
  descripcion: string | null;
  tipo: TipoExamen;
  finalidad: FinalidadExamen;
  orden: number;
  maximoIntentos: number | null;
  tiempoLimiteMinutos: number | null;
  barajarPreguntas: boolean;
  barajarOpciones: boolean;
  mostrarRespuestas: MostrarRespuestas;
  fechaHabilitacion: string | null;
  bloqueaSiguienteModulo: boolean;
  diasRevision: number;
  activo: boolean;
  examenOrigenId: number | null;
  preguntas: PreguntaRespuesta[];
}

export interface CrearExamenPeticion {
  moduloId: number | null;
  titulo: string;
  descripcion: string | null;
  tipo: TipoExamen;
  finalidad: FinalidadExamen;
  maximoIntentos: number | null;
  tiempoLimiteMinutos: number | null;
  barajarPreguntas: boolean;
  barajarOpciones: boolean;
  mostrarRespuestas: MostrarRespuestas;
  fechaHabilitacion: string | null;
  bloqueaSiguienteModulo: boolean;
  diasRevision: number | null;
}

export interface CrearOpcionPeticion {
  texto: string;
  esCorrecta: boolean;
}

export interface CrearPreguntaPeticion {
  tipo: TipoPregunta;
  enunciado: string;
  puntaje: number;
  opciones: CrearOpcionPeticion[];
}

export interface OrdenPeticion {
  ids: number[];
}
