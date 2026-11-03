/** HU-035/HU-036 — Gestión administrativa de certificados. */

export type EstadoCertificadoGestion = 'SIN_CERTIFICADO' | 'VIGENTE' | 'ANULADO';

/** Filtros de la lista de certificados: alumno y curso por identificador y la situación del certificado. */
export interface FiltrosGestion {
  usuarioId: number | null;
  cursoId: number | null;
  estado: string;
}

export interface CertificadoGestion {
  matriculaId: number;
  certificadoId: number | null;
  alumno: string;
  correo: string;
  cursoId: number;
  curso: string;
  estadoMatricula: string;
  estadoCertificado: EstadoCertificadoGestion;
  codigo: string | null;
  nivel: string | null;
  tipoEmision: string | null;
  emitidoEn: string | null;
  puedeEmitirManual: boolean;
  /** Porcentaje de avance del alumno en el curso. */
  avance: number;
  /** Ya reúne todas las condiciones para certificarse. */
  cumpleRequisitos: boolean;
  /** Fecha en que se matriculó el alumno. */
  fechaMatricula: string;
}

export interface CondicionAvance {
  codigo: string;
  titulo: string;
  valorActual: string;
  meta: string;
  cumplida: boolean;
}

export interface CertificadoResumen {
  codigo: string;
  estado: string;
  nivel: string;
  tipoEmision: string;
  emitidoEn: string;
  motivoEmisionManual: string | null;
}

export interface EmisionManualSituacion {
  matriculaId: number;
  alumno: string;
  correo: string;
  curso: string;
  modalidad: string;
  estadoMatricula: string;
  fechaMatricula: string;
  fechaFinalizacion: string | null;
  fechaMinimaFinalizacion: string;
  fechaMaximaFinalizacion: string;
  datosConfirmados: boolean;
  nombresConfirmados: string | null;
  notaFinal: number | null;
  nivel: string;
  entidad: string | null;
  /** Lo que se imprimiría (o ya se imprimió): horas, tipo de curso, periodo y firmantes. */
  horas: number;
  tipoCurso: string;
  /** Inicio del curso; null en un curso virtual sin fechas (el certificado no imprime periodo). */
  fechaInicio: string | null;
  /** Fin que fija el curso; null si no lo tiene (curso virtual con solo inicio o sin fechas). */
  fechaFinCurso: string | null;
  firmantes: { nombre: string; cargo: string }[];
  condiciones: CondicionAvance[];
  cumpleTodo: boolean;
  frase: string;
  certificado: CertificadoResumen | null;
  bloqueo: string | null;
}

export interface EmitirCertificadoManual {
  motivo: string;
  fechaFinalizacion: string | null;
  /** Nombres que se imprimirán; solo se envían si el alumno no los confirmó (los confirma la administración). */
  nombres?: string | null;
}

/** HU-036 — Corrección y anulación de un certificado. */
export interface FirmanteImpreso {
  firmanteId: number;
  nombre: string;
  cargo: string;
}

export type AccionHistorial = 'EMISION_MANUAL' | 'CORRECCION' | 'ANULACION';

export interface CambioCertificado {
  id: number;
  accion: AccionHistorial;
  datosAnteriores: string | null;
  datosNuevos: string | null;
  motivo: string;
  realizadoPor: string;
  realizadoEn: string;
}

export interface CertificadoDetalle {
  certificadoId: number;
  codigo: string;
  estado: 'VIGENTE' | 'ANULADO';
  tipoEmision: string;
  nivel: 'NORMAL' | 'REFRENDADO';
  nota: number | null;
  alumno: string;
  correo: string;
  cursoId: number;
  matriculaId: number;
  nombres: string;
  titulo: string;
  tipoCurso: string;
  horas: number;
  entidad: string | null;
  emitidoEn: string;
  anuladoEn: string | null;
  motivoAnulacion: string | null;
  puedeModificar: boolean;
  firmantes: FirmanteImpreso[];
  firmantesDisponibles: FirmanteImpreso[];
  historial: CambioCertificado[];
}

export interface CorregirCertificado {
  motivo: string;
  nombres: string;
  titulo: string;
  horas: number;
  entidad: string | null;
  firmanteIds: number[];
}

/** Igual que la corrección, sin el motivo: la vista previa no guarda nada. */
export type VistaPreviaCertificado = Omit<CorregirCertificado, 'motivo'>;

export interface AnularCertificado {
  motivo: string;
  confirmo: boolean;
}
