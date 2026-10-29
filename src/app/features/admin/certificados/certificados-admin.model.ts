/** HU-035/HU-036 — Gestión administrativa de certificados. */

export type EstadoCertificadoGestion = 'SIN_CERTIFICADO' | 'VIGENTE' | 'ANULADO';

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
  condiciones: CondicionAvance[];
  cumpleTodo: boolean;
  frase: string;
  certificado: CertificadoResumen | null;
  bloqueo: string | null;
}

export interface EmitirCertificadoManual {
  motivo: string;
  fechaFinalizacion: string | null;
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

export interface AnularCertificado {
  motivo: string;
  confirmo: boolean;
}
