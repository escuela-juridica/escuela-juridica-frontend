/** HU-023 — Consultar materiales protegidos. Espejo de `MaterialAlumnoRespuesta` (backend). */
export type TipoRecursoMaterial = 'VIDEO' | 'ARCHIVO';
export type OrigenMaterial = 'SUBIDO' | 'YOUTUBE' | 'EXTERNO';

export interface MaterialAlumnoRespuesta {
  id: number;
  titulo: string;
  orden: number;
  tipoRecurso: TipoRecursoMaterial;
  origen: OrigenMaterial;
  permiteDescarga: boolean;
  /** Para origen SUBIDO: ruta relativa al backend ("/api/app/materiales/{id}/contenido").
   * Para YOUTUBE/EXTERNO: la URL externa completa. Resolvé con `resolverUrlApi` antes de usarla. */
  verUrl: string;
  /** Ruta relativa al backend, o null si no se permite descarga / no aplica. */
  descargarUrl: string | null;
  nombreArchivo: string | null;
  tipoMime: string | null;
  tamanoBytes: number | null;
  duracionSegundos: number | null;
  /** Punto donde el alumno dejó el video (para retomarlo), o null si nunca lo abrió. */
  posicionSegundos: number | null;
  /** Porcentaje del video que ya vio (0-100), o null si nunca lo abrió. */
  porcentajeVisto: number | null;
}

/** HU-024 — Completar lecciones y registrar progreso. Body de `POST /materiales/{id}/progreso-video`. */
export interface ProgresoVideoPeticion {
  segundosReproducidos: number;
  ultimaPosicionSegundos: number;
  duracionSegundosTotal?: number | null;
}
