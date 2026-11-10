export type SituacionAcademica = 'EN_PROGRESO' | 'EN_REVISION' | 'FINALIZADO' | 'CANCELADA';
export type CumplimientoAcademico = 'CUMPLE' | 'NO_CUMPLE';
export type EstadoCertificadoReporte = 'SIN_EMITIR' | 'EMITIDO' | 'ANULADO';

export interface CondicionReporte {
  codigo: 'PROGRESO' | 'EXAMENES' | 'NOTA' | 'ASISTENCIA';
  titulo: string;
  valorActual: string;
  meta: string;
  cumplida: boolean;
}

export interface ReporteAcademico {
  matriculaId: number;
  cursoId: number;
  curso: string;
  modalidad: 'VIRTUAL' | 'EN_VIVO' | 'HIBRIDO';
  alumno: string;
  correo: string;
  fechaMatricula: string;
  estadoMatricula: string;
  progreso: number;
  exigeExamenes: boolean;
  examenesRequeridos: number;
  examenesAprobados: number;
  notaFinal: number | null;
  asistencia: number | null;
  asistenciaExigida: boolean;
  respuestasPendientes: number;
  fechaLimiteRevision: string | null;
  condiciones: CondicionReporte[];
  condicionesPendientes: string[];
  situacion: SituacionAcademica;
  cumplimiento: CumplimientoAcademico;
  fechaFinalizacion: string | null;
  certificado: EstadoCertificadoReporte;
  codigoCertificado: string | null;
}

export interface OpcionCursoReporte {
  id: number;
  etiqueta: string;
  detalle: string;
  fecha: string | null;
}

export interface FiltrosReporteAcademico {
  texto: string;
  cursoId: number | null;
  modalidad: string;
  fechaDesde: string;
  fechaHasta: string;
  situacion: string;
  cumplimiento: string;
  certificado: string;
}
