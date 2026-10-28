import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatriculaApiService } from '../../../matriculas/matricula-api.service';
import {AdvertenciaMatricula,MatriculaAdministrativa,MatriculaDetalleAdministrativa} from '../../../matriculas/matricula.model';
import { AlertaGlobalService } from '../../../../core/notificaciones/alerta-global.service';
import { Modal } from '../../../../shared/ui/modal/modal';
import { AdminUsuariosApiService } from '../../usuarios/admin-usuarios-api.service';
import { UsuarioAdminRespuesta } from '../../usuarios/usuario-admin.model';
import { CursoAdminApiService } from '../../cursos/curso-admin-api.service';
import { CursoResumenRespuesta } from '../../cursos/curso-admin.model';
import { CrearMatriculaAdministrativa } from '../../../matriculas/matricula-api.service';
import { NgClass } from '@angular/common';
import { finalize } from 'rxjs';

// HU-020 (listado, filtros, detalle, cancelar) se retiró deliberadamente — ver
// docs/epica-4/HU-020-MAPA-TECNICO-CONTROL-MATRICULAS.md en el backend para reconstruirla.
// Lo de HU-019 ("+ Nueva matrícula") se quedó funcionando tal cual estaba.
@Component({
  selector: 'app-matriculas-listado',
  imports: [FormsModule, Modal, NgClass, RouterLink],
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
  protected readonly texto = signal('');
  protected readonly estado = signal('');
  protected readonly filas = signal<MatriculaAdministrativa[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly pagina = signal(0);
  protected readonly totalPaginas = signal(1);
  private readonly tamanoPagina = 10;
  protected readonly detalle = signal<MatriculaDetalleAdministrativa | null>(null);
  protected readonly detalleAbierto = signal(false);
  protected readonly cargandoDetalle = signal(false);
  protected readonly errorDetalle = signal('');
  protected readonly cancelacionAbierta = signal(false);
  protected readonly matriculaCancelar = signal<MatriculaAdministrativa | null>(null);
  protected readonly motivoCancelacion = signal('');
  protected readonly cancelando = signal(false);
  
 constructor() {
  this.cargar();
}

protected cargar(): void {
  this.cargando.set(true);
  this.error.set('');

  this.api.listarAdministrativas(
    this.texto(),
    this.estado(),
    this.pagina(),
    this.tamanoPagina
  )
  .pipe(
    takeUntilDestroyed(this.destroyRef),
    finalize(() => this.cargando.set(false))
  )
  .subscribe({
    next: (respuesta) => {
      this.filas.set(respuesta.items);
      this.totalPaginas.set(Math.max(1, respuesta.totalPages));
      this.pagina.set(respuesta.page);
    },
    error: () => {
      this.filas.set([]);
      this.error.set('No se pudieron cargar las matrículas. Intenta nuevamente.');
    }
  });
}

protected cambiarTexto(valor: string): void {
  this.texto.set(valor);
  this.pagina.set(0);
  this.cargar();
}

protected cambiarEstado(valor: string): void {
  this.estado.set(valor);
  this.pagina.set(0);
  this.cargar();
}

protected limpiarFiltros(): void {
  this.texto.set('');
  this.estado.set('');
  this.pagina.set(0);
  this.cargar();
}

protected irAPagina(numero: number): void {
  if (numero < 0 || numero >= this.totalPaginas()) return;

  this.pagina.set(numero);
  this.cargar();
}

protected fecha(valor: string | null): string {
  if (!valor) return '—';

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) return valor;

  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(fecha);
}

protected etiquetaIngreso(valor: string): string {
  const etiquetas: Record<string, string> = {
    REGISTRADO_MANUAL: 'Pago manual',
    EXONERADO: 'Exonerado',
    GRATUITO: 'Gratuito',
    COMPRA: 'Compra',
    PAGO: 'Pago'
  };

  return etiquetas[valor] ?? valor ?? 'No especificado';
}

protected etiquetaEstado(valor: string): string {
  const etiquetas: Record<string, string> = {
    ACTIVA: 'Activa',
    CANCELADA: 'Cancelada',
    FINALIZADA: 'Finalizada',
    VENCIDA: 'Vencida'
  };

  return etiquetas[valor] ?? valor ?? 'Sin estado';
}

protected claseEstado(valor: string): string {
  const clases: Record<string, string> = {
    ACTIVA: 'badge badge--disp-inmediato',
    CANCELADA: 'badge badge--disp-cancelado',
    FINALIZADA: 'badge badge--disp-cerrado',
    VENCIDA: 'badge badge--advertencia-suave'
  };

  return clases[valor] ?? 'badge badge--disp-cerrado';
}

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
  
protected abrirDetalle(fila: MatriculaAdministrativa): void {
  this.detalle.set(null);
  this.errorDetalle.set('');
  this.detalleAbierto.set(true);
  this.cargandoDetalle.set(true);

  this.api.obtenerDetalleAdministrativo(fila.id)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.cargandoDetalle.set(false))
    )
    .subscribe({
      next: (respuesta) => this.detalle.set(respuesta),
      error: () => {
        this.errorDetalle.set('No se pudo cargar el detalle de la matrícula.');
      }
    });
}

protected cerrarDetalle(): void {
  this.detalleAbierto.set(false);
  this.detalle.set(null);
  this.errorDetalle.set('');
}

protected abrirCancelar(fila: MatriculaAdministrativa): void {
  if (fila.estado !== 'ACTIVA') return;

  this.matriculaCancelar.set(fila);
  this.motivoCancelacion.set('');
  this.cancelacionAbierta.set(true);
}

protected cerrarCancelar(): void {
  if (this.cancelando()) return;

  this.cancelacionAbierta.set(false);
  this.matriculaCancelar.set(null);
  this.motivoCancelacion.set('');
}

protected cancelarMatricula(): void {
  const matricula = this.matriculaCancelar();
  const motivo = this.motivoCancelacion().trim();

  if (!matricula || matricula.estado !== 'ACTIVA') return;

  if (!motivo) {
    this.alertas.mostrar('error', 'Debes indicar el motivo de la cancelación.');
    return;
  }

  this.cancelando.set(true);

  this.api.cancelarAdministrativa(matricula.id, motivo)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.cancelando.set(false))
    )
    .subscribe({
      next: () => {
        this.cancelacionAbierta.set(false);
        this.matriculaCancelar.set(null);
        this.motivoCancelacion.set('');
        this.alertas.mostrar('exito', 'Matrícula cancelada correctamente.');
        this.cargar();
      },
      error: (e) => {
        this.alertas.mostrar(
          'error',
          e.error?.message ?? 'No se pudo cancelar la matrícula.'
        );
      }
    });
}

protected reenviarConfirmacion(id: number): void {
  this.api.reenviarConfirmacion(id)
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (respuesta) => {
        this.alertas.mostrar(
          respuesta.enviado ? 'exito' : 'error',
          respuesta.mensaje
        );
      },
      error: () => {
        this.alertas.mostrar('error', 'No se pudo reenviar la confirmación.');
      }
    });
}

  
}
