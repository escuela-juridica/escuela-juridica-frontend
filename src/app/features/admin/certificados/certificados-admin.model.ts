/** HU-035/HU-036 — Gestión administrativa de certificados. */

export type EstadoCertificadoGestion = 'SIN_CERTIFICADO' | 'VIGENTE' | 'ANULADO';

export interface CertificadoGestion {
  matriculaId: number;
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
