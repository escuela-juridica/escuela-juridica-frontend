/** HU-047 — Matrícula pagada con Culqi. */

export type EstadoPago = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'ERROR' | 'EXPIRADO';

export interface PagoCheckout {
  numeroPedido: string;
  importe: number;
  moneda: string;
  reanudado: boolean;
  llavePublica: string;
  ordenId: string;
  montoCentimos: number;
  titulo: string;
  correo: string;
  nombres: string;
  apellidos: string;
}

/** QR y código de una orden de billetera aún pendiente (Culqi/PagoEfectivo). */
export interface InstruccionesPago {
  qrUrl: string | null;
  enlace: string | null;
  codigo: string | null;
  venceEn: string | null;
}

export interface PagoDetalle {
  numeroPedido: string;
  cursoId: number;
  cursoTitulo: string;
  cursoUrlAmigable: string;
  estado: EstadoPago;
  medio: string | null;
  ultimosDigitos: string | null;
  numeroCuotas: number | null;
  importe: number;
  moneda: string;
  precioRegular: number;
  precioPromocional: number | null;
  mensaje: string;
  iniciadoEn: string;
  resultadoEn: string | null;
  constanciaNumero: string | null;
  estadoMatricula: string;
  accesoConcedido: boolean;
  puedeReintentar: boolean;
  instrucciones: InstruccionesPago | null;
  estadoCorreo: string | null;
}

export interface ConstanciaPago {
  constanciaNumero: string;
  numeroPedido: string;
  importe: number;
  moneda: string;
  medio: string;
  ultimosDigitos: string | null;
  fecha: string;
  alumno: string;
  correo: string;
  curso: string;
  cursoId: number;
}

export interface PagosCurso {
  estadoMatricula: string | null;
  pendiente: string | null;
  intentos: PagoDetalle[];
}
