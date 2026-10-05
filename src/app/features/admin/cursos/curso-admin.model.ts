export type ModalidadCurso = 'VIRTUAL' | 'EN_VIVO' | 'HIBRIDO';
export type TipoVentaCurso = 'GRATUITO' | 'PAGADO';

export interface CursoResumenRespuesta {
  id: number;
  urlAmigable: string;
  titulo: string;
  estadoCodigo: string;
  estadoNombre: string;
  modalidad: string | null;
  tipoVenta: string | null;
  tipoCursoNombre: string | null;
  categoriaTematicaNombre: string | null;
  precioRegular: number;
  publicado: boolean;
  creadoEn: string;
}

export interface DocenteCursoRespuesta {
  personaId: number;
  nombreCompleto: string;
  fotoUrl: string | null;
  cargoProfesional: string;
  orden: number;
  activo: boolean;
}

export interface FirmanteCursoRespuesta {
  firmanteId: number;
  nombreCompleto: string;
  cargoFirma: string;
  orden: number;
  activo: boolean;
}

export interface CursoEditorRespuesta {
  id: number;
  urlAmigable: string;
  titulo: string;
  descripcion: string | null;
  imagenPortadaUrl: string | null;
  tipoCursoId: number | null;
  tipoCursoNombre: string | null;
  categoriaTematicaId: number | null;
  categoriaTematicaNombre: string | null;
  entidadCertificadoraId: number | null;
  entidadCertificadoraNombre: string | null;
  modalidad: ModalidadCurso | null;
  tipoVenta: TipoVentaCurso | null;
  destacado: boolean;
  precioRegular: number;
  precioPromocional: number | null;
  promocionInicioEn: string | null;
  promocionFinEn: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  fechaCierreMatricula: string | null;
  cupoMaximo: number | null;
  horasAcademicas: number | null;
  vigenciaAccesoDias: number | null;
  beneficios: string[];
  estadoCodigo: string;
  estadoNombre: string;
  publicado: boolean;
  docentes: DocenteCursoRespuesta[];
  firmantes: FirmanteCursoRespuesta[];
  creadoEn: string;
}

export interface CrearCursoPeticion {
  titulo: string;
}

export interface ActualizarInformacionCursoPeticion {
  titulo: string;
  urlAmigable: string | null;
  descripcion: string | null;
  imagenPortadaUrl: string | null;
  tipoCursoId: number | null;
  categoriaTematicaId: number | null;
  entidadCertificadoraId: number | null;
  modalidad: ModalidadCurso;
  tipoVenta: TipoVentaCurso;
  destacado: boolean;
  precioRegular: number;
  precioPromocional: number | null;
  promocionInicioEn: string | null;
  promocionFinEn: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  fechaCierreMatricula: string | null;
  cupoMaximo: number | null;
  horasAcademicas: number | null;
  vigenciaAccesoDias: number | null;
  beneficios: string[];
}

export interface AsignarDocentesPeticion {
  personaIds: number[];
}

export interface AsignarFirmantesPeticion {
  firmanteIds: number[];
}
