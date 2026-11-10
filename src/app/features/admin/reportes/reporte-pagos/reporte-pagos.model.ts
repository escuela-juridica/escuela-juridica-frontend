export type EstadoPago = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'ERROR' | 'EXPIRADO' | 'REGISTRADO_MANUAL' | 'EXONERADO';
export type OrigenPago = 'EN_LINEA' | 'MANUAL' | 'EXONERADO';

export interface ReportePago {
  pagoId: number;
  fecha: string;
  alumno: string;
  correo: string;
  cursoId: number;
  curso: string;
  monto: number;
  medio: string | null;
  estado: EstadoPago;
  numeroPedido: string;
  referencia: string | null;
  origen: OrigenPago;
  motivo: string | null;
  suma: boolean;
}

export interface TotalPagos {
  totalConfirmado: number;
  cantidadConfirmados: number;
  moneda: string;
}

export interface FiltrosReportePagos {
  texto: string;
  cursoId: number | null;
  estado: string;
  medio: string;
  origen: string;
  fechaDesde: string;
  fechaHasta: string;
}
