import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { Session } from '../../../core/session/session';
import { MatriculaApiService } from '../../matriculas/matricula-api.service';
import { EstadoCertificadoCurso } from '../../matriculas/matricula.model';
import { TablaPaginacion } from '../../../shared/ui/tabla-paginacion/tabla-paginacion';
import { AlertaGlobalService } from '../../../core/notificaciones/alerta-global.service';
import { urlPortadaCurso } from '../../cursos/curso-formato.util';

const TAMANO_PAGINA = 10;
const ESPERA_BUSQUEDA_MS = 350;

const ETIQUETAS_INGRESO: Record<string, string> = {
  GRATUITA: 'Gratuita',
  ADMINISTRADOR: 'Asignación manual',
  REGISTRADO_MANUAL: 'Pago manual registrado',
  PAGO_EN_LINEA: 'Pago en línea',
  EXONERADA: 'Exonerada',
  EXONERADO: 'Exonerada',
};

type Pestana = 'EN_PROGRESO' | 'COMPLETADOS';

interface CursoActivo {
  id: number;
  matriculaId: number;
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
  fechaInicio: string | null;
  estadoNotificacion: string | null;
  pagoPendiente: boolean;
  cursoCancelado: boolean;
  urlAmigable: string;
  certificado: EstadoCertificadoCurso;
}

@Component({
  selector: 'app-panel',
  imports: [RouterLink, DatePipe, TablaPaginacion],
  templateUrl: './panel.html',
  styleUrl: './panel.scss',
})
export class Panel {
  private readonly session = inject(Session);
  private readonly matriculasApi = inject(MatriculaApiService);
  private readonly alertas = inject(AlertaGlobalService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly consulta$ = new Subject<void>();
  private readonly texto$ = new Subject<string>();

  readonly usuario = this.session.usuario;
  readonly cursosActivos = signal<CursoActivo[]>([]);
  readonly cargando = signal(true);
  readonly actualizando = signal(false);
  readonly error = signal(false);
  readonly reenviando = signal<number | null>(null);
  readonly pestana = signal<Pestana>('EN_PROGRESO');
  readonly texto = signal('');
  readonly termino = signal('');
  readonly pagina = signal(0);
  readonly total = signal(0);
  readonly enProgreso = signal(0);
  readonly completados = signal(0);
  protected readonly tamano = TAMANO_PAGINA;

  constructor() {
    this.consulta$
      .pipe(
        switchMap(() => {
          this.actualizando.set(true);
          return this.matriculasApi
            .panelCursos(this.pestana(), this.termino(), this.pagina(), TAMANO_PAGINA)
            .pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((respuesta) => {
        this.actualizando.set(false);
        this.cargando.set(false);
        if (!respuesta) {
          this.error.set(true);
          return;
        }
        this.error.set(false);
        this.enProgreso.set(respuesta.enProgreso);
        this.completados.set(respuesta.completados);
        this.total.set(respuesta.cursos.totalElements);
        this.cursosActivos.set(
          respuesta.cursos.items.map(({ matricula, certificado }) => ({
            id: matricula.cursoId,
            matriculaId: matricula.id,
            imagenUrl: urlPortadaCurso(matricula.imagenPortadaUrl),
            tipo: matricula.modalidad,
            categoria: ETIQUETAS_INGRESO[matricula.formaIngreso] ?? matricula.formaIngreso,
            nombre: matricula.cursoTitulo,
            porcentajeProgreso: matricula.porcentajeProgreso,
            leccionesCompletadas: matricula.leccionesCompletadas,
            totalLecciones: matricula.totalLecciones,
            siguienteLeccionNombre: matricula.accesoEfectivo ? matricula.siguienteLeccion : matricula.mensajeAcceso,
            fechaFinalizacion: matricula.fechaFinalizacion,
            accesoEfectivo: matricula.accesoEfectivo,
            fechaInicio: matricula.fechaInicio,
            estadoNotificacion: matricula.estadoNotificacion,
            pagoPendiente: matricula.estado === 'PENDIENTE_PAGO',
            cursoCancelado: matricula.cursoCancelado,
            urlAmigable: matricula.cursoUrlAmigable,
            certificado,
          })),
        );
      });

    this.texto$
      .pipe(debounceTime(ESPERA_BUSQUEDA_MS), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((texto) => {
        this.termino.set(texto.trim());
        this.pagina.set(0);
        this.cargar();
      });

    this.cargar();
  }

  protected get primerNombre(): string {
    return this.usuario()?.nombreCompleto?.trim().split(/\s+/)[0] ?? '';
  }

  protected get hayCursos(): boolean {
    return this.enProgreso() + this.completados() > 0;
  }

  protected cargar(): void {
    this.consulta$.next();
  }

  protected escribir(valor: string): void {
    this.texto.set(valor);
    this.texto$.next(valor);
  }

  protected limpiarBusqueda(): void {
    this.texto.set('');
    this.termino.set('');
    this.texto$.next('');
    this.pagina.set(0);
    this.cargar();
  }

  protected irAPagina(pagina: number): void {
    if (pagina < 0 || pagina === this.pagina()) return;
    this.pagina.set(pagina);
    this.cargar();
    document.querySelector('.panel-seccion-cabecera')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected reenviarConfirmacion(matriculaId: number): void {
    this.reenviando.set(matriculaId);
    this.matriculasApi.reenviarConfirmacion(matriculaId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (resultado) => {
        this.reenviando.set(null);
        this.alertas.mostrar(resultado.enviado ? 'exito' : 'error', resultado.mensaje);
        if (resultado.enviado) this.cargar();
      },
      error: () => {
        this.reenviando.set(null);
        this.alertas.mostrar('error', 'No pudimos reenviar la confirmación.');
      },
    });
  }

  protected seleccionarPestana(pestana: Pestana): void {
    if (pestana === this.pestana()) return;
    this.pestana.set(pestana);
    this.pagina.set(0);
    this.cargar();
  }
}
