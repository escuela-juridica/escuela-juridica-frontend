/** HU-046 — Datos de los cuatro gráficos del dashboard administrativo. Espejo del DTO del backend. */
export interface PuntoDashboard {
  periodo: string;
  etiqueta: string;
  valor: number;
}

export interface BarraDashboard {
  clave: string;
  etiqueta: string;
  valor: number;
}

export interface PuntoMontoDashboard {
  periodo: string;
  etiqueta: string;
  monto: number;
}

export interface Dashboard {
  desde: string;
  hasta: string;
  granularidad: 'DIA' | 'MES';
  matriculasPorPeriodo: PuntoDashboard[];
  matriculasPorCurso: BarraDashboard[];
  formaIngreso: BarraDashboard[];
  pagosPorPeriodo: PuntoMontoDashboard[];
}

export interface FiltrosDashboard {
  desde: string;
  hasta: string;
  cursoId: number | null;
  modalidad: string;
}
