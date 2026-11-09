export type TipoRecursoMaterial = 'VIDEO' | 'ARCHIVO';
export type OrigenMaterial = 'SUBIDO' | 'YOUTUBE' | 'EXTERNO';

export interface MaterialAlumnoRespuesta {
  id: number;
  titulo: string;
  orden: number;
  tipoRecurso: TipoRecursoMaterial;
  origen: OrigenMaterial;
  permiteDescarga: boolean;
  verUrl: string;
  descargarUrl: string | null;
  nombreArchivo: string | null;
  tipoMime: string | null;
  tamanoBytes: number | null;
  duracionSegundos: number | null;
  posicionSegundos: number | null;
  porcentajeVisto: number | null;
}

export interface ProgresoVideoPeticion {
  segundosReproducidos: number;
  ultimaPosicionSegundos: number;
  duracionSegundosTotal?: number | null;
}
