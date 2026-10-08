import { HttpErrorResponse } from '@angular/common/http';
import { NgClass } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, catchError, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { CursoApiService } from '../curso-api.service';
import {
  claseDisponibilidad,
  claseModalidad,
  etiquetaModalidad,
  formatearDuracion,
  formatearFecha,
  formatearFechaHora,
  formatearHora,
  formatearPrecio,
} from '../curso-formato.util';
import { FichaCursoDetalle, LeccionFicha, VistaPrevia } from '../curso.model';
import { Session } from '../../../core/session/session';
import { MatriculaApiService } from '../../matriculas/matricula-api.service';
import { AlertaGlobalService } from '../../../core/notificaciones/alerta-global.service';

const LARGO_MAXIMO_DESCRIPCION = 260;

type EstadoPantalla = 'cargando' | 'listo' | 'no-encontrada' | 'error';
type EstadoVistaPrevia = 'inactiva' | 'cargando' | 'lista' | 'error';

@Component({
  selector: 'app-ficha-curso',
  imports: [RouterLink, NgClass],
  templateUrl: './ficha-curso.html',
  styleUrl: './ficha-curso.scss',
})
export class FichaCurso implements OnInit {
  private readonly ruta = inject(ActivatedRoute);
  private readonly cursoApi = inject(CursoApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly session = inject(Session);
  private readonly router = inject(Router);
  private readonly matriculasApi = inject(MatriculaApiService);
  private readonly alertas = inject(AlertaGlobalService);

  protected readonly ficha = signal<FichaCursoDetalle | null>(null);
  protected readonly estado = signal<EstadoPantalla>('cargando');
  protected readonly descripcionExpandida = signal(false);
  protected readonly moduloExpandidoId = signal<number | null>(null);
  protected readonly leccionActivaId = signal<number | null>(null);
  protected readonly vistaPrevia = signal<VistaPrevia | null>(null);
  protected readonly vistaPreviaEstado = signal<EstadoVistaPrevia>('inactiva');
  protected readonly leccionBloqueadaId = signal<number | null>(null);

  private readonly reintentarBusqueda = new Subject<void>();
  private urlAmigableActual = '';

  protected readonly totalLecciones = computed(() =>
    (this.ficha()?.modulos ?? []).reduce((total, modulo) => total + modulo.lecciones.length, 0),
  );

  protected readonly necesitaLeerMas = computed(
    () => (this.ficha()?.descripcion?.length ?? 0) > LARGO_MAXIMO_DESCRIPCION,
  );

  protected readonly descripcionMostrada = computed(() => {
    const descripcion = this.ficha()?.descripcion ?? '';
    if (this.descripcionExpandida() || !this.necesitaLeerMas()) {
      return descripcion;
    }
    return `${descripcion.slice(0, LARGO_MAXIMO_DESCRIPCION).trimEnd()}…`;
  });

  protected readonly primeraLeccionVistaPrevia = computed(() =>
    (this.ficha()?.modulos ?? [])
      .flatMap((modulo) => modulo.lecciones)
      .find((leccion) => leccion.esVistaPrevia) ?? null,
  );

  protected readonly leccionActivaDatos = computed(() => {
    const id = this.leccionActivaId();
    if (id == null) return null;
    return (
      (this.ficha()?.modulos ?? [])
        .flatMap((modulo) => modulo.lecciones)
        .find((leccion) => leccion.leccionId === id) ?? null
    );
  });

  protected readonly sesionesEnVivo = computed(() =>
    (this.ficha()?.modulos ?? [])
      .flatMap((modulo) => modulo.lecciones)
      .filter((leccion) => leccion.tipo === 'EN_VIVO' && leccion.fechaHoraInicio)
      .sort((a, b) => a.fechaHoraInicio!.localeCompare(b.fechaHoraInicio!)),
  );

  protected readonly muestraCalendario = computed(
    () => this.ficha()?.modalidad !== 'VIRTUAL' && this.sesionesEnVivo().length > 0,
  );

  protected readonly alertaCurso = computed(() => {
    const ficha = this.ficha();
    if (!ficha) return null;
    if (ficha.modalidad === 'VIRTUAL') {
      return ficha.fechaInicio
        ? {
            titulo: `Inicia el ${formatearFecha(ficha.fechaInicio)}`,
            texto: 'Curso virtual: el contenido está disponible las 24 horas y se estudia a tu propio ritmo.',
          }
        : {
            titulo: 'Curso virtual, sin fecha de fin',
            texto: 'El contenido está disponible las 24 horas y se estudia a tu propio ritmo.',
          };
    }
    if (ficha.fechaInicio && ficha.fechaFin) {
      return {
        titulo: `Del ${formatearFecha(ficha.fechaInicio)} al ${formatearFecha(ficha.fechaFin)}`,
        texto: 'Revisa el temario y el calendario para conocer las fechas de tus sesiones.',
      };
    }
    return null;
  });

  ngOnInit(): void {
    this.ruta.paramMap
      .pipe(
        map((parametros) => parametros.get('urlAmigable') ?? ''),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((urlAmigable) => this.cargarFicha(urlAmigable));

    this.reintentarBusqueda
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargarFicha(this.urlAmigableActual));
  }

  protected reintentar(): void {
    this.reintentarBusqueda.next();
  }

  protected alternarDescripcion(): void {
    this.descripcionExpandida.set(!this.descripcionExpandida());
  }

  protected alternarModulo(moduloId: number): void {
    this.moduloExpandidoId.set(this.moduloExpandidoId() === moduloId ? null : moduloId);
  }

  protected seleccionarVistaPrevia(leccion: LeccionFicha): void {
    if (!leccion.esVistaPrevia) {
      this.leccionBloqueadaId.set(leccion.leccionId);
      return;
    }
    if (this.leccionActivaId() === leccion.leccionId) {
      return;
    }
    this.leccionBloqueadaId.set(null);
    this.cargarVistaPrevia(leccion.leccionId);
  }

  protected readonly etiquetaDisponibilidad = computed(() => {
    const estado = this.ficha()?.estadoComercial;
    if (!estado) return '';
    if (estado.codigo === 'UPCOMING' && estado.fechaInicio) {
      return `Inicia el ${formatearFecha(estado.fechaInicio)}`;
    }
    return estado.etiqueta;
  });

  protected claseModalidad(): string {
    return claseModalidad(this.ficha()?.modalidad ?? null);
  }

  protected etiquetaModalidad(): string {
    return etiquetaModalidad(this.ficha()?.modalidad ?? null);
  }

  protected claseDisponibilidad(): string {
    const estado = this.ficha()?.estadoComercial;
    return estado ? claseDisponibilidad(estado.codigo) : '';
  }

  protected formatearFecha(fecha: string): string {
    return formatearFecha(fecha);
  }

  protected formatearFechaHora(fechaHoraIso: string): string {
    return formatearFechaHora(fechaHoraIso);
  }

  protected formatearHora(fechaHoraIso: string): string {
    return formatearHora(fechaHoraIso);
  }

  protected formatearPrecio(monto: number): string {
    return formatearPrecio(monto);
  }

  protected formatearDuracion(segundos: number | null): string | null {
    return segundos == null ? null : formatearDuracion(segundos);
  }

  protected etiquetaTipoLeccion(tipo: LeccionFicha['tipo']): string {
    return tipo === 'EN_VIVO' ? 'En vivo' : 'Grabada';
  }

  protected etiquetaAccionComercial(): string {
    switch (this.ficha()?.estadoComercial.accion) {
      case 'ACCESS_FREE':
        return 'Acceder gratis';
      case 'PAY_NOW':
        return 'Pagar ahora';
      default:
        return '';
    }
  }

  protected alAccionComercial(): void {
    const curso = this.ficha();
    if (!curso) return;
    if (this.session.estaAutenticado() && curso.estadoComercial.accion === 'ACCESS_FREE') {
      this.matriculasApi.matricularGratis(curso.cursoId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (matricula) => {
          this.alertas.mostrar(matricula.estadoNotificacion === 'ERROR' ? 'error' : 'exito',
            matricula.estadoNotificacion === 'ERROR'
              ? 'La matrícula quedó registrada, pero no pudimos enviar el correo. Puedes reenviarlo desde Mis cursos.'
              : 'Tu matrícula fue registrada. Ya puedes verla en Mis cursos.');
          void this.router.navigate(['/app/panel']);
        },
        error: (error: HttpErrorResponse) =>
          this.alertas.mostrar('error', error.error?.message ?? 'No pudimos registrar la matricula.'),
      });
      return;
    }
    if (this.session.estaAutenticado()) {
      alert('La matrícula y el pago en línea estarán disponibles próximamente.');
      return;
    }
    void this.router.navigate(['/acceso'], {
      state: { mensajeInfo: 'Para continuar debes iniciar sesión.' },
    });
  }

  private cargarFicha(urlAmigable: string): void {
    if (!urlAmigable) {
      return;
    }
    this.urlAmigableActual = urlAmigable;
    this.estado.set('cargando');
    this.ficha.set(null);
    this.moduloExpandidoId.set(null);
    this.leccionActivaId.set(null);
    this.vistaPrevia.set(null);
    this.vistaPreviaEstado.set('inactiva');
    this.leccionBloqueadaId.set(null);
    this.descripcionExpandida.set(false);

    this.cursoApi
      .detalle(urlAmigable)
      .pipe(
        catchError((error: HttpErrorResponse) =>
          of<'no-encontrada' | 'error'>(error.status === 404 ? 'no-encontrada' : 'error'),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultado) => {
        if (typeof resultado === 'string') {
          this.estado.set(resultado);
          return;
        }
        this.ficha.set(resultado);
        this.estado.set('listo');

        const primerModulo = resultado.modulos[0];
        if (primerModulo) {
          this.moduloExpandidoId.set(primerModulo.moduloId);
        }
        const previa = this.primeraLeccionVistaPrevia();
        if (previa) {
          this.cargarVistaPrevia(previa.leccionId);
        }
      });
  }

  private cargarVistaPrevia(leccionId: number): void {
    this.leccionActivaId.set(leccionId);
    this.vistaPreviaEstado.set('cargando');
    this.vistaPrevia.set(null);

    this.cursoApi
      .vistaPrevia(this.urlAmigableActual, leccionId)
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultado) => {
        this.vistaPrevia.set(resultado);
        this.vistaPreviaEstado.set(resultado ? 'lista' : 'error');
      });
  }
}
