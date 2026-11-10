import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { distinctUntilChanged, filter, map, startWith } from 'rxjs';

import { AulaSesionService } from '../aula-sesion.service';
import { ModuloAulaRespuesta } from '../aula.model';

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
  private readonly router = inject(Router);

  protected readonly examenActualId = signal<number | null>(null);
  private readonly moduloRutaId = signal<number | null>(null);

  protected readonly esInicio = signal(true);

  protected readonly enRutaModulo = computed(() => this.moduloRutaId() !== null);

  protected readonly moduloActual = computed(() => {
    const id = this.moduloActualId();
    return id === null ? null : (this.estado.aula()?.modulos.find((modulo) => modulo.id === id) ?? null);
  });

  protected readonly moduloActualId = computed(() => {
    const deLaRuta = this.moduloRutaId();
    if (deLaRuta !== null) return deLaRuta;
    const deLaLeccion = this.estado.leccionActual()?.modulo.id;
    if (deLaLeccion !== undefined) return deLaLeccion;
    const examenId = this.examenActualId();
    if (examenId === null) return null;
    return this.estado.aula()?.modulos.find((modulo) => modulo.examenes.some((examen) => examen.id === examenId))?.id ?? null;
  });

  constructor() {
    this.ruta.paramMap
      .pipe(
        map((parametros) => Number(parametros.get('cursoId'))),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((cursoId) => this.estado.cargar(cursoId));

    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        startWith(null),
        map(() => this.router.url),
        takeUntilDestroyed(),
      )
      .subscribe((url) => {
        const examen = /\/examenes\/(\d+)/.exec(url);
        const modulo = /\/modulos\/(\d+)/.exec(url);
        this.esInicio.set(/^\/aula\/\d+\/?(?:[?#].*)?$/.test(url));
        this.examenActualId.set(examen ? Number(examen[1]) : null);
        this.moduloRutaId.set(modulo ? Number(modulo[1]) : null);
      });
  }

  protected numeroDe(modulo: ModuloAulaRespuesta): number {
    return (this.estado.aula()?.modulos.findIndex((candidato) => candidato.id === modulo.id) ?? 0) + 1;
  }

  protected etiquetaModalidad(modalidad: string): string {
    return modalidad === 'EN_VIVO' ? 'En vivo' : modalidad === 'HIBRIDO' ? 'Híbrido' : 'Virtual';
  }
}
