// HU-008 — Gestionar usuarios administrativamente.
//
// Esta historia se reasignó como ejercicio técnico del equipo: la mayoría de los tipos de este
// archivo se retiraron a propósito (ver
// docs/epica-4/HU-008-MAPA-TECNICO-GESTIONAR-USUARIOS.md, que trae el código íntegro para
// reconstruirlos).
//
// NO borrar `RolUsuarioAdmin`, `CondicionCuentaAdmin`, `UsuarioAdminRespuesta` ni `PageResponse`:
// HU-019 (matriculas-listado.ts, al matricular administrativamente) sigue usando
// `AdminUsuariosApiService.listar(...)` para poblar el combo de alumnos. Revisa ese consumidor
// antes de volver a tocar este archivo.

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
