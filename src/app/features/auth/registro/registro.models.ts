export interface RegistroFormularioPeticion {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  correo: string;
  telefono: string | null;
  documentoIdentidad: string | null;
  contrasena: string;
  confirmarContrasena: string;
  aceptaTerminos: boolean;

  evidenciaAntiRobot: string;
}

export interface RegistroFormularioRespuesta {
  usuarioId: number;
  correo: string;
  envioAceptado: boolean;
  referenciaVerificacion: string;
}

export interface ContextoRegistroGoogle {
  correo: string;
  nombres?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  apellidos?: string | null;
  fotoUrl?: string | null;
  venceEn?: string;
}

export interface RegistroGooglePeticion {
  referencia: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  telefono: string | null;
  documentoIdentidad: string | null;
  aceptaTerminos: boolean;
}

export interface GoogleRegistroSesion {
  nombre: string;
  email: string;
  rol: 'alumno' | 'administrador';
}

export interface ErrorCampoApi {
  field: string;
  message: string;
}

export interface ApiErrorRespuesta {
  timestamp: string;
  status: number;
  code: string;
  message: string;
  path: string;
  fieldErrors: ErrorCampoApi[];
}
