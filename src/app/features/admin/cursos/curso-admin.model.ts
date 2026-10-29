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
  tieneMatriculas: boolean;
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

export interface ReglasCursoRespuesta {
  requiereExamenes: boolean;
  requiereProgreso: boolean;
  requiereAsistencia: boolean;
  notaMinima: number;
  notaRefrendado: number;
  progresoMinimo: number;
  umbralVideo: number;
  asistenciaMinima: number;
  secuenciaObligatoria: boolean;
  diasEsperaCertificado: number;
  fechaCierreMatricula: string | null;
  bloqueada: boolean;
}

export interface ActualizarReglasCursoPeticion extends Omit<ReglasCursoRespuesta, 'bloqueada'> {}

export interface ErrorValidacionCurso {
  codigo: string;
  seccion: string;
  campo: string;
  severidad: 'ERROR' | 'ADVERTENCIA';
  mensaje: string;
}

export interface ValidacionPublicacionRespuesta {
  puedePublicarse: boolean;
  hallazgos: ErrorValidacionCurso[];
  publicacionRealizada: boolean;
  estadoCodigo: string;
}

export interface RetrasarInicioPeticion {
  nuevaFechaInicio: string;
}

export interface CerrarCursoPeticion {
  motivo: string | null;
}

export interface CambiarDestacadoPeticion {
  destacado: boolean;
}

/** HU-038 — Cancelación completa de un curso. */
export interface CancelacionCurso {
  cursoId: number;
  titulo: string;
  estado: string;
  puedeCancelar: boolean;
  bloqueo: string | null;
  alumnosConAcceso: number;
  alumnosFinalizados: number;
  alumnosSinFinalizar: number;
  matriculasPendientePago: number;
  pagosEnProceso: number;
  sesionesFuturas: number;
  canceladoEn: string | null;
  motivoCancelacion: string | null;
  avisosTotal: number;
  avisosEnviados: number;
  avisosConError: number;
}

export interface CancelacionAfectado {
  usuarioId: number;
  alumno: string;
  correo: string;
  finalizado: boolean;
  estadoAviso: 'PENDIENTE' | 'ENVIADO' | 'ERROR';
  intentos: number;
  ultimoError: string | null;
  enviadoEn: string | null;
}

export interface CancelarCursoPeticion {
  motivo: string;
  confirmo: boolean;
}
