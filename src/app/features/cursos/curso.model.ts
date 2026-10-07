export type Modalidad = 'VIRTUAL' | 'EN_VIVO' | 'HIBRIDO';

export type TipoVenta = 'GRATUITO' | 'PAGADO';

export type CodigoEstadoComercial =
  | 'IMMEDIATE_START'
  | 'UPCOMING'
  | 'IN_PROGRESS'
  | 'ENROLLMENT_CLOSED'
  | 'NO_CAPACITY';

export type AccionComercial = 'ACCESS_FREE' | 'PAY_NOW' | 'NONE';

export interface DocenteBreve {
  personaId: number;
  nombreCompleto: string;
  iniciales: string;
  fotoUrl: string | null;
  cargoProfesional: string | null;
}

export interface EstadoComercial {
  codigo: CodigoEstadoComercial;
  etiqueta: string;
  fechaInicio: string | null;
  matriculaPermitida: boolean;
  precioActual: number;
  precioRegular: number;
  promocionActiva: boolean;
  accion: AccionComercial;
}

export interface CursoTarjeta {
  urlAmigable: string;
  titulo: string;
  descripcion: string | null;
  imagenPortadaUrl: string | null;
  modalidad: Modalidad | null;
  tipoVenta: TipoVenta | null;
  tipoCursoCodigo: string | null;
  tipoCursoNombre: string | null;
  categoriaCodigo: string | null;
  categoriaNombre: string | null;
  destacado: boolean;
  horasAcademicas: number | null;
  docentes: DocenteBreve[];
  estadoComercial: EstadoComercial;
}

export interface OpcionFiltro {
  codigo: string;
  nombre: string;
}

export interface FiltrosCurso {
  tipos: OpcionFiltro[];
  categorias: OpcionFiltro[];
}

export interface CriteriosCatalogo {
  texto: string;
  tipo: string;
  categoria: string;
  pagina: number;
  tamano: number;
}

export type TipoLeccion = 'GRABADA' | 'EN_VIVO';

export interface DocenteFicha {
  personaId: number;
  nombreCompleto: string;
  fotoUrl: string | null;
  cargoProfesional: string | null;
  biografiaProfesional: string | null;
}

export interface LeccionFicha {
  leccionId: number;
  titulo: string;
  orden: number;
  tipo: TipoLeccion;
  estado: string;
  esVistaPrevia: boolean;
  fechaHoraInicio: string | null;
  fechaHoraFin: string | null;
  duracionSegundos: number | null;
}

export interface ModuloFicha {
  moduloId: number;
  titulo: string;
  descripcion: string | null;
  orden: number;
  lecciones: LeccionFicha[];
}

export interface FichaCursoDetalle {
  cursoId: number;
  urlAmigable: string;
  titulo: string;
  descripcion: string | null;
  imagenPortadaUrl: string | null;
  modalidad: Modalidad | null;
  tipoVenta: TipoVenta | null;
  tipoCursoCodigo: string | null;
  tipoCursoNombre: string | null;
  categoriaCodigo: string | null;
  categoriaNombre: string | null;
  entidadCertificadoraNombre: string | null;
  entidadCertificadoraLogoUrl: string | null;
  horasAcademicas: number | null;
  beneficios: string[];
  fechaInicio: string | null;
  fechaFin: string | null;
  docentes: DocenteFicha[];
  modulos: ModuloFicha[];
  estadoComercial: EstadoComercial;
}

export interface RecursoVistaPrevia {
  materialLeccionId: number;
  titulo: string;
  orden: number;
  tipoRecurso: string;
  origen: string;
  referencia: string;
  nombreArchivo: string | null;
  tipoMime: string | null;
  duracionSegundos: number | null;
  permiteDescarga: boolean;
}

export interface VistaPrevia {
  leccionId: number;
  materiales: RecursoVistaPrevia[];
}
