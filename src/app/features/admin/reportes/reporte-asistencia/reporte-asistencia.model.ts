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
  modulo: string;
  fechaSesion: string;
  alumno: string;
  correo: string;
  asistencia: EstadoAsistenciaReporte;
  origen: OrigenAsistenciaReporte | null;
  motivoCorreccion: string | null;
  porcentajeAcumulado: number | null;
  cumplimiento: CumplimientoAsistencia | null;
}

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
