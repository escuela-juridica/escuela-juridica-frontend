/** HU-045 — Reporte de asistencia (administrador). Espejo de los DTO del backend. */
export type EstadoAsistenciaReporte = 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADA' | 'PENDIENTE';
export type OrigenAsistenciaReporte = 'AUTOMATICA' | 'CORRECCION_ADMINISTRATIVA';
export type CumplimientoAsistencia = 'CUMPLE' | 'NO_CUMPLE';

export interface ReporteAsistencia {
  matriculaId: number;
  cursoId: number;
  curso: string;
  modalidad: 'EN_VIVO' | 'HIBRIDO';
  leccionId: number;
  sesion: string;
  fechaSesion: string;
  alumno: string;
  correo: string;
  asistencia: EstadoAsistenciaReporte;
  /** `null` cuando aún no hay registro de asistencia. */
  origen: OrigenAsistenciaReporte | null;
  motivoCorreccion: string | null;
  /** `null` = "No aplica" (el alumno no tiene sesiones elegibles). */
  porcentajeAcumulado: number | null;
  /** `null` cuando el curso no exige asistencia mínima. */
  cumplimiento: CumplimientoAsistencia | null;
}

/** Opción de un filtro: un curso en vivo/híbrido o una sesión de ese curso. */
export interface OpcionAsistencia {
  id: number;
  etiqueta: string;
  detalle: string;
  fecha: string | null;
}

export interface FiltrosReporteAsistencia {
  texto: string;
  cursoId: number | null;
  sesionId: number | null;
  modalidad: string;
  fechaDesde: string;
  fechaHasta: string;
  asistencia: string;
  origen: string;
  cumplimiento: string;
}
