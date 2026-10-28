/** HU-032 — Obtener mi certificado. Espejo de los DTO del backend. */
import { CondicionAvance } from '../aula/aula.model';

export type EstadoCertificacion =
  | 'PENDIENTE_REQUISITOS'
  | 'PROGRAMADO'
  | 'PENDIENTE_DATOS'
  | 'LISTO_PARA_EMITIR'
  | 'VIGENTE'
  | 'ANULADO';

export interface DatosCertificado {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  confirmados: boolean;
  confirmadosEn: string | null;
}

export interface CertificadoEmitido {
  codigo: string;
  estado: string;
  nivel: 'NORMAL' | 'REFRENDADO';
  nota: number | null;
  emitidoEn: string;
  nombresImpresos: string;
  entidad: string | null;
  /** Ruta relativa al API; se resuelve con `resolverUrlApi`. */
  descargaUrl: string;
}

export interface Certificacion {
  cursoId: number;
  curso: string;
  estado: EstadoCertificacion;
  mensaje: string;
  condiciones: CondicionAvance[];
  fraseAccionable: string;
  exigeExamenes: boolean;
  /** Proyección con lo que lleva hasta hoy; el nivel final se congela al emitir. */
  notaFinal: number | null;
  nivelProyectado: 'NORMAL' | 'REFRENDADO';
  entidadProyectada: string | null;
  fechaFinalizacion: string | null;
  fechaBaseEmision: string | null;
  fechaEmisionProgramada: string | null;
  diasEspera: number;
  emisionAutomatica: boolean;
  datos: DatosCertificado;
  puedeConfirmarDatos: boolean;
  puedeGenerarAhora: boolean;
  certificado: CertificadoEmitido | null;
}

export interface ConfirmarDatos {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
}

/** HU-033 — Un certificado del alumno. Solo uno VIGENTE trae `descargaUrl`. */
export interface MiCertificado {
  codigo: string;
  cursoId: number;
  curso: string;
  nivel: 'NORMAL' | 'REFRENDADO';
  entidad: string | null;
  horas: number;
  emitidoEn: string;
  estado: 'VIGENTE' | 'ANULADO';
  anuladoEn: string | null;
  descargaUrl: string | null;
}

/** HU-034 — Lo único que se muestra públicamente de un certificado. */
export interface VerificacionCertificado {
  estado: 'VIGENTE' | 'ANULADO';
  codigo: string;
  titular: string;
  curso: string;
  horas: number;
  nivel: 'NORMAL' | 'REFRENDADO';
  entidad: string | null;
  emitidoEn: string;
  anuladoEn: string | null;
}
