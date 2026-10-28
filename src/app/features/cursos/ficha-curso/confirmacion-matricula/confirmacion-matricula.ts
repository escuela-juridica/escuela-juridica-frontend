import { Component, input, output } from '@angular/core';
import { formatearFecha, formatearPrecio } from '../../curso-formato.util';
import { FichaCursoDetalle } from '../../curso.model';
import { Modal } from '../../../../shared/ui/modal/modal';

/** Resumen previo a la matrícula: el alumno revisa curso, importe y acceso antes de confirmar. */
@Component({
  selector: 'app-confirmacion-matricula',
  imports: [Modal],
  templateUrl: './confirmacion-matricula.html',
  styleUrl: './confirmacion-matricula.scss',
})
export class ConfirmacionMatricula {
  readonly curso = input.required<FichaCursoDetalle>();
  readonly etiquetaModalidad = input.required<string>();
  readonly totalLecciones = input.required<number>();
  readonly gratuita = input.required<boolean>();
  readonly procesando = input(false);
  readonly error = input('');

  readonly cancelar = output<void>();
  readonly confirmar = output<void>();

  protected formatearPrecio(monto: number): string {
    return formatearPrecio(monto);
  }

  protected formatearFecha(fecha: string): string {
    return formatearFecha(fecha);
  }
}
