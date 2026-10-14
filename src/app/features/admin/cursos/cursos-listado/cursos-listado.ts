import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { Modal } from '../../../../shared/ui/modal/modal';
import { CursoAdminApiService } from '../curso-admin-api.service';
import { CursoResumenRespuesta } from '../curso-admin.model';

/** HU-010 — Listado administrativo de cursos: paginado server-side, con botón para crear un
 * borrador y entrar directo al editor. */
@Component({
  selector: 'app-cursos-listado',
  imports: [FormsModule, Modal],
  templateUrl: './cursos-listado.html',
  styleUrl: './cursos-listado.scss',
})
export class CursosListado implements OnInit {
  private readonly api = inject(CursoAdminApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly detector = inject(ChangeDetectorRef);

  protected readonly texto = signal('');
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly cursos = signal<CursoResumenRespuesta[]>([]);
  protected readonly pagina = signal(0);
  protected readonly totalPaginas = signal(0);

  protected readonly creando = signal(false);
  protected readonly intentoCrear = signal(false);
  protected readonly tituloNuevo = signal('');
  protected readonly errorCrear = signal<string | null>(null);

  protected get tituloInvalido(): boolean {
    return this.intentoCrear() && this.tituloNuevo().trim().length === 0;
  }
  protected readonly modalAbierto = signal(false);

  ngOnInit(): void {
    this.cargar();
  }

  protected onBusquedaInput(valor: string): void {
    this.texto.set(valor);
    this.pagina.set(0);
    this.cargar();
  }

  protected irAPagina(pagina: number): void {
    if (pagina < 0 || pagina >= this.totalPaginas()) {
      return;
    }
    this.pagina.set(pagina);
    this.cargar();
  }

  protected abrirCrear(): void {
    this.tituloNuevo.set('');
    this.errorCrear.set(null);
    this.intentoCrear.set(false);
    this.modalAbierto.set(true);
  }

  protected cerrarCrear(): void {
    this.modalAbierto.set(false);
  }

  protected etiquetaModalidad(modalidad: string | null): string {
    switch (modalidad) {
      case 'VIRTUAL': return 'Virtual';
      case 'EN_VIVO': return 'En vivo';
      case 'HIBRIDO': return 'Híbrido';
      default: return '—';
    }
  }

  protected claseEstado(estadoCodigo: string): string {
    switch (estadoCodigo) {
      case 'BORRADOR': return 'badge--disp-proximo';
      case 'PUBLICADO': return 'badge--disp-inmediato';
      case 'EN_CURSO': return 'badge--disp-inmediato';
      case 'CERRADO': return 'badge--disp-cerrado';
      case 'CANCELADO': return 'badge--disp-cerrado';
      default: return 'badge--disp-cerrado';
    }
  }

  protected crear(): void {
    if (this.creando()) {
      return;
    }
    this.intentoCrear.set(true);
    const titulo = this.tituloNuevo().trim();
    if (!titulo) {
      return;
    }
    this.creando.set(true);
    this.errorCrear.set(null);
    this.api
      .crear({ titulo })
      .pipe(
        finalize(() => {
          this.creando.set(false);
          this.detector.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (respuesta) => {
          this.modalAbierto.set(false);
          this.router.navigate(['/admin/cursos', respuesta.id]);
        },
        error: (error: HttpErrorResponse) => {
          const cuerpo = typeof error.error === 'object' && error.error !== null
            ? (error.error as { message?: string })
            : null;
          this.errorCrear.set(cuerpo?.message ?? 'No pudimos crear el curso. Inténtalo nuevamente.');
        },
      });
  }

  protected abrirEditor(cursoId: number): void {
    this.router.navigate(['/admin/cursos', cursoId]);
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api
      .listar(this.texto(), this.pagina(), 20)
      .pipe(
        finalize(() => {
          this.cargando.set(false);
          this.detector.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (respuesta) => {
          this.cursos.set(respuesta.items);
          this.totalPaginas.set(respuesta.totalPages);
        },
        error: () => {
          this.error.set('No pudimos cargar los cursos. Inténtalo nuevamente.');
        },
      });
  }
}
