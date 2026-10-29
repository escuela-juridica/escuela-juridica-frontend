import { Component, DestroyRef, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/angular/daygrid';
import timeGridPlugin from '@fullcalendar/angular/timegrid';
import interactionPlugin from '@fullcalendar/angular/interaction';
import type { CalendarOptions, DatesSetInfo, EventClickInfo } from '@fullcalendar/angular';

import { Modal } from '../../shared/ui/modal/modal';
import { AlertaGlobalService } from '../../core/notificaciones/alerta-global.service';
import { formatearFecha, formatearHora } from '../cursos/curso-formato.util';
import { EstadoSesion, SesionCalendarioRespuesta } from '../sesiones/sesion-alumno.model';
import { SesionAlumnoApiService } from '../sesiones/sesion-alumno-api.service';

/** Un día de la vista Lista con sus sesiones, ya ordenadas. */
interface GrupoDiaSesiones {
  clave: string;
  etiqueta: string;
  sesiones: SesionCalendarioRespuesta[];
}

/** HU-026 — Participar en sesiones en vivo.
 *
 * Grilla mensual tipo Google Calendar (FullCalendar) en vez de la lista agrupada por día de la
 * primera ola: navegación prev/hoy/siguiente con los botones propios de ESEJUR (headerToolbar de
 * FullCalendar desactivado) y recarga de datos en cada `datesSet` (se dispara solo al montar y
 * en cada prev/next/today). Vive dentro de <app-layout-alumno>, por lo que no trae su propio
 * header/footer. */
@Component({
  selector: 'app-calendario',
  imports: [FullCalendarModule, Modal],
  templateUrl: './calendario.html',
  styleUrl: './calendario.scss',
})
export class Calendario {
  private readonly api = inject(SesionAlumnoApiService);
  private readonly alertas = inject(AlertaGlobalService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(FullCalendarComponent) private fc?: FullCalendarComponent;

  protected readonly cargando = signal(true);
  protected readonly error = signal(false);
  protected readonly sesiones = signal<SesionCalendarioRespuesta[]>([]);
  protected readonly sesionSeleccionada = signal<SesionCalendarioRespuesta | null>(null);
  protected readonly ingresando = signal<number | null>(null);
  protected readonly etiquetaMes = signal('');
  protected readonly esMesActual = signal(true);

  /** Guía §26: Mes y Lista son vistas alternas (nunca ambas a la vez). La Lista es la alternativa
   * obligatoria para móvil y accesibilidad, así que arranca así en pantallas angostas. */
  protected readonly vista = signal<'mes' | 'lista'>(
    typeof window !== 'undefined' && window.innerWidth <= 560 ? 'lista' : 'mes',
  );
  private readonly rangoMes = signal<{ inicio: Date; fin: Date } | null>(null);

  protected readonly grupos = computed<GrupoDiaSesiones[]>(() => {
    const rango = this.rangoMes();
    const delMes = this.sesiones()
      .filter((sesion) => sesion.fechaHoraInicio)
      .filter((sesion) => {
        if (!rango) return true;
        const inicio = new Date(sesion.fechaHoraInicio!);
        return inicio >= rango.inicio && inicio < rango.fin;
      })
      .sort((a, b) => a.fechaHoraInicio!.localeCompare(b.fechaHoraInicio!));
    const mapa = new Map<string, GrupoDiaSesiones>();
    for (const sesion of delMes) {
      const clave = this.claveDiaLima(sesion.fechaHoraInicio!);
      let grupo = mapa.get(clave);
      if (!grupo) {
        grupo = { clave, etiqueta: formatearFecha(clave), sesiones: [] };
        mapa.set(clave, grupo);
      }
      grupo.sesiones.push(sesion);
    }
    return Array.from(mapa.values());
  });

  protected readonly formatearHora = formatearHora;

  /** Pista discreta bajo la grilla: se muestra cada vez que el mes visible no tiene sesiones
   * (una grilla vacía ya comunica eso visualmente, pero un alumno de primera vez necesita saber
   * por qué está vacía). */
  protected readonly mostrarPistaVacio = computed(
    () => !this.cargando() && !this.error() && this.sesiones().length === 0,
  );

  /** Último rango pedido por FullCalendar (lo guarda `datesSet`); lo reutiliza "Reintentar" sin
   * tener que recalcular fechas a mano. */
  private ultimoRango: DatesSetInfo | null = null;

  protected readonly calendarOptions = signal<CalendarOptions>({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: false,
    locale: 'es',
    height: 'auto',
    firstDay: 1,
    fixedWeekCount: false,
    dayMaxEvents: 3,
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    events: [],
    datesSet: (arg: DatesSetInfo) => this.alCambiarRango(arg),
    eventClick: (arg: EventClickInfo) => this.alHacerClicEnEvento(arg),
    // El "today" resaltado y los chips de evento se marcan con clases propias de ESEJUR (ver
    // nota de diseño en calendario.scss): FullCalendar v7 ya no expone clases estables como
    // `.fc-day-today`/`.fc-event` para temizar sin un theme, así que usamos los hooks de ciclo de
    // vida `dayCellDidMount`/`eventDidMount`, que entregan el elemento real del DOM.
    dayCellDidMount: (arg) => {
      if (arg.isToday) arg.el.classList.add('calendario-dia-hoy');
      if (arg.isOther) arg.el.classList.add('calendario-dia-otro-mes');
    },
    eventDidMount: (arg) => {
      arg.el.classList.add('calendario-evento');
      const sesion = arg.event.extendedProps['sesion'] as SesionCalendarioRespuesta | undefined;
      if (sesion) {
        arg.el.title = `${sesion.cursoTitulo} · ${sesion.titulo}`;
      }
      if (sesion?.estadoSesion === 'CANCELADA') {
        arg.el.classList.add('calendario-evento--cancelado');
      }
    },
  });

  protected cambiarVista(vista: 'mes' | 'lista'): void {
    // La grilla se oculta (no se destruye) en la Lista, así que prev/next/hoy siguen cargando datos.
    this.vista.set(vista);
  }

  protected cambiarMes(delta: number): void {
    const api = this.fc?.getApi();
    if (!api) return;
    if (delta < 0) api.prev();
    else api.next();
  }

  protected irAHoy(): void {
    this.fc?.getApi().today();
  }

  protected reintentar(): void {
    if (this.ultimoRango) this.cargar(this.ultimoRango);
  }

  protected cerrarModal(): void {
    this.sesionSeleccionada.set(null);
  }

  protected ingresar(sesion: SesionCalendarioRespuesta): void {
    if (this.ingresando() !== null) return;
    this.ingresando.set(sesion.leccionId);
    this.api.ingresar(sesion.leccionId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (respuesta) => {
        this.ingresando.set(null);
        window.open(respuesta.enlaceReunion, '_blank');
        this.alertas.mostrar('exito', 'Asistencia registrada.');
        this.sesionSeleccionada.set(null);
        if (this.ultimoRango) this.cargar(this.ultimoRango);
      },
      error: () => {
        this.ingresando.set(null);
        this.alertas.mostrar(
          'error',
          'No pudimos registrar tu ingreso. Verifica que la sesión esté dentro de su horario.',
        );
      },
    });
  }

  protected etiquetaEstado(estado: EstadoSesion): string {
    switch (estado) {
      case 'FUTURA':
        return 'Próxima';
      case 'EN_VENTANA':
        return 'En vivo ahora';
      case 'REALIZADA':
        return 'Realizada';
      case 'CANCELADA':
        return 'Cancelada';
    }
  }

  protected claseEstado(estado: EstadoSesion): string {
    switch (estado) {
      case 'FUTURA':
        return 'badge--disp-proximo';
      case 'EN_VENTANA':
        return 'badge--disp-inmediato';
      case 'REALIZADA':
        return 'badge--disp-cerrado';
      case 'CANCELADA':
        return 'badge--disp-cancelado';
    }
  }

  /** Se dispara automáticamente al montar la grilla y en cada prev()/next()/today() de la API. */
  private alCambiarRango(arg: DatesSetInfo): void {
    this.ultimoRango = arg;
    this.rangoMes.set({ inicio: arg.view.currentStart, fin: arg.view.currentEnd });
    this.etiquetaMes.set(Calendario.capitalizar(arg.view.title));
    const hoy = new Date();
    this.esMesActual.set(hoy >= arg.view.currentStart && hoy < arg.view.currentEnd);
    this.cargar(arg);
  }

  private alHacerClicEnEvento(arg: EventClickInfo): void {
    const sesion = arg.event.extendedProps['sesion'] as SesionCalendarioRespuesta;
    this.sesionSeleccionada.set(sesion);
  }

  private cargar(arg: DatesSetInfo): void {
    this.cargando.set(true);
    this.error.set(false);
    const desde = Calendario.formatoFechaLocal(arg.start);
    const hasta = Calendario.formatoFechaLocal(arg.end);
    this.api.calendario(desde, hasta).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (lista) => {
        this.cargando.set(false);
        this.sesiones.set(lista);
        this.calendarOptions.update((opciones) => ({
          ...opciones,
          events: lista
            .filter((sesion) => sesion.fechaHoraInicio)
            .map((sesion) => {
              const colores = Calendario.coloresPorEstado(sesion.estadoSesion);
              return {
                id: String(sesion.leccionId),
                title: sesion.titulo,
                start: sesion.fechaHoraInicio!,
                end: sesion.fechaHoraFin ?? undefined,
                // v7 ya no tiene backgroundColor/borderColor/textColor por evento (ese trío es de
                // v5/v6): ahora es `color`/`contrastColor`, que FullCalendar expone como las
                // variables CSS --fc-event-color/--fc-event-contrast-color sobre el elemento del
                // evento — las consumimos en calendario.scss vía `.calendario-evento`.
                color: colores.fondo,
                contrastColor: colores.texto,
                extendedProps: { sesion },
              };
            }),
        }));
      },
      error: () => {
        this.cargando.set(false);
        this.error.set(true);
      },
    });
  }

  private static coloresPorEstado(estado: EstadoSesion): { fondo: string; texto: string } {
    switch (estado) {
      case 'FUTURA':
        return { fondo: 'var(--celeste-050)', texto: 'var(--celeste-700)' };
      case 'EN_VENTANA':
        return { fondo: 'var(--exito-fondo)', texto: 'var(--exito)' };
      case 'REALIZADA':
        return { fondo: 'var(--neutral-100)', texto: 'var(--neutral-600)' };
      case 'CANCELADA':
        return { fondo: 'var(--error-fondo)', texto: 'var(--error)' };
    }
  }

  /** Día calendario (yyyy-MM-dd) de un instante según la hora de Lima: una sesión cercana a la
   * medianoche no debe caer en el día equivocado por el huso del navegador. */
  private claveDiaLima(iso: string): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(iso));
  }

  private static capitalizar(texto: string): string {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  private static formatoFechaLocal(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
}
