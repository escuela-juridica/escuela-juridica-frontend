/** HU-040 — Atención de quejas y reclamos (administrador). Espejo de los DTO del backend. */
export type EstadoReclamacion = 'PENDIENTE_RESPUESTA' | 'RESPONDIDO';
export type PlazoReclamacion = 'EN_PLAZO' | 'POR_VENCER' | 'VENCIDO';
export type EstadoRespuesta = 'SIN_RESPUESTA' | 'PENDIENTE' | 'ENVIADO' | 'ERROR';

export interface ReclamacionBandeja {
  id: number;
  codigo: string;
  tipo: 'QUEJA' | 'RECLAMO';
  estado: EstadoReclamacion;
  reclamante: string;
  documento: string;
  correo: string;
  registradoEn: string;
  fechaLimite: string;
  /** Solo para los pendientes. */
  plazo: PlazoReclamacion | null;
  diasHabilesRestantes: number;
  imagenes: number;
  estadoRespuesta: EstadoRespuesta;
}

export interface AdjuntoReclamacion {
  id: number;
  nombre: string;
  tipoMime: string;
  tamanoBytes: number;
}

export interface RespuestaReclamacion {
  texto: string;
  respondidoPor: string;
  creadoEn: string;
  enviadoEn: string | null;
  estadoEnvio: 'PENDIENTE' | 'ENVIADO' | 'ERROR';
  correoDestino: string;
}

export interface IntentoEnvio {
  id: number;
  correoDestino: string;
  resultado: 'ENVIADO' | 'ERROR';
  detalleError: string | null;
  realizadoPor: string;
  realizadoEn: string;
}

export interface ReclamacionDetalle {
  id: number;
  codigo: string;
  tipo: 'QUEJA' | 'RECLAMO';
  estado: EstadoReclamacion;
  plazo: PlazoReclamacion | null;
  diasHabilesRestantes: number;
  fechaLimite: string;
  registradoEn: string;
  respondidoEn: string | null;
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  correo: string;
  celular: string;
  direccion: string;
  montoReclamado: number;
  descripcionBien: string;
  detalle: string;
  pedido: string;
  conCuenta: boolean;
  adjuntos: AdjuntoReclamacion[];
  respuesta: RespuestaReclamacion | null;
  intentos: IntentoEnvio[];
}
