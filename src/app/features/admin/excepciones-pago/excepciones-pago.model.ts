/** HU-037 — Excepciones de matrículas y pagos (administrador). Espejo de los DTO del backend. */
export type TipoExcepcion = 'PAGO_TARDIO' | 'CURSO_CANCELADO' | 'MATRICULA_CANCELADA' | 'SOBRECUPO';
export type EstadoExcepcion = 'PENDIENTE' | 'ATENDIDO';

export interface PagoExcepcion {
  id: number;
  numeroPedido: string;
  estado: string;
  importe: number;
  medio: string | null;
  referencia: string | null;
  resultadoEn: string | null;
  constancia: string | null;
}

export interface MatriculaExcepcion {
  estado: string;
  formaIngreso: string;
  fechaMatricula: string;
  acceso: 'CONCEDIDO' | 'SIN_ACCESO';
}

export interface CursoExcepcion {
  estado: string | null;
  cupoMaximo: number | null;
  matriculasActivas: number;
  fechaCierreMatricula: string | null;
  sobrecupo: boolean;
}

export interface PagoRelacionado {
  pagoId: number;
  numeroPedido: string;
  alumno: string;
  importe: number;
  estado: string;
}

export interface Excepcion {
  id: number;
  tipo: TipoExcepcion;
  estado: EstadoExcepcion;
  descripcion: string;
  resultado: string | null;
  creadoEn: string;
  atendidoEn: string | null;
  atendidoPor: string | null;
  matriculaId: number;
  alumno: string;
  correo: string;
  cursoId: number;
  curso: string;
  pago: PagoExcepcion | null;
  /** Solo en el detalle. */
  matricula: MatriculaExcepcion | null;
  cursoDetalle: CursoExcepcion | null;
  relacionados: PagoRelacionado[];
}
