export type TipoLeccion = 'GRABADA' | 'EN_VIVO';
export type OrigenRecurso = 'SUBIDO' | 'YOUTUBE' | 'EXTERNO';

export interface RecursoRespuesta {
  id: number;
  tipo: string;
  origen: string;
  referencia: string;
  nombreArchivo: string | null;
  tipoMime: string | null;
  tamanoBytes: number | null;
  duracionSegundos: number | null;
  duracionDetectada: boolean;
  youtubeNoListadoConfirmado: boolean | null;
  tipoMaterialCodigo: string;
  tipoMaterialNombre: string;
}

export interface MaterialRespuesta {
  id: number;
  titulo: string;
  orden: number;
  permiteDescarga: boolean;
  activo: boolean;
  recurso: RecursoRespuesta;
}

export interface LeccionRespuesta {
  id: number;
  titulo: string;
  descripcion: string | null;
  orden: number;
  tipo: TipoLeccion;
  esObligatoria: boolean;
  esVistaPrevia: boolean;
  fechaHoraInicio: string | null;
  fechaHoraFin: string | null;
  activo: boolean;
  leccionOrigenId: number | null;
  materiales: MaterialRespuesta[];
}

export interface ModuloRespuesta {
  id: number;
  titulo: string;
  descripcion: string | null;
  orden: number;
  activo: boolean;
  moduloOrigenId: number | null;
  lecciones: LeccionRespuesta[];
}

export interface ModuloDisponibleRespuesta {
  id: number;
  titulo: string;
  cursoId: number;
  cursoTitulo: string;
  cantidadLecciones: number;
}

export interface CrearModuloPeticion {
  titulo: string;
  descripcion: string | null;
}

export interface CrearLeccionPeticion {
  titulo: string;
  descripcion: string | null;
  tipo: TipoLeccion;
  esObligatoria: boolean;
  esVistaPrevia: boolean;
  fechaHoraInicio: string | null;
  fechaHoraFin: string | null;
}

export interface CrearMaterialEnlacePeticion {
  titulo: string;
  tipoMaterialId: number;
  origen: 'YOUTUBE' | 'EXTERNO';
  referencia: string;
  youtubeNoListadoConfirmado: boolean | null;
  permiteDescarga: boolean;
  duracionSegundos: number | null;
}

export interface ActualizarMaterialPeticion {
  titulo: string;
  permiteDescarga: boolean;
  referencia: string | null;
  youtubeNoListadoConfirmado: boolean | null;
}

export interface OrdenPeticion {
  ids: number[];
}
