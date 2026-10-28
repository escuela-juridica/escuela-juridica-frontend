/** HU-044 — Reporte de certificados emitidos (administrador). Espejo de los DTO del backend. */
export type FormaEmision = 'AUTOMATICA' | 'SOLICITADA' | 'MANUAL';

export interface ReporteCertificado {
  certificadoId: number;
  codigo: string;
  alumno: string;
  cursoId: number;
  curso: string;
  nivel: 'NORMAL' | 'REFRENDADO';
  /** `null` cuando lo emite la Escuela Jurídica (nivel Normal). */
  entidad: string | null;
  fechaFinalizacion: string | null;
  fechaEmision: string;
  estado: 'VIGENTE' | 'ANULADO';
  forma: FormaEmision;
}

export interface OpcionEntidad {
  id: number;
  etiqueta: string;
}

export interface FiltrosReporteCertificados {
  texto: string;
  cursoId: number | null;
  nivel: string;
  entidad: string;
  estado: string;
  forma: string;
  fechaDesde: string;
  fechaHasta: string;
}
