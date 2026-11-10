import { AfterViewInit, Component, ElementRef, OnDestroy, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';

import { YoutubeApiService, YtJugador } from '../../../core/youtube/youtube-api.service';

const SALTO_SEGUNDOS = 10;
const INTERVALO_TIEMPO_MS = 500;
const OCULTAR_CONTROLES_MS = 3000;
const ESTADO_FINALIZADO = 0;
const ESTADO_REPRODUCIENDO = 1;

@Component({
  selector: 'app-youtube-reproductor',
  templateUrl: './youtube-reproductor.html',
  styleUrl: './youtube-reproductor.scss',
})
export class YoutubeReproductor implements AfterViewInit, OnDestroy {
  readonly videoId = input.required<string>();
  readonly titulo = input('Video de la lección');

  private readonly destino = viewChild.required<ElementRef<HTMLElement>>('destino');
  private readonly pantalla = viewChild.required<ElementRef<HTMLElement>>('pantalla');
  private readonly api = inject(YoutubeApiService);

  protected readonly reproduciendo = signal(false);
  protected readonly terminado = signal(false);
  protected readonly silenciado = signal(false);
  protected readonly volumen = signal(100);
  protected readonly actual = signal(0);
  protected readonly duracion = signal(0);
  protected readonly listo = signal(false);
  protected readonly fallo = signal(false);
  protected readonly actividad = signal(true);
  protected readonly arrastrando = signal(false);
  protected readonly porcentaje = computed(() => (this.duracion() > 0 ? Math.min(100, (this.actual() / this.duracion()) * 100) : 0));

  private jugador: YtJugador | null = null;
  private temporizador: ReturnType<typeof setInterval> | null = null;
  private temporizadorOcultar: ReturnType<typeof setTimeout> | null = null;
  private destruido = false;
  private videoMostrado: string | null = null;

  constructor() {
    effect(() => {
      const id = this.videoId();
      untracked(() => {
        if (this.jugador && id !== this.videoMostrado) {
          this.videoMostrado = id;
          this.jugador.cueVideoById(id);
          this.reproduciendo.set(false);
          this.terminado.set(false);
          this.actual.set(0);
        }
      });
    });
  }

  ngAfterViewInit(): void {
    void this.crearJugador();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.detenerTemporizador();
    this.cancelarOcultar();
    this.jugador?.destroy();
    this.jugador = null;
  }

  protected mostrarControles(): void {
    this.actividad.set(true);
    this.cancelarOcultar();
    if (this.reproduciendo()) {
      this.temporizadorOcultar = setTimeout(() => this.actividad.set(false), OCULTAR_CONTROLES_MS);
    }
  }

  protected alternar(): void {
    if (!this.jugador || !this.listo()) return;
    if (this.reproduciendo()) this.jugador.pauseVideo();
    else this.jugador.playVideo();
    this.mostrarControles();
  }

  protected repetir(): void {
    if (!this.jugador) return;
    this.jugador.seekTo(0, true);
    this.jugador.playVideo();
    this.terminado.set(false);
  }

  protected retroceder(): void {
    this.saltar(-SALTO_SEGUNDOS);
  }

  protected adelantar(): void {
    this.saltar(SALTO_SEGUNDOS);
  }

  protected arrastrar(valor: string): void {
    this.arrastrando.set(true);
    this.actual.set(Number(valor));
    this.mostrarControles();
  }

  protected buscar(valor: string): void {
    if (!this.jugador) return;
    const destino = Math.min(this.duracion(), Math.max(0, Number(valor)));
    this.jugador.seekTo(destino, true);
    this.actual.set(destino);
    this.arrastrando.set(false);
    this.terminado.set(false);
    this.mostrarControles();
  }

  protected cambiarVolumen(valor: string): void {
    if (!this.jugador) return;
    const volumen = Math.min(100, Math.max(0, Number(valor)));
    this.jugador.setVolume(volumen);
    this.volumen.set(volumen);
    if (volumen > 0 && this.jugador.isMuted()) this.jugador.unMute();
    this.silenciado.set(volumen === 0 || this.jugador.isMuted());
    this.mostrarControles();
  }

  protected alternarSilencio(): void {
    if (!this.jugador) return;
    if (this.jugador.isMuted() || this.volumen() === 0) {
      if (this.volumen() === 0) {
        this.jugador.setVolume(50);
        this.volumen.set(50);
      }
      this.jugador.unMute();
      this.silenciado.set(false);
    } else {
      this.jugador.mute();
      this.silenciado.set(true);
    }
    this.mostrarControles();
  }

  protected pantallaCompleta(): void {
    const elemento = this.pantalla().nativeElement;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void elemento.requestFullscreen?.();
  }

  protected tiempo(segundos: number): string {
    const total = Math.max(0, Math.floor(segundos));
    const horas = Math.floor(total / 3600);
    const minutos = Math.floor((total % 3600) / 60);
    const resto = String(total % 60).padStart(2, '0');
    return horas > 0 ? `${horas}:${String(minutos).padStart(2, '0')}:${resto}` : `${minutos}:${resto}`;
  }

  private saltar(delta: number): void {
    if (!this.jugador) return;
    const duracion = this.jugador.getDuration() || Number.MAX_SAFE_INTEGER;
    const destino = Math.min(duracion, Math.max(0, this.jugador.getCurrentTime() + delta));
    this.jugador.seekTo(destino, true);
    this.actual.set(destino);
    this.terminado.set(false);
    this.mostrarControles();
  }

  private async crearJugador(): Promise<void> {
    try {
      const yt = await this.api.cargar();
      if (this.destruido) return;
      this.videoMostrado = this.videoId();
      this.jugador = new yt.Player(this.destino().nativeElement, {
        videoId: this.videoId(),
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          iv_load_policy: 3,
          cc_load_policy: 0,
          hl: 'es',
          origin: window.location.origin,
        },
        events: {
          onReady: () => this.alEstarListo(),
          onStateChange: (evento) => this.alCambiarEstado(evento.data),
          onError: () => this.fallo.set(true),
        },
      });
    } catch {
      this.fallo.set(true);
    }
  }

  private alEstarListo(): void {
    if (!this.jugador) return;
    this.listo.set(true);
    this.jugador.unloadModule?.('captions');
    this.jugador.unloadModule?.('cc');
    this.duracion.set(this.jugador.getDuration());
    this.volumen.set(this.jugador.getVolume());
    this.silenciado.set(this.jugador.isMuted());
  }

  private alCambiarEstado(estado: number): void {
    const reproduciendo = estado === ESTADO_REPRODUCIENDO;
    this.reproduciendo.set(reproduciendo);
    this.terminado.set(estado === ESTADO_FINALIZADO);
    if (this.jugador) {
      this.duracion.set(this.jugador.getDuration());
      if (reproduciendo) this.jugador.unloadModule?.('captions');
    }
    if (reproduciendo) this.iniciarTemporizador();
    else this.detenerTemporizador();
    this.mostrarControles();
    if (estado === ESTADO_FINALIZADO && this.jugador) this.actual.set(this.jugador.getDuration());
  }

  private iniciarTemporizador(): void {
    this.detenerTemporizador();
    this.temporizador = setInterval(() => {
      if (this.jugador && !this.arrastrando()) this.actual.set(this.jugador.getCurrentTime());
    }, INTERVALO_TIEMPO_MS);
  }

  private detenerTemporizador(): void {
    if (this.temporizador) clearInterval(this.temporizador);
    this.temporizador = null;
  }

  private cancelarOcultar(): void {
    if (this.temporizadorOcultar) clearTimeout(this.temporizadorOcultar);
    this.temporizadorOcultar = null;
  }
}
