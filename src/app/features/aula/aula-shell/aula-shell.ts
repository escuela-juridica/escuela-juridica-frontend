import { Component, HostListener, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink, RouterOutlet } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';

import { formatearDuracion } from '../../cursos/curso-formato.util';
import { AulaSesionService } from '../aula-sesion.service';
import { LeccionAulaRespuesta, ModuloAulaRespuesta } from '../aula.model';

/**
 * Layout del aula (HU-022, guía §25): barra del curso con el avance, el contenido de la lección a la
 * izquierda y, a la derecha, el panel "Contenido del curso" con los módulos en acordeón. En móvil
 * ese panel se abre a pantalla completa. Dentro del layout del alumno, así conserva la navegación
 * principal. Provee el estado compartido del curso a sus pantallas hijas.
 */
@Component({
  selector: 'app-aula-shell',
  imports: [RouterOutlet, RouterLink],
  providers: [AulaSesionService],
  templateUrl: './aula-shell.html',
  styleUrl: './aula-shell.scss',
})
export class AulaShell {
  protected readonly estado = inject(AulaSesionService);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly panelAbierto = signal(false);
  protected readonly modulosAbiertos = signal<ReadonlySet<number>>(new Set());

  constructor() {
    this.ruta.paramMap
      .pipe(
        map((parametros) => Number(parametros.get('cursoId'))),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((cursoId) => this.estado.cargar(cursoId));

    // El módulo de la lección que se está viendo (o donde se continúa) queda desplegado.
    effect(() => {
      const aula = this.estado.aula();
      if (!aula) return;
      const referencia = this.estado.leccionActual() ?? this.estado.leccionParaContinuar();
      const idModulo = referencia?.modulo.id ?? aula.modulos[0]?.id;
      if (idModulo == null) return;
      untracked(() => this.modulosAbiertos.update((abiertos) => new Set(abiertos).add(idModulo)));
    });
  }

  @HostListener('document:keydown.escape')
  protected cerrarConEscape(): void {
    this.panelAbierto.set(false);
  }

  protected alternarModulo(id: number): void {
    this.modulosAbiertos.update((abiertos) => {
      const copia = new Set(abiertos);
      if (!copia.delete(id)) copia.add(id);
      return copia;
    });
  }

  protected completadasDelModulo(modulo: ModuloAulaRespuesta): number {
    return modulo.lecciones.filter((leccion) => leccion.estado === 'COMPLETADA').length;
  }

  protected detalle(leccion: LeccionAulaRespuesta): string {
    const tipo = leccion.tipo === 'EN_VIVO' ? 'En vivo' : 'Lección';
    return leccion.duracionSegundos ? `${tipo} · ${formatearDuracion(leccion.duracionSegundos)}` : tipo;
  }

  protected etiquetaModalidad(modalidad: string): string {
    return modalidad === 'EN_VIVO' ? 'En vivo' : modalidad === 'HIBRIDO' ? 'Híbrido' : 'Virtual';
  }
}
