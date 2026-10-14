export interface VerificarCorreoPeticion {
  correo: string;
  codigo: string;
}

export interface VerificarCorreoRespuesta {
  requiereCambioContrasena: boolean;
}

export interface ReenviarCodigoPeticion {
  correo: string;
}

export interface ReenvioCorreoRespuesta {
  enviado: boolean;
}

export interface ContextoVerificacionRespuesta {
  correo: string;
}
