import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-anillo-progreso',
  templateUrl: './anillo-progreso.html',
  styleUrl: './anillo-progreso.scss',
})
export class AnilloProgreso {
  readonly valor = input.required<number>();
  readonly texto = input<string | null>(null);
  readonly etiqueta = input<string>('');
  readonly tamano = input(120);
  readonly grosor = input(10);
  readonly tono = input<'claro' | 'oscuro'>('claro');
  readonly estado = input<'normal' | 'exito' | 'error'>('normal');
  readonly descripcion = input('Progreso');
  readonly animado = input(false);

  protected readonly radio = computed(() => (this.tamano() - this.grosor()) / 2);
  protected readonly circunferencia = computed(() => 2 * Math.PI * this.radio());
  protected readonly acotado = computed(() => Math.max(0, Math.min(100, this.valor())));
  protected readonly desplazamiento = computed(() => this.circunferencia() * (1 - this.acotado() / 100));
  protected readonly tamanoEtiqueta = computed(() => Math.max(11, this.tamano() * 0.1));
  protected readonly centroTexto = computed(() => this.texto() ?? `${Math.round(this.acotado())}%`);
}
