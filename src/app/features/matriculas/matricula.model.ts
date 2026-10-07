export interface Matricula {
  id: number;
  cursoId: number;
  cursoTitulo: string;
  cursoUrlAmigable: string;
  modalidad: 'VIRTUAL' | 'EN_VIVO' | 'HIBRIDO';
  estado: 'ACTIVA' | 'CANCELADA' | 'FINALIZADA' | 'VENCIDA';
  formaIngreso: string;
  fechaMatricula: string;
  fechaActivacion: string | null;
  fechaVencimiento: string | null;
  fechaFinalizacion: string | null;
  fechaInicio: string | null;
  accesoEfectivo: boolean;
  mensajeAcceso: string;
}

export interface MatriculaAdministrativa {
  id: number;
  usuarioId: number;
  alumno: string;
  correo: string;
  cursoId: number;
  cursoTitulo: string;
  estado: string;
  formaIngreso: string;
  fechaMatricula: string;
  fechaVencimiento: string | null;
}
