export interface Matricula {
  id: number;
  cursoId: number;
  cursoTitulo: string;
  cursoUrlAmigable: string;
  imagenPortadaUrl: string | null;
  modalidad: 'VIRTUAL' | 'EN_VIVO' | 'HIBRIDO';
  estado: 'ACTIVA' | 'CANCELADA' | 'FINALIZADA' | 'VENCIDA';
  formaIngreso: string;
  fechaMatricula: string;
  fechaActivacion: string | null;
  fechaVencimiento: string | null;
  fechaFinalizacion: string | null;
  fechaInicio: string | null;
  accesoEfectivo: boolean;
  mensajeAcceso: string;
  porcentajeProgreso: number;
  leccionesCompletadas: number;
  totalLecciones: number;
  siguienteLeccion: string;
  estadoNotificacion: string | null;
}

export interface MatriculaAdministrativa {
  id: number;
  usuarioId: number;
  alumno: string;
  correo: string;
  cursoId: number;
  cursoTitulo: string;
  estado: string;
  formaIngreso: string;
  fechaMatricula: string;
  fechaVencimiento: string | null;
}

export interface AdvertenciaMatricula {
  requiereConfirmacion: boolean;
  mensaje: string;
}

export interface MatriculaDetalleAdministrativa {
  id: number;
  usuarioId: number;
  alumno: string;
  correo: string;
  cursoId: number;
  cursoTitulo: string;
  modalidad: string;
  estado: string;
  formaIngreso: string;
  fechaMatricula: string;
  fechaActivacion: string | null;
  fechaVencimiento: string | null;
  fechaFinalizacion: string | null;
  motivoCancelacion: string | null;
  creadoPorUsuarioId: number | null;
  responsable: string;
  pagos: PagoMatriculaDetalle[];
  historialEstados: HistorialEstadoMatricula[];
}

export interface PagoMatriculaDetalle {
  pagoId: number;
  origen: string;
  estado: string;
  importe: number;
  moneda: string;
  medio: string | null;
  referencia: string | null;
  motivo: string | null;
  registradoPorUsuarioId: number | null;
  registradoPor: string;
  resultadoEn: string | null;
}

export interface HistorialEstadoMatricula {
  estadoAnterior: string | null;
  estadoNuevo: string;
  motivo: string | null;
  realizadoPorUsuarioId: number | null;
  realizadoPor: string;
  realizadoEn: string;
}
