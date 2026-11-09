import { Injectable } from '@angular/core';

export interface YtEventoEstado {
  data: number;
}

export interface YtJugador {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(segundos: number, permitirAvance: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getVolume(): number;
  setVolume(volumen: number): void;
  isMuted(): boolean;
  mute(): void;
  unMute(): void;
  getIframe(): HTMLIFrameElement;
  unloadModule?(modulo: string): void;
  cueVideoById(videoId: string): void;
  destroy(): void;
}

export interface YtOpciones {
  videoId: string;
  host: string;
  playerVars: Record<string, number | string>;
  events: {
    onReady?: () => void;
    onStateChange?: (evento: YtEventoEstado) => void;
    onError?: () => void;
  };
}

export interface YtEspacio {
  Player: new (elemento: HTMLElement, opciones: YtOpciones) => YtJugador;
}

interface VentanaYoutube {
  YT?: YtEspacio;
  onYouTubeIframeAPIReady?: () => void;
}

const URL_SCRIPT = 'https://www.youtube.com/iframe_api';

@Injectable({ providedIn: 'root' })
export class YoutubeApiService {
  private carga: Promise<YtEspacio> | null = null;

  cargar(): Promise<YtEspacio> {
    this.carga ??= new Promise<YtEspacio>((resolver, rechazar) => {
      const ventana = window as unknown as VentanaYoutube;
      if (ventana.YT?.Player) {
        resolver(ventana.YT);
        return;
      }

      const previo = ventana.onYouTubeIframeAPIReady;
      ventana.onYouTubeIframeAPIReady = () => {
        previo?.();
        if (ventana.YT?.Player) {
          resolver(ventana.YT);
        } else {
          this.carga = null;
          rechazar(new Error('La API de YouTube no está disponible'));
        }
      };

      const script = document.createElement('script');
      script.src = URL_SCRIPT;
      script.async = true;
      script.onerror = () => {
        this.carga = null;
        script.remove();
        rechazar(new Error('No se pudo cargar la API de YouTube'));
      };
      document.head.appendChild(script);
    });
    return this.carga;
  }
}
