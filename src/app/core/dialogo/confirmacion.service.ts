import { Injectable, signal } from '@angular/core';

export type VarianteConfirmacion = 'normal' | 'peligro';

export interface ConfirmacionOpciones {
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  /** 'peligro' resalta el botón de confirmar en rojo, para acciones irreversibles o de alto impacto. */
  variante?: VarianteConfirmacion;
}

interface SolicitudConfirmacion {
  titulo: string;
  mensaje: string;
  textoConfirmar: string;
  textoCancelar: string;
  variante: VarianteConfirmacion;
  resolver: (confirmado: boolean) => void;
}

/** Diálogo de confirmación reutilizable en toda la app: en vez de `confirm()` nativo del
 * navegador (sin estilo, bloqueante, no personalizable), cualquier componente inyecta este
 * servicio y hace `await this.confirmacion.preguntar({...})`. El diálogo real se renderiza una
 * sola vez en la raíz de la app ({@link ConfirmacionDialog}), así que no hay que montar nada por
 * cada módulo nuevo. */
@Injectable({ providedIn: 'root' })
export class ConfirmacionService {
  readonly solicitud = signal<SolicitudConfirmacion | null>(null);

  preguntar(opciones: ConfirmacionOpciones): Promise<boolean> {
    return new Promise((resolve) => {
      this.solicitud.set({
        titulo: opciones.titulo,
        mensaje: opciones.mensaje,
        textoConfirmar: opciones.textoConfirmar ?? 'Confirmar',
        textoCancelar: opciones.textoCancelar ?? 'Cancelar',
        variante: opciones.variante ?? 'normal',
        resolver: resolve,
      });
    });
  }

  responder(confirmado: boolean): void {
    this.solicitud()?.resolver(confirmado);
    this.solicitud.set(null);
  }
}
