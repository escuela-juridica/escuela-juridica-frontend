import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatriculaApiService } from '../../../matriculas/matricula-api.service';
import { AdvertenciaMatricula } from '../../../matriculas/matricula.model';
import { AlertaGlobalService } from '../../../../core/notificaciones/alerta-global.service';
import { Modal } from '../../../../shared/ui/modal/modal';
import { AdminUsuariosApiService } from '../../usuarios/admin-usuarios-api.service';
import { UsuarioAdminRespuesta } from '../../usuarios/usuario-admin.model';
import { CursoAdminApiService } from '../../cursos/curso-admin-api.service';
import { CursoResumenRespuesta } from '../../cursos/curso-admin.model';
import { CrearMatriculaAdministrativa } from '../../../matriculas/matricula-api.service';

// HU-020 (listado, filtros, detalle, cancelar) se retiró deliberadamente — ver
// docs/epica-4/HU-020-MAPA-TECNICO-CONTROL-MATRICULAS.md en el backend para reconstruirla.
// Lo de HU-019 ("+ Nueva matrícula") se quedó funcionando tal cual estaba.
@Component({
  selector: 'app-matriculas-listado',
  imports: [FormsModule, Modal],
  templateUrl: './matriculas-listado.html',
  styleUrl: './matriculas-listado.scss',
})
export class MatriculasListado {
  private readonly api = inject(MatriculaApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly alertas = inject(AlertaGlobalService);
  private readonly usuariosApi = inject(AdminUsuariosApiService);
  private readonly cursosApi = inject(CursoAdminApiService);

  protected readonly alumnos = signal<UsuarioAdminRespuesta[]>([]);
  protected readonly cursos = signal<CursoResumenRespuesta[]>([]);
  protected readonly formularioAbierto = signal(false);
  protected readonly enviando = signal(false);
  protected readonly advertencia = signal<AdvertenciaMatricula | null>(null);
  protected readonly consultandoAdvertencia = signal(false);
  protected readonly errorAdvertencia = signal(false);
  // Mismo patrón que examenes-tab.ts: se activa al intentar guardar, y recién ahí los campos
  // vacíos se marcan en rojo (.input--error) — no desde que se abre el formulario.
  protected readonly intentoRegistrar = signal(false);
  protected nueva: CrearMatriculaAdministrativa = {
    usuarioId: 0,
    cursoId: 0,
    condicionEconomica: 'EXONERADO',
    importe: 0,
    medio: null,
    referencia: null,
    motivo: '',
    confirmoAdvertenciaAcademica: false,
  };

  protected abrirFormulario(): void {
    this.nueva = { usuarioId: 0, cursoId: 0, condicionEconomica: 'EXONERADO', importe: 0,
      medio: null, referencia: null, motivo: '', confirmoAdvertenciaAcademica: false };
    this.advertencia.set(null);
    this.errorAdvertencia.set(false);
    this.intentoRegistrar.set(false);
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

  protected consultarAdvertencia(cursoId: number): void {
    this.nueva.confirmoAdvertenciaAcademica = false;
    this.advertencia.set(null);
    this.errorAdvertencia.set(false);
    if (!cursoId) return;
    this.consultandoAdvertencia.set(true);
    this.api.advertenciaAcademica(cursoId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (advertencia) => {
        this.advertencia.set(advertencia);
        this.consultandoAdvertencia.set(false);
      },
      error: () => {
        this.errorAdvertencia.set(true);
        this.consultandoAdvertencia.set(false);
      },
    });
  }

  protected guardar(): void {
    this.intentoRegistrar.set(true);
    if (!this.nueva.usuarioId || !this.nueva.cursoId || !this.nueva.motivo.trim()) {
      this.alertas.mostrar('error', 'Selecciona alumno, curso y registra un motivo.');
      return;
    }
    if (this.consultandoAdvertencia() || this.errorAdvertencia()) {
      this.alertas.mostrar('error', 'Espera a que validemos las condiciones académicas del curso.');
      return;
    }
    if (this.advertencia()?.requiereConfirmacion && !this.nueva.confirmoAdvertenciaAcademica) {
      this.alertas.mostrar('error', 'Confirma que deseas continuar con esta advertencia académica.');
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
        },
        error: (e) => {
          this.enviando.set(false);
          this.alertas.mostrar('error', e.error?.message ?? 'No pudimos registrar la matricula.');
        },
      });
  }
}
