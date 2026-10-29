/** HU-043 — Reporte de seguimiento académico (administrador). Espejo de los DTO del backend. */
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
  /** Se muestra siempre, aunque el curso no lo exija. */
  progreso: number;
  exigeExamenes: boolean;
  examenesRequeridos: number;
  examenesAprobados: number;
  /** `null` si el curso no exige exámenes o aún no hay notas. */
  notaFinal: number | null;
  /** `null` cuando la asistencia no aplica (curso virtual, no exigida o sin sesiones elegibles). */
  asistencia: number | null;
  asistenciaExigida: boolean;
  respuestasPendientes: number;
  fechaLimiteRevision: string | null;
  /** Solo las condiciones activas del curso, con valor real y meta. */
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
