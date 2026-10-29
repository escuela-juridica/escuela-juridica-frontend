/** HU-039 — Libro de Reclamaciones. */

export type TipoReclamacion = 'QUEJA' | 'RECLAMO';
export type TipoDocumento = 'DNI' | 'CE' | 'PASAPORTE' | 'RUC';

export interface PresentarReclamacion {
  tipo: TipoReclamacion;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  correo: string;
  celular: string;
  direccion: string;
  montoReclamado: number;
  descripcionBien: string;
  detalle: string;
  pedido: string;
  declaracionJurada: boolean;
  autorizaRespuestaCorreo: boolean;
}

export interface ReclamacionPrecarga {
  nombres: string;
  apellidos: string;
  correo: string;
  celular: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
}

export interface ReclamacionConstancia {
  codigo: string;
  tipo: TipoReclamacion;
  estado: string;
  registradoEn: string;
  fechaLimiteRespuesta: string;
  nombres: string;
  apellidos: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  correo: string;
  celular: string;
  direccion: string;
  montoReclamado: number;
  descripcionBien: string;
  detalle: string;
  pedido: string;
  adjuntos: string[];
  constanciaEnviada: boolean;
}
