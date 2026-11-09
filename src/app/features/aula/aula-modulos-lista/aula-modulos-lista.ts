import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AulaRespuesta, ModuloAulaRespuesta } from '../aula.model';
import { EstadoModulo, estadoModulo, leccionesCompletadas, textoExamen } from '../aula-ruta.util';

@Component({
  selector: 'app-aula-modulos-lista',
  imports: [RouterLink],
  templateUrl: './aula-modulos-lista.html',
  styleUrl: './aula-modulos-lista.scss',
})
export class AulaModulosLista {
  readonly aula = input.required<AulaRespuesta>();

  protected readonly textoExamen = textoExamen;

  protected estadoDe(modulo: ModuloAulaRespuesta): EstadoModulo {
    return estadoModulo(modulo);
  }

  protected completadas(modulo: ModuloAulaRespuesta): number {
    return leccionesCompletadas(modulo);
  }

  protected porcentaje(modulo: ModuloAulaRespuesta): number {
    const total = modulo.lecciones.length;
    return total === 0 ? 0 : Math.round((leccionesCompletadas(modulo) / total) * 100);
  }

  protected etiqueta(estado: EstadoModulo): string {
    return estado === 'COMPLETADO' ? 'Completado' : estado === 'BLOQUEADO' ? 'Bloqueado' : 'En curso';
  }
}
