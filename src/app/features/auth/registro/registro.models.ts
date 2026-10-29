/** Datos que el formulario tradicional envía al backend. */
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

  /** Evidencia del proveedor que acuerde el equipo; debe validarse en el servidor. */
  evidenciaAntiRobot: string;
}

/** Respuesta esperada después de crear una cuenta con correo pendiente. */
export interface RegistroFormularioRespuesta {
  usuarioId: number;
  correo: string;
  envioAceptado: boolean;
  referenciaVerificacion: string;
}

/** Datos autorizados que el backend recupera desde una referencia Google. */
export interface ContextoRegistroGoogle {
  correo: string;
  nombres?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  apellidos?: string | null;
  fotoUrl?: string | null;
  venceEn?: string;
}

/**
 * El correo no se envía al completar Google: el backend debe recuperarlo desde
 * la referencia temporal que representa la identidad previamente verificada.
 */
export interface RegistroGooglePeticion {
  referencia: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  telefono: string | null;
  documentoIdentidad: string | null;
  aceptaTerminos: boolean;
}

/** Forma actual de HU-002 al completar Google; no coincide con el perfil de sesión de HU-001. */
export interface GoogleRegistroSesion {
  nombre: string;
  email: string;
  rol: 'alumno' | 'administrador';
}

export interface ErrorCampoApi {
  field: string;
  message: string;
}

/** Forma de error que ya utiliza GlobalExceptionHandler en el backend. */
export interface ApiErrorRespuesta {
  timestamp: string;
  status: number;
  code: string;
  message: string;
  path: string;
  fieldErrors: ErrorCampoApi[];
}
