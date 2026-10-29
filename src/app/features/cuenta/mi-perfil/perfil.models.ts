export interface PerfilRespuesta {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  correo: string;
  telefono: string | null;
  documentoIdentidad: string | null;
  fotoUrl: string | null;
  accesoGoogle: boolean;
  puedeCrearContrasena: boolean;
}

export interface ActualizarPerfilPeticion {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  telefono: string | null;
  documentoIdentidad: string | null;
}

export interface NuevaContrasenaPeticion {
  contrasena: string;
  confirmacion: string;
}

export interface CambiarContrasenaPeticion {
  contrasenaActual: string;
  contrasenaNueva: string;
  confirmacion: string;
}
