import { ExamenAulaRespuesta, LeccionAulaRespuesta, ModuloAulaRespuesta } from './aula.model';

export type EstadoModulo = 'COMPLETADO' | 'EN_CURSO' | 'BLOQUEADO';

export type PasoModulo =
  | { tipo: 'leccion'; leccion: LeccionAulaRespuesta }
  | { tipo: 'examen'; examen: ExamenAulaRespuesta };

export interface SiguientePaso {
  paso: PasoModulo | null;
  bloqueo: string | null;
}

export function examenAgotado(examen: ExamenAulaRespuesta): boolean {
  return !examen.aprobado && examen.intentosMaximos !== null && examen.intentosUsados >= examen.intentosMaximos;
}

export function leccionesCompletadas(modulo: ModuloAulaRespuesta): number {
  return modulo.lecciones.filter((leccion) => leccion.estado === 'COMPLETADA').length;
}

export function estadoModulo(modulo: ModuloAulaRespuesta): EstadoModulo {
  const total = modulo.lecciones.length;
  const hechas = leccionesCompletadas(modulo);
  const examenesPendientes = modulo.examenes.some((examen) => examen.tipo === 'CALIFICADO' && !examen.aprobado);

  if ((total > 0 || modulo.examenes.length > 0) && hechas === total && !examenesPendientes) {
    return 'COMPLETADO';
  }
  const primera = modulo.lecciones[0];
  if (hechas === 0 && primera?.estado === 'BLOQUEADA') {
    return 'BLOQUEADO';
  }
  if (total === 0) {
    const examen = modulo.examenes[0];
    if (examen && !examen.habilitado && !examen.aprobado) {
      return 'BLOQUEADO';
    }
  }
  return 'EN_CURSO';
}

export function siguientePaso(modulo: ModuloAulaRespuesta): SiguientePaso {
  for (const leccion of modulo.lecciones) {
    if (leccion.estado === 'COMPLETADA') {
      continue;
    }
    if (leccion.estado === 'BLOQUEADA') {
      return { paso: null, bloqueo: leccion.motivoBloqueo ?? 'Esta lección todavía no está disponible.' };
    }
    return { paso: { tipo: 'leccion', leccion }, bloqueo: null };
  }
  for (const examen of modulo.examenes) {
    if (examen.tipo !== 'CALIFICADO' || examen.aprobado) {
      continue;
    }
    if (!examen.habilitado) {
      return { paso: null, bloqueo: examen.motivoNoHabilitado ?? 'El examen todavía no está habilitado.' };
    }
    if (examen.estado === 'EN_REVISION') {
      return { paso: null, bloqueo: 'Tu examen está en revisión. Verás tu nota cuando lo califiquen.' };
    }
    if (examenAgotado(examen)) {
      return { paso: null, bloqueo: 'Ya usaste todos los intentos de este examen. Escríbenos si necesitas un intento adicional.' };
    }
    return { paso: { tipo: 'examen', examen }, bloqueo: null };
  }
  return { paso: null, bloqueo: null };
}

export function textoExamen(examen: ExamenAulaRespuesta): string {
  const nota = examen.mejorNota !== null ? ` · nota ${examen.mejorNota}` : '';
  switch (examen.estado) {
    case 'APROBADO':
      return `Aprobado${nota}`;
    case 'EN_CURSO':
      return 'Intento en curso · continúalo';
    case 'EN_REVISION':
      return 'En revisión · esperando calificación';
    case 'NO_APROBADO': {
      const sinIntentos =
        examen.intentosMaximos !== null && examen.intentosUsados >= examen.intentosMaximos ? ' · sin intentos' : '';
      return `No aprobado${nota}${sinIntentos}`;
    }
    default:
      if (!examen.habilitado) return examen.motivoNoHabilitado ?? 'Aún no habilitado';
      if (examen.tipo === 'PRACTICA') return 'Práctica · no bloquea el avance';
      return examen.bloqueaSiguienteModulo ? 'Pendiente · libera el siguiente módulo' : 'Examen pendiente';
  }
}

export function accionExamen(examen: ExamenAulaRespuesta): string {
  if (examen.estado === 'EN_CURSO') return 'Continuar examen';
  if (examen.aprobado || examenAgotado(examen)) return 'Ver resultado';
  if (examen.estado === 'EN_REVISION') return 'Ver estado';
  return examen.intentosUsados > 0 ? 'Intentar de nuevo' : 'Rendir examen';
}
