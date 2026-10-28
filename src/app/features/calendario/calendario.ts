import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AlertaGlobalService } from '../../core/notificaciones/alerta-global.service';
import { formatearFecha, formatearHora } from '../cursos/curso-formato.util';
import { EstadoSesion, SesionCalendarioRespuesta } from '../sesiones/sesion-alumno.model';
import { SesionAlumnoApiService } from '../sesiones/sesion-alumno-api.service';

/** Un día del calendario con sus sesiones, ya ordenadas. */
interface GrupoDiaSesiones {
  clave: string;
  etiqueta: string;
  sesiones: SesionCalendarioRespuesta[];
}

/** HU-026 — Participar en sesiones en vivo.
 *
 * Lista de próximas sesiones agrupadas por día, con navegación de mes
 * anterior/siguiente y botón "Hoy" (en vez de una grilla de calendario
 * completa: con pocas sesiones por mes, una grilla deja la mayoría de
 * casillas vacías y agrega complejidad sin aportar claridad). Vive dentro
 * de <app-layout-alumno>, por lo que no trae su propio header/footer. */
@Component({
  selector: 'app-calendario',
  imports: [],
  templateUrl: './calendario.html',
  styleUrl: './calendario.scss',
})
export class Calendario {
  private readonly api = inject(SesionAlumnoApiService);
  private readonly alertas = inject(AlertaGlobalService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly cargando = signal(true);
  protected readonly error = signal(false);
  protected readonly sesiones = signal<SesionCalendarioRespuesta[]>([]);
  protected readonly ingresando = signal<number | null>(null);
  protected readonly mesBase = signal<Date>(Calendario.primerDiaDe(new Date()));

  protected readonly formatearHora = formatearHora;

  protected readonly etiquetaMes = computed(() => {
    const texto = new Intl.DateTimeFormat('es-PE', {
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Lima',
    }).format(this.mesBase());
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  });

  protected readonly esMesActual = computed(() => {
    const base = this.mesBase();
    const hoy = Calendario.primerDiaDe(new Date());
    return base.getFullYear() === hoy.getFullYear() && base.getMonth() === hoy.getMonth();
  });

  protected readonly grupos = computed<GrupoDiaSesiones[]>(() => {
    const lista = [...this.sesiones()].sort((a, b) =>
      (a.fechaHoraInicio ?? '').localeCompare(b.fechaHoraInicio ?? ''),
    );
    const mapa = new Map<string, GrupoDiaSesiones>();
    for (const sesion of lista) {
      const clave = sesion.fechaHoraInicio ? this.claveDiaLima(sesion.fechaHoraInicio) : 'sin-fecha';
      let grupo = mapa.get(clave);
      if (!grupo) {
        grupo = {
          clave,
          etiqueta: clave === 'sin-fecha' ? 'Fecha por confirmar' : formatearFecha(clave),
          sesiones: [],
        };
        mapa.set(clave, grupo);
      }
      grupo.sesiones.push(sesion);
    }
    return Array.from(mapa.values());
  });

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    const { desde, hasta } = this.rangoMes();
    this.api.calendario(desde, hasta).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (lista) => {
        this.sesiones.set(lista);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set(true);
        this.cargando.set(false);
      },
    });
  }

  protected cambiarMes(delta: number): void {
    const base = this.mesBase();
    this.mesBase.set(new Date(base.getFullYear(), base.getMonth() + delta, 1, 12));
    this.cargar();
  }

  protected irAHoy(): void {
    this.mesBase.set(Calendario.primerDiaDe(new Date()));
    this.cargar();
  }

  protected ingresar(sesion: SesionCalendarioRespuesta): void {
    if (this.ingresando() !== null) return;
    this.ingresando.set(sesion.leccionId);
    this.api.ingresar(sesion.leccionId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (respuesta) => {
        this.ingresando.set(null);
        window.open(respuesta.enlaceReunion, '_blank');
        this.alertas.mostrar('exito', 'Asistencia registrada.');
        this.cargar();
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

  private rangoMes(): { desde: string; hasta: string } {
    const base = this.mesBase();
    const primerDia = new Date(base.getFullYear(), base.getMonth(), 1);
    const ultimoDia = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return { desde: Calendario.formatoFechaLocal(primerDia), hasta: Calendario.formatoFechaLocal(ultimoDia) };
  }

  /** Día calendario (yyyy-MM-dd) de un instante ISO, según la hora de Lima — evita que una
   * sesión cerca de la medianoche quede agrupada en el día equivocado por el huso del navegador. */
  private claveDiaLima(iso: string): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(iso));
  }

  private static primerDiaDe(fecha: Date): Date {
    return new Date(fecha.getFullYear(), fecha.getMonth(), 1, 12);
  }

  private static formatoFechaLocal(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
}
