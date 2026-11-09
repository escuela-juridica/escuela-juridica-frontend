import { Component, DestroyRef, WritableSignal, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatriculaApiService } from '../../../matriculas/matricula-api.service';
import {AdvertenciaMatricula,MatriculaAdministrativa,MatriculaDetalleAdministrativa} from '../../../matriculas/matricula.model';
import { ConfirmacionService } from '../../../../core/dialogo/confirmacion.service';
import { AlertaGlobalService } from '../../../../core/notificaciones/alerta-global.service';
import { Modal } from '../../../../shared/ui/modal/modal';
import { AdminUsuariosApiService } from '../../usuarios/admin-usuarios-api.service';
import { UsuarioAdminRespuesta } from '../../usuarios/usuario-admin.model';
import { CursoAdminApiService } from '../../cursos/curso-admin-api.service';
import { CursoResumenRespuesta } from '../../cursos/curso-admin.model';
import { CrearMatriculaAdministrativa } from '../../../matriculas/matricula-api.service';
import { NgClass } from '@angular/common';
import { Subject, catchError, debounceTime, finalize, map, of, switchMap, tap } from 'rxjs';
import { NgOptionTemplateDirective, NgSelectComponent } from '@ng-select/ng-select';
import { SeguimientoAcademico } from '../seguimiento-academico/seguimiento-academico';
import { ExcepcionesPago } from '../../excepciones-pago/excepciones-pago';
import { TablaPaginacion } from '../../../../shared/ui/tabla-paginacion/tabla-paginacion';
import { crearSelectorBusqueda } from '../../../../shared/util/selector-busqueda';

interface ResumenMatricula {
  id: number;
  alumno: string;
  correo: string;
  cursoTitulo: string;
  formaIngreso: string;
  fechaMatricula: string;
}

interface OpcionSelect {
  id: number;
  etiqueta: string;
  detalle?: string;
}

const TAMANO_BUSQUEDA = 30;
const COMPROBANTE_TIPOS = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
const COMPROBANTE_MAXIMO_BYTES = 5 * 1024 * 1024;
const RETARDO_BUSQUEDA_MS = 300;

@Component({
  selector: 'app-matriculas-listado',
  imports: [FormsModule, Modal, NgClass, NgSelectComponent, NgOptionTemplateDirective, RouterLink, SeguimientoAcademico, ExcepcionesPago, TablaPaginacion],
  templateUrl: './matriculas-listado.html',
  styleUrl: './matriculas-listado.scss',
})
export class MatriculasListado {
  private readonly api = inject(MatriculaApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly alertas = inject(AlertaGlobalService);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly usuariosApi = inject(AdminUsuariosApiService);
  private readonly cursosApi = inject(CursoAdminApiService);

  protected readonly alumnoOpciones = signal<OpcionSelect[]>([]);
  protected readonly cursoOpciones = signal<OpcionSelect[]>([]);
  protected readonly buscandoAlumno = signal(false);
  protected readonly buscandoCurso = signal(false);
  protected readonly busquedaAlumno$ = new Subject<string>();
  protected readonly busquedaCurso$ = new Subject<string>();
  protected readonly mediosPago = [
    { id: 'TRANSFERENCIA', etiqueta: 'Transferencia' },
    { id: 'DEPOSITO', etiqueta: 'Depósito bancario' },
    { id: 'YAPE', etiqueta: 'Yape' },
    { id: 'PLIN', etiqueta: 'Plin' },
    { id: 'EFECTIVO', etiqueta: 'Efectivo' },
    { id: 'TARJETA', etiqueta: 'Tarjeta' },
    { id: 'OTRO', etiqueta: 'Otro' },
  ];
  protected readonly condiciones = [
    { id: 'EXONERADO', etiqueta: 'Exonerado' },
    { id: 'REGISTRADO_MANUAL', etiqueta: 'Pago manual registrado' },
  ];
  protected readonly formularioAbierto = signal(false);
  protected readonly enviando = signal(false);
  protected readonly advertencia = signal<AdvertenciaMatricula | null>(null);
  protected readonly consultandoAdvertencia = signal(false);
  protected readonly errorAdvertencia = signal(false);
  protected readonly intentoRegistrar = signal(false);
  protected filtroAlumnoId: number | null = null;
  protected filtroCursoId: number | null = null;
  protected filtroEstado = '';
  private aplicados = { usuarioId: null as number | null, cursoId: null as number | null, estado: '' };
  protected readonly filtroAlumno = crearSelectorBusqueda(
    this.destroyRef,
    (texto) => this.consultarAlumnos(texto),
    () => this.filtroAlumnoId,
  );
  protected readonly filtroCurso = crearSelectorBusqueda(
    this.destroyRef,
    (texto) => this.consultarTodosLosCursos(texto),
    () => this.filtroCursoId,
  );
  protected readonly filas = signal<MatriculaAdministrativa[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal('');
  protected readonly pagina = signal(0);
  protected readonly totalPaginas = signal(1);
  protected readonly tamanoPagina = 10;
  protected readonly totalElementos = signal(0);
  protected readonly detalle = signal<MatriculaDetalleAdministrativa | null>(null);
  protected readonly detalleAbierto = signal(false);
  protected readonly cargandoDetalle = signal(false);
  protected readonly errorDetalle = signal('');
  protected readonly cancelacionAbierta = signal(false);
  protected readonly matriculaCancelar = signal<MatriculaAdministrativa | null>(null);
  protected readonly motivoCancelacion = signal('');
  protected readonly cancelando = signal(false);
  protected readonly reactivacionAbierta = signal(false);
  protected readonly matriculaReactivar = signal<ResumenMatricula | null>(null);
  protected readonly motivoReactivacion = signal('');
  protected readonly reactivando = signal(false);
  protected readonly seguimientoMatriculaId = signal<number | null>(null);
  protected readonly reenviando = signal(false);
  protected readonly comprobante = signal<File | null>(null);
  protected readonly errorComprobante = signal('');
  protected readonly subiendoComprobante = signal(false);
  protected readonly pestana = signal<'matriculas' | 'excepciones'>('matriculas');

 constructor() {
  this.cargar();

  this.ruta.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
    if (params.get('tab') === 'excepciones') this.pestana.set('excepciones');
    const matriculaId = Number(params.get('seguimiento'));
    if (matriculaId > 0) this.seguimientoMatriculaId.set(matriculaId);
  });

  this.busquedaAlumno$
    .pipe(
      debounceTime(RETARDO_BUSQUEDA_MS),
      tap(() => this.buscandoAlumno.set(true)),
      switchMap((texto) => this.consultarAlumnos(texto ?? '')),
      takeUntilDestroyed(this.destroyRef),
    )
    .subscribe((opciones) => this.publicarOpciones(this.alumnoOpciones, opciones, this.nueva.usuarioId, this.buscandoAlumno));

  this.busquedaCurso$
    .pipe(
      debounceTime(RETARDO_BUSQUEDA_MS),
      tap(() => this.buscandoCurso.set(true)),
      switchMap((texto) => this.consultarCursos(texto ?? '')),
      takeUntilDestroyed(this.destroyRef),
    )
    .subscribe((opciones) => this.publicarOpciones(this.cursoOpciones, opciones, this.nueva.cursoId, this.buscandoCurso));
}

private consultarAlumnos(texto: string) {
  return this.usuariosApi.listar(texto, 'ALUMNO', 'TODOS', 0, TAMANO_BUSQUEDA).pipe(
    map((r) => r.items.map((u: UsuarioAdminRespuesta): OpcionSelect => ({ id: u.usuarioId, etiqueta: u.nombreCompleto, detalle: u.correo }))),
    catchError(() => of([] as OpcionSelect[])),
  );
}

private consultarTodosLosCursos(texto: string) {
  return this.cursosApi.listar(texto, 0, TAMANO_BUSQUEDA).pipe(
    map((r) => r.items.map((c: CursoResumenRespuesta): OpcionSelect => ({ id: c.id, etiqueta: c.titulo }))),
    catchError(() => of([] as OpcionSelect[])),
  );
}

private consultarCursos(texto: string) {
  return this.cursosApi.listar(texto, 0, TAMANO_BUSQUEDA).pipe(
    map((r) => r.items
      .filter((c: CursoResumenRespuesta) => c.estadoCodigo === 'PUBLICADO' || c.estadoCodigo === 'EN_CURSO')
      .map((c): OpcionSelect => ({ id: c.id, etiqueta: c.titulo }))),
    catchError(() => of([] as OpcionSelect[])),
  );
}

private publicarOpciones(destino: WritableSignal<OpcionSelect[]>, nuevas: OpcionSelect[], seleccionada: number, buscando: WritableSignal<boolean>): void {
  const elegida = seleccionada ? destino().find((o) => o.id === seleccionada) : undefined;
  destino.set(elegida && !nuevas.some((o) => o.id === elegida.id) ? [elegida, ...nuevas] : nuevas);
  buscando.set(false);
}

protected cargar(): void {
  this.cargando.set(true);
  this.error.set('');

  this.api.listarAdministrativas(
    this.aplicados,
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
      this.totalElementos.set(respuesta.totalElements);
      this.pagina.set(respuesta.page);
    },
    error: () => {
      this.filas.set([]);
      this.error.set('No se pudieron cargar las matrículas. Intenta nuevamente.');
    }
  });
}

protected buscar(): void {
  this.aplicados = { usuarioId: this.filtroAlumnoId, cursoId: this.filtroCursoId, estado: this.filtroEstado };
  this.pagina.set(0);
  this.cargar();
}

protected limpiarFiltros(): void {
  this.filtroAlumnoId = null;
  this.filtroCursoId = null;
  this.filtroEstado = '';
  this.buscar();
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

protected fechaHora(valor: string | null): string {
  if (!valor) return '—';

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) return valor;

  const dia = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(fecha);
  const hora = new Intl.DateTimeFormat('es-PE', { hour: 'numeric', minute: '2-digit', hour12: true }).format(fecha);

  return `${dia} ${hora.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').replace(/ ([ap]) m$/, ' $1m')}`;
}

protected humanizar(valor: string | null | undefined): string {
  if (!valor?.trim()) return '—';

  const texto = valor.trim().replace(/_/g, ' ').toLowerCase();

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

protected etiquetaOrigen(valor: string | null): string {
  const etiquetas: Record<string, string> = { EN_LINEA: 'En línea', MANUAL: 'Manual', EXONERADO: 'Exonerado' };

  return etiquetas[(valor ?? '').toUpperCase()] ?? this.humanizar(valor);
}

protected etiquetaMedio(valor: string | null): string {
  return this.mediosPago.find((m) => m.id === (valor ?? '').toUpperCase())?.etiqueta ?? this.humanizar(valor);
}

protected importe(valor: number, moneda: string): string {
  const simbolo = moneda === 'PEN' ? 'S/' : moneda === 'USD' ? 'US$' : moneda;

  return `${simbolo} ${Number(valor).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

protected clasePago(estado: string): string {
  const e = (estado ?? '').toUpperCase();

  if (/APROB|REGISTRADO|EXONERA|PAGAD|COMPLET/.test(e)) return 'badge badge--disp-inmediato';
  if (/RECHAZ|CANCEL|ERROR|FALL|ANUL|EXPIR/.test(e)) return 'badge badge--disp-cancelado';
  if (/PEND|PROCES/.test(e)) return 'badge badge--advertencia-suave';

  return 'badge badge--disp-cerrado';
}

protected etiquetaIngreso(valor: string): string {
  const etiquetas: Record<string, string> = {
    PAGO_EN_LINEA: 'Pago en línea',
    GRATUITA: 'Gratuita',
    ADMINISTRADOR: 'Asignación manual',
    REGISTRADO_MANUAL: 'Pago manual',
    EXONERADA: 'Exonerada',
    EXONERADO: 'Exonerada',
    GRATUITO: 'Gratuita',
    COMPRA: 'Compra',
    PAGO: 'Pago'
  };

  return etiquetas[valor] ?? this.humanizar(valor);
}

protected presentacionIngreso(valor: string): { clase: string; icono: 'tarjeta' | 'regalo' | 'usuario' | 'mano' | 'cinta' | 'punto' } {
  switch (valor) {
    case 'PAGO_EN_LINEA':
    case 'PAGO':
    case 'COMPRA':
      return { clase: 'badge badge--ingreso-pago', icono: 'tarjeta' };
    case 'GRATUITA':
    case 'GRATUITO':
      return { clase: 'badge badge--ingreso-gratuito', icono: 'regalo' };
    case 'ADMINISTRADOR':
      return { clase: 'badge badge--ingreso-manual', icono: 'usuario' };
    case 'REGISTRADO_MANUAL':
      return { clase: 'badge badge--advertencia-suave', icono: 'mano' };
    case 'EXONERADA':
    case 'EXONERADO':
      return { clase: 'badge badge--vivo-suave', icono: 'cinta' };
    default:
      return { clase: 'badge badge--disp-cerrado', icono: 'punto' };
  }
}

protected etiquetaEstado(valor: string): string {
  const etiquetas: Record<string, string> = {
    ACTIVA: 'Activa',
    CANCELADA: 'Cancelada',
    FINALIZADA: 'Finalizada',
    VENCIDA: 'Vencida',
    PENDIENTE_PAGO: 'Pendiente de pago'
  };

  return etiquetas[valor] ?? valor ?? 'Sin estado';
}

protected claseEstado(valor: string): string {
  const clases: Record<string, string> = {
    ACTIVA: 'badge badge--disp-inmediato',
    CANCELADA: 'badge badge--disp-cancelado',
    FINALIZADA: 'badge badge--disp-cerrado',
    VENCIDA: 'badge badge--advertencia-suave',
    PENDIENTE_PAGO: 'badge badge--advertencia-suave'
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
    this.nueva = { usuarioId: 0, cursoId: 0, condicionEconomica: 'EXONERADO', importe: null,
      medio: null, referencia: null, motivo: '', confirmoAdvertenciaAcademica: false };
    this.advertencia.set(null);
    this.errorAdvertencia.set(false);
    this.intentoRegistrar.set(false);
    this.formularioAbierto.set(true);
    this.comprobante.set(null);
    this.errorComprobante.set('');
    this.alumnoOpciones.set([]);
    this.cursoOpciones.set([]);
    this.buscandoAlumno.set(true);
    this.buscandoCurso.set(true);
    this.consultarAlumnos('')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((opciones) => this.publicarOpciones(this.alumnoOpciones, opciones, 0, this.buscandoAlumno));
    this.consultarCursos('')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((opciones) => this.publicarOpciones(this.cursoOpciones, opciones, 0, this.buscandoCurso));
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
    const archivo = this.nueva.condicionEconomica === 'REGISTRADO_MANUAL' ? this.comprobante() : null;
    this.api
      .crearAdministrativa(this.nueva)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (matricula) => {
          this.formularioAbierto.set(false);
          if (!archivo) {
            this.enviando.set(false);
            this.alertas.mostrar('exito', 'Matricula registrada.');
            this.cargar();
            return;
          }
          this.api.adjuntarComprobante(matricula.id, archivo)
            .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => { this.enviando.set(false); this.cargar(); }))
            .subscribe({
              next: () => this.alertas.mostrar('exito', 'Matrícula registrada con su comprobante.'),
              error: (e) => this.alertas.mostrar('error',
                'La matrícula se registró, pero no pudimos adjuntar el comprobante: ' + (e.error?.message ?? 'inténtalo de nuevo desde el detalle.')),
            });
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
  this.seguimientoMatriculaId.set(null);
}

protected cerrarSeguimiento(): void {
  this.seguimientoMatriculaId.set(null);
  if (this.ruta.snapshot.queryParamMap.has('seguimiento')) {
    void this.router.navigate([], { queryParams: { seguimiento: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }
}

protected abrirReactivar(matricula: ResumenMatricula): void {
  this.matriculaReactivar.set(matricula);
  this.motivoReactivacion.set('');
  this.reactivacionAbierta.set(true);
}

protected cerrarReactivar(): void {
  if (this.reactivando()) return;

  this.reactivacionAbierta.set(false);
  this.matriculaReactivar.set(null);
  this.motivoReactivacion.set('');
}

protected async reactivarMatricula(): Promise<void> {
  const matricula = this.matriculaReactivar();
  const motivo = this.motivoReactivacion().trim();

  if (!matricula || this.reactivando()) return;

  if (!motivo) {
    this.alertas.mostrar('error', 'Debes indicar el motivo de la reactivación.');
    return;
  }

  const confirmado = await this.confirmacion.preguntar({
    titulo: '¿Reactivar esta matrícula?',
    mensaje:
      `Vas a reactivar la matrícula de ${matricula.alumno} en «${matricula.cursoTitulo}». ` +
      'El alumno recuperará el acceso al curso de inmediato, siempre que el curso admita matrículas y tenga cupo. ' +
      'El motivo quedará registrado en el historial. ¿Deseas continuar?',
    textoConfirmar: 'Sí, reactivar matrícula',
    textoCancelar: 'No, volver',
  });
  if (!confirmado) return;

  this.reactivando.set(true);

  this.api.reactivarAdministrativa(matricula.id, motivo)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.reactivando.set(false))
    )
    .subscribe({
      next: () => {
        this.reactivacionAbierta.set(false);
        this.matriculaReactivar.set(null);
        this.motivoReactivacion.set('');
        this.alertas.mostrar('exito', 'Matrícula reactivada correctamente.');
        this.cargar();
        if (this.detalle()?.id === matricula.id) {
          this.api.obtenerDetalleAdministrativo(matricula.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((respuesta) => this.detalle.set(respuesta));
        }
      },
      error: (e) => {
        this.alertas.mostrar('error', e.error?.message ?? 'No se pudo reactivar la matrícula.');
      }
    });
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

protected async cancelarMatricula(): Promise<void> {
  const matricula = this.matriculaCancelar();
  const motivo = this.motivoCancelacion().trim();

  if (!matricula || matricula.estado !== 'ACTIVA' || this.cancelando()) return;

  if (!motivo) {
    this.alertas.mostrar('error', 'Debes indicar el motivo de la cancelación.');
    return;
  }

  const confirmado = await this.confirmacion.preguntar({
    titulo: '¿Cancelar esta matrícula?',
    mensaje:
      `Vas a cancelar la matrícula de ${matricula.alumno} en «${matricula.cursoTitulo}». ` +
      'El alumno perderá el acceso al curso de inmediato. Podrás reactivar la matrícula después si fue un error. ' +
      'Los pagos registrados se conservan y el motivo quedará en el historial. ¿Deseas continuar?',
    textoConfirmar: 'Sí, cancelar matrícula',
    textoCancelar: 'No, volver',
    variante: 'peligro',
  });
  if (!confirmado) return;

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

private validarComprobante(archivo: File): string {
  if (!COMPROBANTE_TIPOS.includes(archivo.type)) return 'El comprobante debe ser una imagen (PNG, JPG o WEBP) o un PDF.';
  if (archivo.size > COMPROBANTE_MAXIMO_BYTES) return 'El comprobante supera el máximo de 5 MB.';
  return '';
}

protected elegirComprobante(evento: Event): void {
  const entrada = evento.target as HTMLInputElement;
  const archivo = entrada.files?.[0] ?? null;
  entrada.value = '';
  if (!archivo) return;
  const motivo = this.validarComprobante(archivo);
  this.errorComprobante.set(motivo);
  this.comprobante.set(motivo ? null : archivo);
}

protected quitarComprobante(): void {
  this.comprobante.set(null);
  this.errorComprobante.set('');
}

protected tamanoArchivo(bytes: number): string {
  return bytes >= 1024 * 1024 ? (bytes / (1024 * 1024)).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
}

protected adjuntarDesdeDetalle(evento: Event, matriculaId: number): void {
  const entrada = evento.target as HTMLInputElement;
  const archivo = entrada.files?.[0] ?? null;
  entrada.value = '';
  if (!archivo || this.subiendoComprobante()) return;
  const motivo = this.validarComprobante(archivo);
  if (motivo) {
    this.alertas.mostrar('error', motivo);
    return;
  }
  this.subiendoComprobante.set(true);
  this.api.adjuntarComprobante(matriculaId, archivo)
    .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.subiendoComprobante.set(false)))
    .subscribe({
      next: () => {
        this.alertas.mostrar('exito', 'Comprobante adjuntado.');
        this.api.obtenerDetalleAdministrativo(matriculaId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((respuesta) => this.detalle.set(respuesta));
      },
      error: (e) => this.alertas.mostrar('error', e.error?.message ?? 'No pudimos adjuntar el comprobante.'),
    });
}

protected verComprobante(matriculaId: number): void {
  const ventana = window.open('', '_blank');
  this.api.comprobante(matriculaId)
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        if (ventana) ventana.location.href = url;
        else window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => {
        ventana?.close();
        this.alertas.mostrar('error', 'No pudimos abrir el comprobante.');
      },
    });
}

protected async reenviarConfirmacion(d: MatriculaDetalleAdministrativa): Promise<void> {
  if (this.reenviando()) return;

  const confirmado = await this.confirmacion.preguntar({
    titulo: 'Reenviar confirmación',
    mensaje: `Se enviará de nuevo el correo de confirmación de la matrícula a ${d.correo}. ¿Deseas continuar?`,
    textoConfirmar: 'Sí, reenviar',
  });
  if (!confirmado) return;

  this.reenviando.set(true);
  this.api.reenviarConfirmacion(d.id)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.reenviando.set(false))
    )
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
