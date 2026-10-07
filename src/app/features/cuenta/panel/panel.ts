import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Session } from '../../../core/session/session';
import { MatriculaApiService } from '../../matriculas/matricula-api.service';

interface CursoActivo {
  id: number;
  imagenUrl: string;
  tipo: string;
  categoria: string;
  nombre: string;
  porcentajeProgreso: number;
  leccionesCompletadas: number;
  totalLecciones: number;
  siguienteLeccionNombre: string;
  fechaFinalizacion: string | null;
  accesoEfectivo: boolean;
}

@Component({
  selector: 'app-panel',
  imports: [RouterLink],
  templateUrl: './panel.html',
  styleUrl: './panel.scss',
})
export class Panel {
  private readonly session = inject(Session);
  private readonly matriculasApi = inject(MatriculaApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly usuario = this.session.usuario;
  readonly cursosActivos = signal<CursoActivo[]>([]);
  readonly cargando = signal(true);
  readonly error = signal(false);
  readonly pestana = signal<'EN_PROGRESO' | 'COMPLETADOS'>('EN_PROGRESO');
  readonly cursosVisibles = computed(() => this.cursosActivos().filter((curso) =>
    this.pestana() === 'COMPLETADOS' ? curso.fechaFinalizacion !== null : curso.fechaFinalizacion === null,
  ));

  constructor() { this.cargar(); }

  protected get primerNombre(): string {
    return this.usuario()?.nombreCompleto?.trim().split(/\s+/)[0] ?? '';
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.matriculasApi.misCursos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (matriculas) => {
        this.cursosActivos.set(matriculas.map((matricula) => ({
          id: matricula.cursoId,
          imagenUrl: '/img/catalogo/curso-1.jpg',
          tipo: matricula.modalidad,
          categoria: matricula.formaIngreso,
          nombre: matricula.cursoTitulo,
          porcentajeProgreso: 0,
          leccionesCompletadas: 0,
          totalLecciones: 0,
          siguienteLeccionNombre: matricula.mensajeAcceso,
          fechaFinalizacion: matricula.fechaFinalizacion,
          accesoEfectivo: matricula.accesoEfectivo,
        })));
        this.cargando.set(false);
      },
      error: () => { this.error.set(true); this.cargando.set(false); },
    });
  }

  protected seleccionarPestana(pestana: 'EN_PROGRESO' | 'COMPLETADOS'): void { this.pestana.set(pestana); }
}
