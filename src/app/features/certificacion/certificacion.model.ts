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

export interface MiCertificado {
  codigo: string;
  titular: string;
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
