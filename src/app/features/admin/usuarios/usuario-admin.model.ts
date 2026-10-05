export type RolUsuarioAdmin = 'ALUMNO' | 'ADMINISTRADOR';

/** CAMBIO_PENDIENTE: falta reemplazar la contraseña temporal. PENDIENTE_VERIFICACION: falta
 * verificar el correo. AMBAS_PENDIENTES: recién creada, faltan las dos. NINGUNA: cuenta operativa. */
export type CondicionCuentaAdmin =
  | 'NINGUNA'
  | 'PENDIENTE_VERIFICACION'
  | 'CAMBIO_PENDIENTE'
  | 'AMBAS_PENDIENTES';

export interface UsuarioAdminRespuesta {
  usuarioId: number;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  nombreCompleto: string;
  correo: string;
  telefono: string | null;
  documentoIdentidad: string | null;
  origenRegistro: string;
  activo: boolean;
  condicion: CondicionCuentaAdmin;
  rolPrincipal: RolUsuarioAdmin | null;
  roles: RolUsuarioAdmin[];
  creadoEn: string;
  /** Nombre de quién concedió el rol ADMINISTRADOR; null si no tiene ese rol o se desconoce. */
  concedidoPorNombre: string | null;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface CrearUsuarioAdminPeticion {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  correo: string;
  telefono: string | null;
  documentoIdentidad: string | null;
  rol: RolUsuarioAdmin;
}

export interface CrearUsuarioAdminRespuesta {
  usuario: UsuarioAdminRespuesta;
  /** true si el correo ya existía: se conservó la cuenta y no se generó contraseña temporal. */
  reutilizada: boolean;
  contrasenaTemporal: string | null;
}

export interface ConcederRolPeticion {
  rol: RolUsuarioAdmin;
}

export interface CambiarActivoPeticion {
  activo: boolean;
  motivo: string | null;
}

export interface ActualizarDatosPersonalesPeticion {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  telefono: string | null;
  documentoIdentidad: string | null;
}
