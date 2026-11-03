import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { NgOptionTemplateDirective, NgSelectComponent } from '@ng-select/ng-select';
import { Subscription, catchError, map, of } from 'rxjs';

import { resolverUrlApi } from '../../../../core/api/api.config';
import { TablaPaginacion } from '../../../../shared/ui/tabla-paginacion/tabla-paginacion';
import { OpcionSelect, crearSelectorBusqueda } from '../../../../shared/util/selector-busqueda';
import { CursoAdminApiService } from '../../cursos/curso-admin-api.service';
import { CursoResumenRespuesta } from '../../cursos/curso-admin.model';
import { AdminUsuariosApiService } from '../../usuarios/admin-usuarios-api.service';
import { UsuarioAdminRespuesta } from '../../usuarios/usuario-admin.model';
import { CertificadosAdminApiService } from '../certificados-admin-api.service';
import { CertificadoGestion, FiltrosGestion } from '../certificados-admin.model';

const TAMANO_PAGINA = 20;
const TAMANO_BUSQUEDA = 30;

/** HU-035/HU-036 — PF-033: matrículas con la situación de su certificado; desde aquí se emite uno manual. */
@Component({
  selector: 'app-gestion-certificados',
  imports: [FormsModule, DatePipe, RouterLink, NgSelectComponent, NgOptionTemplateDirective, TablaPaginacion],
  templateUrl: './gestion-certificados.html',
  styleUrl: './gestion-certificados.scss',
})
export class GestionCertificados {
  private readonly api = inject(CertificadosAdminApiService);
  private readonly usuariosApi = inject(AdminUsuariosApiService);
  private readonly cursosApi = inject(CursoAdminApiService);
  private readonly destroyRef = inject(DestroyRef);
  private peticion?: Subscription;

  // Los selectores de alumno y curso consultan al servidor mientras se escribe (solo para sugerir opciones); la lista
  // de certificados no cambia hasta pulsar «Buscar».
  protected readonly filtroAlumno = crearSelectorBusqueda(this.destroyRef, (texto) => this.consultarAlumnos(texto), () => this.alumnoId);
  protected readonly filtroCurso = crearSelectorBusqueda(this.destroyRef, (texto) => this.consultarCursos(texto), () => this.cursoId);

  protected readonly tamano = TAMANO_PAGINA;
  protected readonly filas = signal<CertificadoGestion[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pagina = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly totalFilas = signal(0);

  protected alumnoId: number | null = null;
  protected cursoId: number | null = null;
  protected estado = '';
  /** Filtros aplicados con el último «Buscar»; la paginación usa estos y no lo que se esté editando. */
  private aplicados: FiltrosGestion = { usuarioId: null, cursoId: null, estado: '' };

  constructor() {
    this.cargar();
  }

  private consultarAlumnos(texto: string) {
    return this.usuariosApi.listar(texto, 'ALUMNO', 'TODOS', 0, TAMANO_BUSQUEDA).pipe(
      map((r) => r.items.map((u: UsuarioAdminRespuesta): OpcionSelect => ({ id: u.usuarioId, etiqueta: u.nombreCompleto }))),
      catchError(() => of([] as OpcionSelect[])),
    );
  }

  /** Todos los cursos, también los ya terminados: el certificado de un curso cerrado se sigue consultando. */
  private consultarCursos(texto: string) {
    return this.cursosApi.listar(texto, 0, TAMANO_BUSQUEDA).pipe(
      map((r) => r.items.map((c: CursoResumenRespuesta): OpcionSelect => ({ id: c.id, etiqueta: c.titulo }))),
      catchError(() => of([] as OpcionSelect[])),
    );
  }

  /** Aplica los filtros escritos y vuelve a la primera página. */
  protected buscar(): void {
    this.aplicados = { usuarioId: this.alumnoId, cursoId: this.cursoId, estado: this.estado };
    this.pagina.set(0);
    this.cargar();
  }

  /** Abre el PDF vigente en otra pestaña, igual que lo ve el alumno. */
  protected verCertificado(codigo: string): void {
    window.open(`${resolverUrlApi(`/api/app/certificados/${encodeURIComponent(codigo)}/descargar`)}?enLinea=true`, '_blank');
  }

  protected limpiar(): void {
    this.alumnoId = null;
    this.cursoId = null;
    this.estado = '';
    this.buscar();
  }

  protected irAPagina(pagina: number): void {
    if (pagina < 0 || pagina >= this.totalPaginas()) return;
    this.pagina.set(pagina);
    this.cargar();
  }

  protected etiquetaMatricula(estado: string): string {
    switch (estado) {
      case 'ACTIVA': return 'Activa';
      case 'VENCIDA': return 'Vencida';
      case 'CANCELADA': return 'Cancelada';
      case 'FINALIZADA': return 'Finalizada';
      default: return estado;
    }
  }

  /** Texto del botón de una matrícula sin certificado: con avance que mirar o solo la situación. */
  protected textoVer(fila: CertificadoGestion): string {
    return fila.estadoMatricula === 'ACTIVA' || fila.estadoMatricula === 'VENCIDA' ? 'Ver avance' : 'Ver situación';
  }

  /** Línea bajo la barra de avance de una matrícula sin certificado. */
  protected notaAvance(fila: CertificadoGestion): string {
    if (fila.cumpleRequisitos) return 'Cumple los requisitos';
    switch (fila.estadoMatricula) {
      case 'VENCIDA': return 'Acceso vencido';
      case 'FINALIZADA': return 'Finalizada';
      default: return 'En curso';
    }
  }

  protected claseMatricula(estado: string): string {
    switch (estado) {
      case 'ACTIVA': return 'badge badge--disp-inmediato';
      case 'VENCIDA': return 'badge badge--advertencia-suave';
      case 'CANCELADA': return 'badge badge--disp-cancelado';
      default: return 'badge badge--disp-cerrado';
    }
  }

  protected etiquetaEmision(tipo: string | null): string {
    switch (tipo) {
      case 'AUTOMATICA': return 'Automática';
      case 'SOLICITADA': return 'Confirmada por el alumno';
      case 'MANUAL': return 'Manual administrativa';
      default: return '—';
    }
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.peticion?.unsubscribe();
    this.peticion = this.api
      .listar(this.aplicados, this.pagina(), TAMANO_PAGINA)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.filas.set(r.items);
          this.totalPaginas.set(r.totalPages);
          this.totalFilas.set(r.totalElements);
          this.cargando.set(false);
        },
        error: (e: HttpErrorResponse) => {
          const cuerpo = typeof e.error === 'object' && e.error !== null ? (e.error as { message?: string }) : null;
          this.error.set(cuerpo?.message ?? 'No pudimos cargar los certificados. Inténtalo nuevamente.');
          this.cargando.set(false);
        },
      });
  }
}
