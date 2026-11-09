import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { formatearDuracion, formatearFechaHora } from '../../cursos/curso-formato.util';
import { AulaSesionService } from '../aula-sesion.service';
import { ExamenAulaRespuesta, LeccionAulaRespuesta } from '../aula.model';
import {
  accionExamen,
  estadoModulo,
  examenAgotado,
  leccionesCompletadas,
  siguientePaso,
  textoExamen,
} from '../aula-ruta.util';

@Component({
  selector: 'app-aula-modulo',
  imports: [RouterLink],
  templateUrl: './aula-modulo.html',
  styleUrl: './aula-modulo.scss',
})
export class AulaModulo {
  protected readonly estado = inject(AulaSesionService);
  private readonly ruta = inject(ActivatedRoute);

  private readonly moduloId = toSignal(
    this.ruta.paramMap.pipe(map((parametros) => Number(parametros.get('moduloId')))),
    { initialValue: Number.NaN },
  );

  protected readonly textoExamen = textoExamen;
  protected readonly accionExamen = accionExamen;

  protected readonly vista = computed(() => {
    const aula = this.estado.aula();
    const id = this.moduloId();
    if (!aula) return null;
    const indice = aula.modulos.findIndex((modulo) => modulo.id === id);
    if (indice < 0) return null;

    const modulo = aula.modulos[indice];
    const hechas = leccionesCompletadas(modulo);
    const total = modulo.lecciones.length;
    const siguiente = aula.modulos[indice + 1] ?? null;
    const examenFinal = indice === aula.modulos.length - 1 ? (aula.examenesFinales[0] ?? null) : null;
    const { paso, bloqueo } = siguientePaso(modulo);

    return {
      aula,
      modulo,
      numero: indice + 1,
      totalModulos: aula.modulos.length,
      hechas,
      total,
      porcentaje: total === 0 ? 0 : Math.round((hechas / total) * 100),
      completado: estadoModulo(modulo) === 'COMPLETADO',
      paso,
      bloqueo,
      anterior: aula.modulos[indice - 1] ?? null,
      siguiente,
      siguienteBloqueado: siguiente ? estadoModulo(siguiente) === 'BLOQUEADO' : false,
      examenFinal,
      destino:
        aula.modulos
          .slice(0, indice)
          .map((previo) => siguientePaso(previo).paso)
          .find((candidato) => candidato !== null) ?? null,
      examenPendiente:
        aula.modulos
          .slice(0, indice)
          .flatMap((previo) => previo.examenes)
          .find((examen) => examen.tipo === 'CALIFICADO' && !examen.aprobado) ?? null,
    };
  });

  protected esSiguiente(leccion: LeccionAulaRespuesta): boolean {
    const paso = this.vista()?.paso;
    return paso?.tipo === 'leccion' && paso.leccion.id === leccion.id;
  }

  protected accionLeccion(leccion: LeccionAulaRespuesta): string {
    if (leccion.estado === 'COMPLETADA') return 'Repasar';
    if (this.esSiguiente(leccion)) return this.estado.totalCompletadas() > 0 ? 'Continuar' : 'Empezar';
    return 'Abrir';
  }

  protected detalleLeccion(leccion: LeccionAulaRespuesta): string {
    if (leccion.tipo === 'EN_VIVO') {
      return leccion.fechaHoraInicio ? `Sesión en vivo · ${formatearFechaHora(leccion.fechaHoraInicio)}` : 'Sesión en vivo';
    }
    return leccion.duracionSegundos ? `Video · ${formatearDuracion(leccion.duracionSegundos)}` : 'Lección';
  }

  protected examenSePuedeAbrir(examen: ExamenAulaRespuesta): boolean {
    return examen.habilitado || examen.aprobado;
  }

  protected examenEsPrincipal(examen: ExamenAulaRespuesta): boolean {
    return !examen.aprobado && !examenAgotado(examen) && examen.estado !== 'EN_REVISION';
  }
}
