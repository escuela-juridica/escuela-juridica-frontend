import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, distinctUntilChanged, forkJoin, map, of } from 'rxjs';

import { ConfirmacionService } from '../../core/dialogo/confirmacion.service';
import { AlertaGlobalService } from '../../core/notificaciones/alerta-global.service';
import { AnilloProgreso } from '../../shared/ui/anillo-progreso/anillo-progreso';
import { Modal } from '../../shared/ui/modal/modal';
import { AulaSesionService } from '../aula/aula-sesion.service';
import { formatearDiaMes, formatearFechaHoraCorta, formatearFechaLarga } from '../cursos/curso-formato.util';
import { ExamenApiService } from './examen-api.service';
import { ExamenFichaCabecera } from './ficha-cabecera/examen-ficha-cabecera';
import { EstadoGuardado, ExamenNavegador } from './navegador/examen-navegador';
import { ExamenFicha, Intento, IntentoResumen, PreguntaIntento } from './examen.model';

interface RespuestaLocal {
  opciones: number[];
  texto: string;
}

const ESPERA_GUARDADO_TEXTO_MS = 700;
const REINTENTOS_CIERRE = 6;
const ESPERA_REINTENTO_CIERRE_MS = 1000;

@Component({
  selector: 'app-examen-pantalla',
  imports: [RouterLink, DecimalPipe, NgTemplateOutlet, Modal, AnilloProgreso, ExamenFichaCabecera, ExamenNavegador],
  templateUrl: './examen-pantalla.html',
  styleUrl: './examen-pantalla.scss',
})
export class ExamenPantalla {
  private readonly ruta = inject(ActivatedRoute);
  private readonly api = inject(ExamenApiService);
  private readonly alertas = inject(AlertaGlobalService);
  private readonly confirmacion = inject(ConfirmacionService);
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
  protected readonly mostrarFaltantes = signal(false);
  private readonly local = signal<ReadonlyMap<number, RespuestaLocal>>(new Map());

  private examenId: number | null = null;
  private desfaseRelojMs = 0;
  private temporizador: ReturnType<typeof setInterval> | null = null;
  private reintentoCierre: ReturnType<typeof setTimeout> | null = null;
  private readonly sucias = new Set<number>();
  private readonly esperas = new Map<number, ReturnType<typeof setTimeout>>();

  protected readonly vista = computed<'cargando' | 'error' | 'ficha' | 'rindiendo' | 'resultado'>(() => {
    if (this.cargando()) return 'cargando';
    if (this.error()) return 'error';
    const intento = this.intento();
    if (intento) return intento.estado === 'EN_PROGRESO' ? 'rindiendo' : 'resultado';
    return 'ficha';
  });

  protected readonly esSecuencial = computed(() => this.intento()?.modoNavegacion === 'SECUENCIAL');

  protected readonly permiteOmitir = computed(() => this.intento()?.permiteOmitirPreguntas ?? false);

  protected readonly puedeAvanzar = computed(() => {
    const pregunta = this.preguntaActual();
    return this.permiteOmitir() || (pregunta !== null && this.estaRespondida(pregunta));
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

  protected readonly abiertasRevisadas = computed(() =>
    (this.intento()?.preguntas ?? []).filter((p) => p.tipo === 'RESPUESTA_ABIERTA' && p.estadoRevision === 'REVISADA'),
  );

  protected readonly sinResponder = computed(() => (this.intento()?.preguntas ?? []).filter((p) => !this.estaRespondida(p)));


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
    this.mostrarFaltantes.set(false);
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

  private abrirIntento(intento: Intento): void {
    const mapa = new Map<number, RespuestaLocal>();
    for (const p of intento.preguntas) {
      mapa.set(p.id, { opciones: [...p.seleccionadas], texto: p.texto ?? '' });
    }
    this.local.set(mapa);
    this.indice.set(this.indiceInicial(intento));
    this.mostrarFaltantes.set(false);
    this.guardado.set('idle');
    this.sucias.clear();
    this.intento.set(intento);
    this.iniciarTemporizador(intento);
    window.scrollTo({ top: 0 });
  }

  protected irA(i: number): void {
    const intento = this.intento();
    if (!intento || intento.modoNavegacion === 'SECUENCIAL') return;
    if (i < 0 || i >= intento.preguntas.length) return;
    this.indice.set(i);
    const id = intento.preguntas[i].id;
    setTimeout(() => document.getElementById(`pregunta-card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  protected siguiente(): void {
    const intento = this.intento();
    if (!intento || !this.puedeAvanzar()) return;
    const proximo = Math.min(this.indice() + 1, intento.preguntas.length - 1);
    this.indice.set(proximo);
    this.guardarIndice(intento.id, proximo);
    window.scrollTo({ top: 0 });
  }

  protected revisarYEnviar(): void {
    const intento = this.intento();
    if (!intento) return;
    const faltantes = this.sinResponder();
    if (!this.permiteOmitir() && faltantes.length > 0) {
      this.mostrarFaltantes.set(true);
      if (intento.modoNavegacion !== 'SECUENCIAL') this.irA(faltantes[0].posicion - 1);
      return;
    }
    this.abrirConfirmacion();
  }

  protected esFaltante(p: PreguntaIntento): boolean {
    return this.mostrarFaltantes() && !this.estaRespondida(p);
  }

  confirmarSalida(): boolean | Promise<boolean> {
    if (this.vista() !== 'rindiendo' || this.enviando()) return true;
    const conTiempo = this.segundos() !== null;
    return this.confirmacion.preguntar({
      titulo: '¿Salir del examen?',
      mensaje: conTiempo
        ? 'Si sales, el tiempo seguirá corriendo y el examen se enviará solo cuando llegue a cero. Tus respuestas ya están guardadas.'
        : 'Si sales, tu intento seguirá abierto con las respuestas que ya guardaste. Podrás continuarlo cuando quieras.',
      textoConfirmar: 'Salir del examen',
      textoCancelar: 'Seguir en el examen',
      variante: 'peligro',
    });
  }

  @HostListener('window:beforeunload', ['$event'])
  protected avisarAntesDeCerrar(evento: BeforeUnloadEvent): void {
    if (this.vista() !== 'rindiendo' || this.enviando()) return;
    evento.preventDefault();
    evento.returnValue = '';
  }

  protected abrirConfirmacion(): void {
    this.confirmando.set(true);
  }

  protected cancelarConfirmacion(): void {
    this.confirmando.set(false);
  }

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
    try {
      localStorage.removeItem(`esejur.examen.indice.${resultado.id}`);
    } catch {
    }
    this.aula.refrescar();
    window.scrollTo({ top: 0 });
  }

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
          if (e.status === 400) this.sincronizarCierre(intento.id);
        },
      });
  }

  private cuerpo(preguntaId: number): { opcionesIds: number[]; texto: string | null } {
    const r = this.local().get(preguntaId) ?? { opciones: [], texto: '' };
    return { opcionesIds: r.opciones, texto: r.texto.trim() ? r.texto : null };
  }

  private iniciarTemporizador(intento: Intento): void {
    this.detenerTemporizador();
    if (!intento.expiraEn) {
      this.segundos.set(null);
      return;
    }
    const expiraMs = Date.parse(intento.expiraEn);
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
    if (this.reintentoCierre) clearTimeout(this.reintentoCierre);
    this.reintentoCierre = null;
  }

  private sincronizarCierre(intentoId: number, intentosRestantes = REINTENTOS_CIERRE): void {
    this.esperas.forEach((t) => clearTimeout(t));
    this.esperas.clear();
    this.confirmando.set(false);
    this.api
      .intento(intentoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultado) => {
          if (resultado.estado === 'EN_PROGRESO') {
            this.reintentarCierre(intentoId, intentosRestantes);
            return;
          }
          this.cerradoPorTiempoAviso.set(true);
          this.mostrarResultado(resultado);
        },
        error: () => {
          this.guardado.set('error');
          this.reintentarCierre(intentoId, intentosRestantes);
        },
      });
  }

  private reintentarCierre(intentoId: number, intentosRestantes: number): void {
    if (intentosRestantes <= 0) {
      this.cerradoPorTiempoAviso.set(true);
      this.enviar();
      return;
    }
    this.reintentoCierre = setTimeout(() => this.sincronizarCierre(intentoId, intentosRestantes - 1), ESPERA_REINTENTO_CIERRE_MS);
  }

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

  private fallar(e: HttpErrorResponse, porDefecto: string): void {
    this.error.set(this.mensaje(e) ?? porDefecto);
    this.cargando.set(false);
  }

  private mensaje(e: HttpErrorResponse): string | null {
    const cuerpo = typeof e.error === 'object' && e.error !== null ? (e.error as { message?: string }) : null;
    return cuerpo?.message ?? null;
  }

  private indiceInicial(intento: Intento): number {
    if (intento.modoNavegacion !== 'SECUENCIAL') return 0;
    const total = intento.preguntas.length;
    const primeraSinResponder = intento.preguntas.findIndex((p) => !p.respondida);
    const base = primeraSinResponder === -1 ? total - 1 : primeraSinResponder;
    return Math.min(total - 1, Math.max(this.leerIndice(intento.id), base));
  }

  private leerIndice(intentoId: number): number {
    try {
      const crudo = localStorage.getItem(`esejur.examen.indice.${intentoId}`);
      const valor = crudo === null ? 0 : Number(crudo);
      return Number.isFinite(valor) && valor >= 0 ? valor : 0;
    } catch {
      return 0;
    }
  }

  private guardarIndice(intentoId: number, indice: number): void {
    try {
      localStorage.setItem(`esejur.examen.indice.${intentoId}`, String(indice));
    } catch {
    }
  }
}
