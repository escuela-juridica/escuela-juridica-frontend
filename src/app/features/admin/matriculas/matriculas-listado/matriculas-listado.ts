import { DatePipe, LowerCasePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatriculaApiService } from '../../../matriculas/matricula-api.service';
import { MatriculaAdministrativa } from '../../../matriculas/matricula.model';
import { AlertaGlobalService } from '../../../../core/notificaciones/alerta-global.service';
import { Modal } from '../../../../shared/ui/modal/modal';
import { AdminUsuariosApiService } from '../../usuarios/admin-usuarios-api.service';
import { UsuarioAdminRespuesta } from '../../usuarios/usuario-admin.model';
import { CursoAdminApiService } from '../../cursos/curso-admin-api.service';
import { CursoResumenRespuesta } from '../../cursos/curso-admin.model';
import { CrearMatriculaAdministrativa } from '../../../matriculas/matricula-api.service';

@Component({
  selector: 'app-matriculas-listado',
  imports: [FormsModule, DatePipe, LowerCasePipe, Modal],
  templateUrl: './matriculas-listado.html',
  styleUrl: './matriculas-listado.scss',
})
export class MatriculasListado {
  private readonly api = inject(MatriculaApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly alertas = inject(AlertaGlobalService);
  private readonly usuariosApi = inject(AdminUsuariosApiService);
  private readonly cursosApi = inject(CursoAdminApiService);

  protected readonly filas = signal<MatriculaAdministrativa[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected texto = '';
  protected estado = '';
  protected readonly pagina = signal(0);
  protected readonly totalPaginas = signal(0);

  protected readonly alumnos = signal<UsuarioAdminRespuesta[]>([]);
  protected readonly cursos = signal<CursoResumenRespuesta[]>([]);
  protected readonly formularioAbierto = signal(false);
  protected readonly enviando = signal(false);
  protected readonly filaCancelando = signal<MatriculaAdministrativa | null>(null);
  protected readonly motivoCancelacion = signal('');
  protected readonly cancelando = signal(false);
  protected nueva: CrearMatriculaAdministrativa = {
    usuarioId: 0,
    cursoId: 0,
    condicionEconomica: 'EXONERADO',
    importe: 0,
    medio: null,
    referencia: null,
    motivo: '',
  };

  constructor() {
    this.cargar();
  }

  protected buscar(): void {
    this.pagina.set(0);
    this.cargar();
  }

  protected limpiarFiltros(): void {
    this.texto = '';
    this.estado = '';
    this.buscar();
  }

  protected irAPagina(pagina: number): void {
    if (pagina < 0 || pagina >= this.totalPaginas()) {
      return;
    }
    this.pagina.set(pagina);
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api
      .listarAdministrativas(this.texto, this.estado, this.pagina(), 20)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.filas.set(r.items);
          this.totalPaginas.set(r.totalPages);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No pudimos cargar las matrículas. Inténtalo nuevamente.');
          this.cargando.set(false);
        },
      });
  }

  // "ADMINISTRADOR" tal cual confunde — parece describir el rol del alumno, no cómo ingresó.
  protected etiquetaIngreso(formaIngreso: string): string {
    switch (formaIngreso) {
      case 'GRATUITA': return 'Gratuita';
      case 'ADMINISTRADOR': return 'Asignación manual';
      case 'PAGO_EN_LINEA': return 'Pago en línea';
      case 'EXONERADA': return 'Exonerada';
      default: return formaIngreso;
    }
  }

  protected claseIngreso(formaIngreso: string): string {
    switch (formaIngreso) {
      case 'GRATUITA': return 'badge--ingreso-gratuito';
      case 'ADMINISTRADOR': return 'badge--ingreso-manual';
      case 'PAGO_EN_LINEA': return 'badge--ingreso-pago';
      case 'EXONERADA': return 'badge--ingreso-manual';
      default: return 'badge--disp-cerrado';
    }
  }

  protected abrirCancelar(fila: MatriculaAdministrativa): void {
    this.motivoCancelacion.set('');
    this.filaCancelando.set(fila);
  }

  protected cerrarCancelar(): void {
    this.filaCancelando.set(null);
  }

  protected confirmarCancelar(): void {
    const fila = this.filaCancelando();
    const motivo = this.motivoCancelacion().trim();
    if (!fila || !motivo) {
      this.alertas.mostrar('error', 'Indica el motivo de la cancelación.');
      return;
    }
    this.cancelando.set(true);
    this.api
      .cancelar(fila.id, motivo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cancelando.set(false);
          this.filaCancelando.set(null);
          this.alertas.mostrar('exito', 'Matricula cancelada.');
          this.cargar();
        },
        error: (e) => {
          this.cancelando.set(false);
          this.alertas.mostrar('error', e.error?.message ?? 'No pudimos cancelar la matricula.');
        },
      });
  }

  protected abrirFormulario(): void {
    this.formularioAbierto.set(true);
    this.usuariosApi
      .listar('', 'ALUMNO', 'TODOS', 0, 50)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((r) => this.alumnos.set(r.items));
    this.cursosApi
      .listar('', 0, 50)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((r) => this.cursos.set(r.items.filter((c) => c.estadoCodigo === 'PUBLICADO' || c.estadoCodigo === 'EN_CURSO')));
  }

  protected guardar(): void {
    if (!this.nueva.usuarioId || !this.nueva.cursoId || !this.nueva.motivo.trim()) {
      this.alertas.mostrar('error', 'Selecciona alumno, curso y registra un motivo.');
      return;
    }
    if (
      this.nueva.condicionEconomica === 'REGISTRADO_MANUAL' &&
      (!this.nueva.importe || !this.nueva.medio?.trim() || !this.nueva.referencia?.trim())
    ) {
      this.alertas.mostrar('error', 'El registro manual requiere importe, medio y referencia.');
      return;
    }
    this.enviando.set(true);
    this.api
      .crearAdministrativa(this.nueva)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.formularioAbierto.set(false);
          this.alertas.mostrar('exito', 'Matricula registrada.');
          this.cargar();
        },
        error: (e) => {
          this.enviando.set(false);
          this.alertas.mostrar('error', e.error?.message ?? 'No pudimos registrar la matricula.');
        },
      });
  }
}
