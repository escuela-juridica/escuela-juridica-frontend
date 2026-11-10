export type RolUsuarioAdmin = 'ALUMNO' | 'ADMINISTRADOR';

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
  roles: RolUsuarioAdmin[];
}

export interface CrearUsuarioAdminRespuesta {
  usuario: UsuarioAdminRespuesta;
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

export interface ResetearContrasenaRespuesta {
  usuario: UsuarioAdminRespuesta;
  contrasenaTemporal: string;
}

export interface ActualizarDatosPersonalesPeticion {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  telefono: string | null;
  documentoIdentidad: string | null;
}
