import { Injectable, signal } from '@angular/core';

export type TipoAlertaGlobal = 'exito' | 'error' | 'info';

export interface AlertaGlobal {
  tipo: TipoAlertaGlobal;
  texto: string;
}

/** Canal reutilizable para avisos de operaciones que afectan una lista o pestaña completa. */
@Injectable({ providedIn: 'root' })
export class AlertaGlobalService {
  readonly alerta = signal<AlertaGlobal | null>(null);
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  mostrar(tipo: TipoAlertaGlobal, texto: string): void {
    this.cerrar();
    this.alerta.set({ tipo, texto });
    this.temporizador = setTimeout(() => this.cerrar(), 5000);
  }

  cerrar(): void {
    if (this.temporizador !== null) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
    this.alerta.set(null);
  }
}
