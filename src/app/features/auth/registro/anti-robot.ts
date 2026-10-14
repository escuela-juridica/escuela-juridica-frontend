import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnChanges, OnDestroy, inject, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AntiRobotApiService, DesafioAntiRobot } from './anti-robot-api.service';

@Component({
  selector: 'app-anti-robot',
  imports: [ReactiveFormsModule],
  template: `
    <fieldset [disabled]="disabled || ocupado()">
      <legend>Comprobación anti-robot</legend>
      <p id="antirobot-ayuda">Demostración académica: resuelve una suma para continuar.</p>
      @if (desafio(); as reto) {
        <label for="antirobot-respuesta">{{ reto.pregunta }}</label>
        <input
          id="antirobot-respuesta"
          type="text"
          inputmode="numeric"
          maxlength="2"
          autocomplete="off"
          [formControl]="respuesta"
          aria-describedby="antirobot-ayuda antirobot-estado"
          (keydown.enter)="$event.preventDefault(); $event.stopPropagation(); verificar()"
        />
        <button type="button" (click)="verificar()" [disabled]="respuesta.invalid">
          Comprobar respuesta
        </button>
      }
      <button type="button" (click)="crear()">
        {{ desafio() || completado() ? 'Solicitar otra comprobación' : 'No soy robot' }}
      </button>
    </fieldset>
    <p
      id="antirobot-estado"
      role="status"
      aria-live="polite"
      [class.antirobot-estado--exito]="completado()"
    >
      @if (completado()) {
        <span class="antirobot-estado__marca" aria-hidden="true">✓</span>
      }
      {{ mensaje() }}
    </p>
  `,
  styles: `
    :host {
      display: block;
      margin-block: 1rem;
    }
    fieldset {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 1rem;
    }
    legend,
    label {
      font-weight: 600;
    }
    p {
      font-size: 0.9rem;
      line-height: 1.5;
    }
    label {
      display: block;
      margin-bottom: 0.5rem;
    }
    input {
      width: 5rem;
      padding: 0.6rem;
      border: 1px solid #64748b;
      border-radius: 4px;
    }
    button {
      margin: 0.4rem;
      padding: 0.6rem;
      cursor: pointer;
    }
    button:disabled {
      cursor: wait;
    }
    input:focus-visible,
    button:focus-visible {
      outline: 3px solid #0369a1;
      outline-offset: 2px;
    }
    .antirobot-estado--exito {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      color: var(--exito, #027a48);
      background: var(--exito-fondo, #ecfdf3);
      border: 1px solid var(--exito-borde, #abefc6);
      border-radius: 6px;
      padding: 0.5rem 0.75rem;
      font-weight: 600;
    }
    .antirobot-estado__marca {
      display: inline-grid;
      place-items: center;
      width: 1.1rem;
      height: 1.1rem;
      border-radius: 999px;
      background: var(--exito, #027a48);
      color: #fff;
      font-size: 0.7rem;
      flex-shrink: 0;
    }
  `,
})
export class AntiRobot implements OnChanges, OnDestroy {
  @Input() disabled = false;
  @Input() reinicio = 0;
  readonly evidencia = output<string>();
  readonly desafio = signal<DesafioAntiRobot | null>(null);
  readonly ocupado = signal(false);
  readonly completado = signal(false);
  readonly mensaje = signal('');
  readonly respuesta = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{1,2}$/)],
  });
  private readonly api = inject(AntiRobotApiService);
  private peticion?: Subscription;
  private temporizador?: ReturnType<typeof setTimeout>;
  private ultimoReinicio = 0;

  ngOnChanges(): void {
    if (this.reinicio !== this.ultimoReinicio) {
      this.ultimoReinicio = this.reinicio;
      this.limpiar();
      this.mensaje.set('Completa nuevamente la comprobación antes de otro envío.');
    }
  }

  crear(): void {
    if (this.disabled || this.ocupado()) return;
    this.limpiar();
    this.ocupado.set(true);
    this.mensaje.set('Solicitando comprobación…');
    this.peticion = this.api.crear().subscribe({
      next: (reto) => {
        this.ocupado.set(false);
        this.desafio.set(reto);
        this.mensaje.set('Tienes dos minutos y hasta tres intentos para responder.');
        this.programarVencimiento(reto.vigenciaSegundos);
      },
      error: (error: HttpErrorResponse) => this.mostrarError(error),
    });
  }

  verificar(): void {
    const reto = this.desafio();
    if (this.disabled || this.ocupado() || !reto || this.respuesta.invalid) return;
    this.ocupado.set(true);
    this.mensaje.set('Comprobando respuesta…');
    this.peticion = this.api.verificar(reto.desafioId, Number(this.respuesta.value)).subscribe({
      next: (prueba) => {
        this.ocupado.set(false);
        this.desafio.set(null);
        this.completado.set(true);
        this.evidencia.emit(prueba.evidencia);
        this.mensaje.set(
          'Comprobación completada. Puedes enviar el formulario durante dos minutos.',
        );
        this.programarVencimiento(prueba.vigenciaSegundos);
      },
      error: (error: HttpErrorResponse) => this.mostrarError(error),
    });
  }

  private mostrarError(error: HttpErrorResponse): void {
    this.ocupado.set(false);
    this.evidencia.emit('');
    this.mensaje.set(
      error.status === 0
        ? 'No se pudo conectar con el backend. Comprueba que esté iniciado y vuelve a intentarlo.'
        : (error.error?.message ?? 'No se pudo completar la comprobación. Solicita otra.'),
    );
  }

  private programarVencimiento(segundos: number): void {
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => {
      this.limpiar();
      this.mensaje.set('La comprobación venció. Solicita otra para continuar.');
    }, segundos * 1000);
  }

  private limpiar(): void {
    this.peticion?.unsubscribe();
    clearTimeout(this.temporizador);
    this.desafio.set(null);
    this.completado.set(false);
    this.ocupado.set(false);
    this.respuesta.reset();
    this.evidencia.emit('');
  }

  ngOnDestroy(): void {
    this.peticion?.unsubscribe();
    clearTimeout(this.temporizador);
  }
}
