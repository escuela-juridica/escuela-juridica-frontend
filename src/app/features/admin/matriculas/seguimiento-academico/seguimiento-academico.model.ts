/** HU-031 — Seguimiento académico y excepciones (administrador). Espejo de los DTO del backend. */
import { IntentoResumen } from '../../../examen/examen.model';

export interface CondicionSeguimiento {
  codigo: 'PROGRESO' | 'EXAMENES' | 'NOTA' | 'ASISTENCIA';
  titulo: string;
  valorActual: string;
  meta: string;
  cumplida: boolean;
}

export interface LeccionSeguimiento {
  id: number;
  titulo: string;
  tipo: 'VIDEO' | 'LECTURA' | 'EN_VIVO' | string;
  obligatoria: boolean;
  estado: 'COMPLETADA' | 'DISPONIBLE' | 'BLOQUEADA' | 'CANCELADA';
  forma: string | null;
  completadaEn: string | null;
  motivoBloqueo: string | null;
}

export interface ModuloSeguimiento {
  id: number;
  titulo: string;
  lecciones: LeccionSeguimiento[];
}

export interface ExamenSeguimiento {
  id: number;
  titulo: string;
  tipo: 'CALIFICADO' | 'PRACTICA';
  finalidad: 'MODULO' | 'FINAL';
  modulo: string | null;
  estado: 'PENDIENTE' | 'EN_CURSO' | 'EN_REVISION' | 'APROBADO' | 'NO_APROBADO';
  intentosUsados: number;
  /** null = ilimitados. */
  intentosMaximos: number | null;
  mejorNota: number | null;
  aprobado: boolean;
  agotadoSinAprobar: boolean;
  puedeOtorgarIntento: boolean;
  motivoNoPuedeOtorgar: string | null;
  intentos: IntentoResumen[];
}

export interface SesionSeguimiento {
  leccionId: number;
  asistenciaId: number | null;
  titulo: string;
  inicio: string | null;
  estadoSesion: 'PROGRAMADA' | 'REALIZADA' | 'CANCELADA';
  asistencia: 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADA' | 'PENDIENTE' | 'SIN_REGISTRO';
  motivoCorreccion: string | null;
  elegible: boolean;
  puedeCorregir: boolean;
}

export interface CertificadoSeguimiento {
  codigo: string;
  estado: string;
  emitidoEn: string;
}

export interface ExcepcionSeguimiento {
  id: number;
  tipo: 'REABRIR_INTENTO' | 'CORREGIR_ASISTENCIA' | string;
  referencia: string | null;
  valorAnterior: string | null;
  valorNuevo: string | null;
  motivo: string;
  realizadoPor: string;
  realizadoEn: string;
}

export interface SeguimientoAcademicoDetalle {
  matriculaId: number;
  cursoId: number;
  curso: string;
  modalidad: 'VIRTUAL' | 'EN_VIVO' | 'HIBRIDO';
  estadoMatricula: string;
  alumno: string;
  correo: string;
  fechaMatricula: string;
  progreso: number;
  condiciones: CondicionSeguimiento[];
  cumpleRequisitos: boolean;
  situacion: string;
  notaFinal: number | null;
  asistencia: number | null;
  asistenciaExigida: boolean;
  modulos: ModuloSeguimiento[];
  examenes: ExamenSeguimiento[];
  sesiones: SesionSeguimiento[];
  certificado: CertificadoSeguimiento | null;
  excepciones: ExcepcionSeguimiento[];
}
