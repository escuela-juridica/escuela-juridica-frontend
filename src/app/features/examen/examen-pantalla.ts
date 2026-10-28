import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, distinctUntilChanged, forkJoin, map, of } from 'rxjs';

import { AlertaGlobalService } from '../../core/notificaciones/alerta-global.service';
import { AnilloProgreso } from '../../shared/ui/anillo-progreso/anillo-progreso';
import { Modal } from '../../shared/ui/modal/modal';
import { AulaSesionService } from '../aula/aula-sesion.service';
import { formatearDiaMes, formatearFechaHoraCorta, formatearFechaLarga } from '../cursos/curso-formato.util';
import { ExamenApiService } from './examen-api.service';
import { ExamenFichaCabecera } from './ficha-cabecera/examen-ficha-cabecera';
import { EstadoGuardado, ExamenNavegador } from './navegador/examen-navegador';
import { ExamenFicha, Intento, IntentoResumen, PreguntaIntento } from './examen.model';

/** Lo que el alumno lleva escrito/marcado en una pregunta (se sincroniza con el servidor al vuelo). */
interface RespuestaLocal {
  opciones: number[];
  texto: string;
}

const ESPERA_GUARDADO_TEXTO_MS = 700;

/**
 * HU-028 / HU-029 — Rendir un examen dentro del aula: ficha (reglas, intentos), intento con
 * temporizador y navegación entre preguntas, revisión antes de enviar y resultado. El tiempo y la
 * nota los decide el servidor; el navegador solo muestra la cuenta regresiva y guarda cada
 * respuesta al cambiarla, de modo que cerrar la pestaña o perder conexión no pierde lo respondido.
 */
@Component({
  selector: 'app-examen-pantalla',
  imports: [RouterLink, DecimalPipe, Modal, AnilloProgreso, ExamenFichaCabecera, ExamenNavegador],
  templateUrl: './examen-pantalla.html',
  styleUrl: './examen-pantalla.scss',
})
export class ExamenPantalla {
  private readonly ruta = inject(ActivatedRoute);
  private readonly api = inject(ExamenApiService);
  private readonly alertas = inject(AlertaGlobalService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly aula = inject(AulaSesionService);

  protected readonly formatearFechaLarga = formatearFechaLarga;
  protected readonly formatearFechaHoraCorta = formatearFechaHoraCorta;
  protected readonly formatearDiaMes = formatearDiaMes;

  protected readonly ficha = signal<ExamenFicha | null>(null);
  protected readonly intento = signal<Intento | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly iniciando = signal(false);
  protected readonly enviando = signal(false);
  protected readonly confirmando = signal(false);
  protected readonly cerradoPorTiempoAviso = signal(false);
  protected readonly indice = signal(0);
  protected readonly guardado = signal<EstadoGuardado>('idle');
  protected readonly segundos = signal<number | null>(null);
  protected readonly marcadas = signal<ReadonlySet<number>>(new Set());
  private readonly local = signal<ReadonlyMap<number, RespuestaLocal>>(new Map());

  private examenId: number | null = null;
  private desfaseRelojMs = 0;
  private temporizador: ReturnType<typeof setInterval> | null = null;
  private readonly sucias = new Set<number>();
  private readonly esperas = new Map<number, ReturnType<typeof setTimeout>>();

  protected readonly vista = computed<'cargando' | 'error' | 'ficha' | 'rindiendo' | 'resultado'>(() => {
    if (this.cargando()) return 'cargando';
    if (this.error()) return 'error';
    const intento = this.intento();
    if (intento) return intento.estado === 'EN_PROGRESO' ? 'rindiendo' : 'resultado';
    return 'ficha';
  });

  protected readonly preguntaActual = computed<PreguntaIntento | null>(
    () => this.intento()?.preguntas[this.indice()] ?? null,
  );

  protected readonly respondidas = computed<ReadonlySet<number>>(
    () => new Set((this.intento()?.preguntas ?? []).filter((p) => this.estaRespondida(p)).map((p) => p.id)),
  );

  protected readonly totalRespondidas = computed(
    () => (this.intento()?.preguntas ?? []).filter((p) => this.estaRespondida(p)).length,
  );

  /** Respuestas abiertas ya calificadas por un revisor (puntaje y observación): el alumno siempre las ve. */
  protected readonly abiertasRevisadas = computed(() =>
    (this.intento()?.preguntas ?? []).filter((p) => p.tipo === 'RESPUESTA_ABIERTA' && p.estadoRevision === 'REVISADA'),
  );

  protected readonly sinResponder = computed(() => (this.intento()?.preguntas ?? []).filter((p) => !this.estaRespondida(p)));

  protected readonly marcadasLista = computed(() => (this.intento()?.preguntas ?? []).filter((p) => this.marcadas().has(p.id)));

  protected readonly poco = computed(() => {
    const s = this.segundos();
    return s !== null && s <= 300;
  });

  protected readonly tiempoFormateado = computed(() => {
    const s = this.segundos();
    if (s === null) return '';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
  });

  constructor() {
    this.ruta.paramMap
      .pipe(
        map((p) => Number(p.get('examenId'))),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((id) => {
        this.examenId = id;
        this.reiniciar();
        this.cargarFicha();
      });

    this.destroyRef.onDestroy(() => {
      this.detenerTemporizador();
      this.esperas.forEach((t) => clearTimeout(t));
    });
  }

  // ------------------------------------------------------------------ carga --

  private reiniciar(): void {
    this.detenerTemporizador();
    this.intento.set(null);
    this.ficha.set(null);
    this.error.set(null);
    this.confirmando.set(false);
    this.cerradoPorTiempoAviso.set(false);
    this.guardado.set('idle');
    this.indice.set(0);
    this.sucias.clear();
    window.scrollTo({ top: 0 });
  }

  protected cargarFicha(): void {
    if (this.examenId == null) return;
    this.cargando.set(true);
    this.api
      .ficha(this.examenId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ficha) => {
          this.ficha.set(ficha);
          this.cargando.set(false);
        },
        error: (e: HttpErrorResponse) => this.fallar(e, 'No pudimos abrir el examen.'),
      });
  }

  protected volverALaFicha(): void {
    this.detenerTemporizador();
    this.intento.set(null);
    this.cerradoPorTiempoAviso.set(false);
    this.cargarFicha();
    window.scrollTo({ top: 0 });
  }

  // ----------------------------------------------------------------- acciones --

  protected iniciar(): void {
    if (this.examenId == null || this.iniciando()) return;
    this.iniciando.set(true);
    this.api
      .iniciar(this.examenId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (intento) => {
          this.iniciando.set(false);
          this.abrirIntento(intento);
        },
        error: (e: HttpErrorResponse) => {
          this.iniciando.set(false);
          this.alertas.mostrar('error', this.mensaje(e) ?? 'No pudimos iniciar el intento.');
          this.cargarFicha();
        },
      });
  }

  protected verIntento(resumen: IntentoResumen): void {
    this.cargando.set(true);
    this.api
      .intento(resumen.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (intento) => {
          this.cargando.set(false);
          if (intento.estado === 'EN_PROGRESO') {
            this.abrirIntento(intento);
          } else {
            this.intento.set(intento);
            window.scrollTo({ top: 0 });
          }
        },
        error: (e: HttpErrorResponse) => this.fallar(e, 'No pudimos abrir el intento.'),
      });
  }

  /** Prepara el estado local de un intento en curso: respuestas guardadas, marcas y cuenta regresiva. */
  private abrirIntento(intento: Intento): void {
    const mapa = new Map<number, RespuestaLocal>();
    for (const p of intento.preguntas) {
      mapa.set(p.id, { opciones: [...p.seleccionadas], texto: p.texto ?? '' });
    }
    this.local.set(mapa);
    this.marcadas.set(this.leerMarcas(intento.id));
    this.indice.set(0);
    this.guardado.set('idle');
    this.sucias.clear();
    this.intento.set(intento);
    this.iniciarTemporizador(intento);
    window.scrollTo({ top: 0 });
  }

  protected irA(i: number): void {
    const total = this.intento()?.preguntas.length ?? 0;
    if (i < 0 || i >= total) return;
    this.indice.set(i);
  }

  protected abrirConfirmacion(): void {
    this.confirmando.set(true);
  }

  protected cancelarConfirmacion(): void {
    this.confirmando.set(false);
  }

  /** Confirma el envío: antes sincroniza cualquier respuesta que no se haya podido guardar. */
  protected enviar(): void {
    const intento = this.intento();
    if (!intento || this.enviando()) return;
    this.enviando.set(true);
    this.esperas.forEach((t) => clearTimeout(t));
    this.esperas.clear();
    const pendientes = [...this.sucias].map((id) => this.api.guardarRespuesta(intento.id, id, this.cuerpo(id)));
    const sincronizacion: Observable<unknown> = pendientes.length ? forkJoin(pendientes) : of(null);
    sincronizacion
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.enviarYMostrar(intento.id),
        // Si el tiempo ya venció el servidor lo envió solo: igual se muestra el resultado real.
        error: () => this.enviarYMostrar(intento.id),
      });
  }

  private enviarYMostrar(intentoId: number): void {
    this.api
      .enviar(intentoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultado) => this.mostrarResultado(resultado),
        error: (e: HttpErrorResponse) => {
          this.enviando.set(false);
          this.confirmando.set(false);
          this.alertas.mostrar('error', this.mensaje(e) ?? 'No pudimos enviar el intento. Inténtalo de nuevo.');
        },
      });
  }

  private mostrarResultado(resultado: Intento): void {
    this.detenerTemporizador();
    this.enviando.set(false);
    this.confirmando.set(false);
    this.sucias.clear();
    this.intento.set(resultado);
    this.borrarMarcas(resultado.id);
    // El avance del curso (exámenes, bloqueos del temario) cambió: se refresca el estado compartido.
    this.aula.refrescar();
    window.scrollTo({ top: 0 });
  }

  // ---------------------------------------------------------------- respuestas --

  protected estaRespondida(p: PreguntaIntento): boolean {
    const r = this.local().get(p.id);
    if (!r) return p.respondida;
    return p.tipo === 'RESPUESTA_ABIERTA' ? r.texto.trim().length > 0 : r.opciones.length > 0;
  }

  protected opcionMarcada(p: PreguntaIntento, opcionId: number): boolean {
    return this.local().get(p.id)?.opciones.includes(opcionId) ?? false;
  }

  protected textoDe(p: PreguntaIntento): string {
    return this.local().get(p.id)?.texto ?? '';
  }

  protected elegirOpcion(p: PreguntaIntento, opcionId: number): void {
    const actual = this.local().get(p.id) ?? { opciones: [], texto: '' };
    let opciones: number[];
    if (p.tipo === 'SELECCION_MULTIPLE') {
      opciones = actual.opciones.includes(opcionId)
        ? actual.opciones.filter((id) => id !== opcionId)
        : [...actual.opciones, opcionId];
    } else {
      opciones = [opcionId];
    }
    this.actualizarLocal(p.id, { ...actual, opciones });
    this.guardarYa(p.id);
  }

  protected escribir(p: PreguntaIntento, texto: string): void {
    const actual = this.local().get(p.id) ?? { opciones: [], texto: '' };
    this.actualizarLocal(p.id, { ...actual, texto });
    this.programarGuardado(p.id);
  }

  protected limpiarRespuesta(p: PreguntaIntento): void {
    this.actualizarLocal(p.id, { opciones: [], texto: '' });
    this.guardarYa(p.id);
  }

  protected alternarMarca(p: PreguntaIntento): void {
    const intento = this.intento();
    if (!intento) return;
    const siguiente = new Set(this.marcadas());
    if (siguiente.has(p.id)) siguiente.delete(p.id);
    else siguiente.add(p.id);
    this.marcadas.set(siguiente);
    this.guardarMarcas(intento.id, siguiente);
  }

  private actualizarLocal(preguntaId: number, valor: RespuestaLocal): void {
    const copia = new Map(this.local());
    copia.set(preguntaId, valor);
    this.local.set(copia);
    this.sucias.add(preguntaId);
  }

  private programarGuardado(preguntaId: number): void {
    const previa = this.esperas.get(preguntaId);
    if (previa) clearTimeout(previa);
    this.guardado.set('guardando');
    this.esperas.set(preguntaId, setTimeout(() => this.guardarYa(preguntaId), ESPERA_GUARDADO_TEXTO_MS));
  }

  private guardarYa(preguntaId: number): void {
    const intento = this.intento();
    if (!intento || intento.estado !== 'EN_PROGRESO') return;
    const previa = this.esperas.get(preguntaId);
    if (previa) clearTimeout(previa);
    this.esperas.delete(preguntaId);
    this.guardado.set('guardando');
    this.api
      .guardarRespuesta(intento.id, preguntaId, this.cuerpo(preguntaId))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.sucias.delete(preguntaId);
          if (this.esperas.size === 0) this.guardado.set('ok');
        },
        error: (e: HttpErrorResponse) => {
          this.guardado.set('error');
          // Un 400 significa que el intento ya se cerró (tiempo agotado): se consulta el resultado real.
          if (e.status === 400) this.sincronizarCierre(intento.id);
        },
      });
  }

  private cuerpo(preguntaId: number): { opcionesIds: number[]; texto: string | null } {
    const r = this.local().get(preguntaId) ?? { opciones: [], texto: '' };
    return { opcionesIds: r.opciones, texto: r.texto.trim() ? r.texto : null };
  }

  // -------------------------------------------------------------- temporizador --

  private iniciarTemporizador(intento: Intento): void {
    this.detenerTemporizador();
    if (!intento.expiraEn) {
      this.segundos.set(null);
      return;
    }
    const expiraMs = Date.parse(intento.expiraEn);
    // El reloj del servidor manda: se corrige la diferencia con el del navegador.
    this.desfaseRelojMs = Date.parse(intento.ahora) - Date.now();
    const tic = () => {
      const restantes = Math.max(0, Math.floor((expiraMs - (Date.now() + this.desfaseRelojMs)) / 1000));
      this.segundos.set(restantes);
      if (restantes === 0) {
        this.detenerTemporizador();
        this.sincronizarCierre(intento.id);
      }
    };
    tic();
    this.temporizador = setInterval(tic, 1000);
  }

  private detenerTemporizador(): void {
    if (this.temporizador) clearInterval(this.temporizador);
    this.temporizador = null;
  }

  /** El tiempo se agotó: el servidor ya (o enseguida) envió el intento con lo guardado; se muestra su resultado. */
  private sincronizarCierre(intentoId: number): void {
    this.esperas.forEach((t) => clearTimeout(t));
    this.esperas.clear();
    this.confirmando.set(false);
    this.api
      .intento(intentoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultado) => {
          if (resultado.estado === 'EN_PROGRESO') return;
          this.cerradoPorTiempoAviso.set(true);
          this.mostrarResultado(resultado);
        },
        error: () => this.guardado.set('error'),
      });
  }

  // ------------------------------------------------------------- presentación --

  protected etiquetaTipoPregunta(tipo: PreguntaIntento['tipo']): string {
    switch (tipo) {
      case 'SELECCION_UNICA': return 'Selecciona una alternativa';
      case 'SELECCION_MULTIPLE': return 'Selecciona todas las alternativas correctas';
      case 'VERDADERO_FALSO': return 'Verdadero o falso';
      default: return 'Respuesta abierta';
    }
  }

  protected etiquetaMostrar(m: ExamenFicha['mostrarRespuestas']): string {
    switch (m) {
      case 'AL_APROBAR': return 'Al aprobar el examen';
      case 'AL_AGOTAR': return 'Al agotar tus intentos';
      default: return 'No se muestran';
    }
  }

  protected claseEstadoIntento(i: IntentoResumen): string {
    if (i.estado === 'PENDIENTE_REVISION') return 'badge--disp-proximo';
    if (i.estado === 'EN_PROGRESO') return 'badge--disp-proximo';
    return i.aprobado ? 'badge--disp-inmediato' : 'badge--disp-cancelado';
  }

  protected etiquetaEstadoIntento(i: IntentoResumen): string {
    if (i.estado === 'PENDIENTE_REVISION') return 'En revisión';
    if (i.estado === 'EN_PROGRESO') return 'En curso';
    return i.aprobado ? 'Aprobado' : 'No aprobado';
  }

  protected fueElegida(p: PreguntaIntento, opcionId: number): boolean {
    return p.seleccionadas.includes(opcionId);
  }

  // ------------------------------------------------------------------ helpers --

  private fallar(e: HttpErrorResponse, porDefecto: string): void {
    this.error.set(this.mensaje(e) ?? porDefecto);
    this.cargando.set(false);
  }

  private mensaje(e: HttpErrorResponse): string | null {
    const cuerpo = typeof e.error === 'object' && e.error !== null ? (e.error as { message?: string }) : null;
    return cuerpo?.message ?? null;
  }

  private leerMarcas(intentoId: number): Set<number> {
    try {
      const crudo = localStorage.getItem(`esejur.examen.marcadas.${intentoId}`);
      return new Set<number>(crudo ? (JSON.parse(crudo) as number[]) : []);
    } catch {
      return new Set<number>();
    }
  }

  private guardarMarcas(intentoId: number, marcas: ReadonlySet<number>): void {
    try {
      localStorage.setItem(`esejur.examen.marcadas.${intentoId}`, JSON.stringify([...marcas]));
    } catch {
      /* las marcas son una comodidad: sin almacenamiento simplemente no persisten */
    }
  }

  private borrarMarcas(intentoId: number): void {
    try {
      localStorage.removeItem(`esejur.examen.marcadas.${intentoId}`);
    } catch {
      /* ver guardarMarcas */
    }
  }
}
