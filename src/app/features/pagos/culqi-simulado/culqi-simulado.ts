import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Modal } from '../../../shared/ui/modal/modal';
import { formatearPrecio } from '../../cursos/curso-formato.util';
import { PagoCheckout } from '../pago.model';

interface Escenario {
  codigo: string;
  etiqueta: string;
  detalle: string;
}

/**
 * HU-047 — Checkout de Culqi SIMULADO: reproduce los resultados de las tarjetas y el celular de prueba de Culqi
 * para desarrollo y demostración. No procesa dinero ni pide datos reales; entrega al servidor un "token" de
 * escenario. Con Culqi real se usa su propio checkout y este componente no aparece.
 */
@Component({
  selector: 'app-culqi-simulado',
  imports: [Modal, FormsModule],
  templateUrl: './culqi-simulado.html',
  styleUrl: './culqi-simulado.scss',
})
export class CulqiSimulado {
  readonly pago = input.required<PagoCheckout>();
  readonly tokenCreado = output<string>();
  readonly cerrar = output<void>();

  protected readonly medio = signal<'TARJETA' | 'YAPE' | 'PLIN'>('TARJETA');
  protected scenario = 'APROBADO_TARJETA';
  protected readonly formatearPrecio = formatearPrecio;

  protected readonly tarjetas: Escenario[] = [
    { codigo: 'APROBADO_TARJETA', etiqueta: 'Visa 4111 1111 1111 1111', detalle: 'Compra aprobada' },
    { codigo: 'RECHAZADO_FONDOS', etiqueta: 'Visa 4000 0400 0000 0008', detalle: 'Rechazada: fondos insuficientes' },
    { codigo: 'RECHAZADO_ROBADA', etiqueta: 'Visa 4000 0200 0000 0000', detalle: 'Rechazada: tarjeta reportada' },
    { codigo: 'ERROR_PROCESO', etiqueta: 'Diners 3600 0100 0000 0007', detalle: 'Error de procesamiento' },
  ];

  protected pagar(): void {
    switch (this.medio()) {
      case 'TARJETA':
        this.tokenCreado.emit(`sim_tok_${this.scenario}`);
        break;
      case 'YAPE':
        this.tokenCreado.emit('sim_tok_APROBADO_YAPE');
        break;
      default:
        // Plin y otras billeteras: Culqi crea la orden y avisa el resultado después.
        this.tokenCreado.emit('sim_tok_PENDIENTE');
    }
  }
}
