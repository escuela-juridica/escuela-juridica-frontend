import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, Input, OnChanges, SimpleChanges, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { Modal } from '../../../../../shared/ui/modal/modal';
import { ConfirmacionService } from '../../../../../core/dialogo/confirmacion.service';
import { AlertaGlobalService } from '../../../../../core/notificaciones/alerta-global.service';
import { ExamenApiService } from '../../examenes/examen-api.service';
import {
  CrearExamenPeticion,
  CrearOpcionPeticion,
  CrearPreguntaPeticion,
  ExamenRespuesta,
  FinalidadExamen,
  MostrarRespuestas,
  PreguntaRespuesta,
  TipoExamen,
  TipoPregunta,
} from '../../examenes/examen.model';

interface OpcionForm {
  texto: string;
  esCorrecta: boolean;
}

/** HU-013 — Configurar exámenes: pestaña hija del editor de curso. Recibe el curso ya cargado
 * (modalidad y módulos disponibles) y administra exámenes/preguntas/alternativas por su cuenta. */
@Component({
  selector: 'app-examenes-tab',
  imports: [Modal],
  templateUrl: './examenes-tab.html',
  styleUrl: './examenes-tab.scss',
})
export class ExamenesTab implements OnChanges {
  @Input({ required: true }) cursoId!: number;
  @Input() modalidad: string | null = 'VIRTUAL';
  @Input() modulosDisponibles: { id: number; titulo: string }[] = [];
  @Input() estadoCodigo: string | null = null;

  private readonly api = inject(ExamenApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly detector = inject(ChangeDetectorRef);
  private readonly alertasGlobales = inject(AlertaGlobalService);
  private readonly confirmacion = inject(ConfirmacionService);

  protected readonly examenes = signal<ExamenRespuesta[]>([]);
  protected readonly cargando = signal(false);
  protected readonly cargado = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly mensaje = signal<{ tipo: 'error' | 'exito'; texto: string } | null>(null);
  private mensajeTimeout: ReturnType<typeof setTimeout> | null = null;
  protected readonly examenesExpandidos = signal<Set<number>>(new Set());
  protected readonly preguntasExpandidas = signal<Set<number>>(new Set());
  // Por defecto lo desactivado no aparece (igual que en Información Base); el interruptor lo
  // trae de vuelta cuando el admin necesita revisarlo o reactivarlo.
  protected readonly verInactivos = signal(false);
  protected readonly examenesVisibles = computed(() =>
    this.verInactivos() ? this.examenes() : this.examenes().filter((e) => e.activo));

  protected readonly esVirtual = () => this.modalidad === 'VIRTUAL';
  // HU-016: el borrado real solo existe mientras el curso sigue en BORRADOR.
  protected readonly puedeEliminar = () => this.estadoCodigo === 'BORRADOR';

  // -- Formulario de examen --
  protected readonly mostrarFormExamen = signal(false);
  protected readonly examenEditId = signal<number | null>(null);
  protected readonly examenTitulo = signal('');
  protected readonly examenDescripcion = signal('');
  protected readonly examenTipo = signal<TipoExamen>('CALIFICADO');
  protected readonly examenFinalidad = signal<FinalidadExamen>('MODULO');
  protected readonly examenModuloId = signal<number | null>(null);
  protected readonly examenMaximoIntentos = signal('');
  protected readonly examenTiempoLimite = signal('');
  protected readonly examenBarajarPreguntas = signal(false);
  protected readonly examenBarajarOpciones = signal(false);
  protected readonly examenMostrarRespuestas = signal<MostrarRespuestas>('AL_APROBAR');
  protected readonly examenFechaHabilitacion = signal('');
  protected readonly examenBloquea = signal(false);
  protected readonly examenDiasRevision = signal('3');
  protected readonly guardandoExamen = signal(false);
  protected readonly intentoGuardarExamen = signal(false);

  // -- Formulario de pregunta --
  protected readonly preguntaFormExamenId = signal<number | null>(null);
  protected readonly preguntaEditId = signal<number | null>(null);
  protected readonly preguntaTipo = signal<TipoPregunta>('SELECCION_UNICA');
  protected readonly preguntaEnunciado = signal('');
  protected readonly preguntaPuntaje = signal('1');
  protected readonly preguntaOpciones = signal<OpcionForm[]>([]);
  protected readonly guardandoPregunta = signal(false);
  protected readonly intentoGuardarPregunta = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    const cambioCurso = changes['cursoId'];
    if (cambioCurso && cambioCurso.currentValue !== cambioCurso.previousValue) {
      // La misma instancia puede recibir otro curso al navegar desde el editor.
      // Nunca se deben mostrar exámenes, preguntas o expansiones del curso anterior.
      this.examenes.set([]);
      this.examenesExpandidos.set(new Set());
      this.preguntasExpandidas.set(new Set());
      this.cargado.set(false);
      this.cargar();
    }
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api
      .listarPorCurso(this.cursoId)
      .pipe(
        finalize(() => {
          this.cargando.set(false);
          this.detector.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (examenes) => {
          this.examenes.set(examenes);
          this.cargado.set(true);
        },
        error: () => this.error.set('No pudimos cargar los exámenes del curso.'),
      });
  }

  protected examenExpandido(examenId: number): boolean {
    return this.examenesExpandidos().has(examenId);
  }

  protected alternarExamen(examenId: number): void {
    this.examenesExpandidos.update((set) => {
      const copia = new Set(set);
      copia.has(examenId) ? copia.delete(examenId) : copia.add(examenId);
      return copia;
    });
  }

  protected alternarExamenConTeclado(evento: Event, examenId: number): void {
    if (evento.target !== evento.currentTarget) {
      return;
    }
    evento.preventDefault();
    this.alternarExamen(examenId);
  }

  protected preguntaExpandida(preguntaId: number): boolean {
    return this.preguntasExpandidas().has(preguntaId);
  }

  protected alternarPregunta(preguntaId: number): void {
    this.preguntasExpandidas.update((set) => {
      const copia = new Set(set);
      copia.has(preguntaId) ? copia.delete(preguntaId) : copia.add(preguntaId);
      return copia;
    });
  }

  protected alternarPreguntaConTeclado(evento: Event, preguntaId: number): void {
    if (evento.target !== evento.currentTarget) {
      return;
    }
    evento.preventDefault();
    this.alternarPregunta(preguntaId);
  }

  protected etiquetaFinalidad(examen: ExamenRespuesta): string {
    return examen.finalidad === 'FINAL' ? 'Examen final' : `Módulo: ${examen.moduloTitulo ?? '—'}`;
  }

  protected etiquetaMostrarRespuestas(valor: MostrarRespuestas): string {
    switch (valor) {
      case 'AL_APROBAR': return 'Al aprobar';
      case 'AL_AGOTAR': return 'Al agotar intentos';
      case 'NUNCA': return 'Nunca';
    }
  }

  protected etiquetaTipoPregunta(tipo: TipoPregunta): string {
    switch (tipo) {
      case 'SELECCION_UNICA': return 'Selección única';
      case 'SELECCION_MULTIPLE': return 'Selección múltiple';
      case 'VERDADERO_FALSO': return 'Verdadero o falso';
      case 'RESPUESTA_ABIERTA': return 'Respuesta abierta';
    }
  }

  // ---------------------------------------------------------------- Examen --

  protected abrirCrearExamen(): void {
    this.cerrarMensaje();
    this.intentoGuardarExamen.set(false);
    this.examenEditId.set(null);
    this.examenTitulo.set('');
    this.examenDescripcion.set('');
    this.examenTipo.set('CALIFICADO');
    this.examenFinalidad.set(this.modulosDisponibles.length > 0 ? 'MODULO' : 'FINAL');
    this.examenModuloId.set(this.modulosDisponibles[0]?.id ?? null);
    this.examenMaximoIntentos.set('');
    this.examenTiempoLimite.set('');
    this.examenBarajarPreguntas.set(false);
    this.examenBarajarOpciones.set(false);
    this.examenMostrarRespuestas.set('AL_APROBAR');
    this.examenFechaHabilitacion.set('');
    this.examenBloquea.set(false);
    this.examenDiasRevision.set('3');
    this.mostrarFormExamen.set(true);
  }

  protected abrirEditarExamen(examen: ExamenRespuesta): void {
    this.cerrarMensaje();
    this.intentoGuardarExamen.set(false);
    this.examenEditId.set(examen.id);
    this.examenTitulo.set(examen.titulo);
    this.examenDescripcion.set(examen.descripcion ?? '');
    this.examenTipo.set(examen.tipo);
    this.examenFinalidad.set(examen.finalidad);
    this.examenModuloId.set(examen.moduloId);
    this.examenMaximoIntentos.set(examen.maximoIntentos != null ? String(examen.maximoIntentos) : '');
    this.examenTiempoLimite.set(examen.tiempoLimiteMinutos != null ? String(examen.tiempoLimiteMinutos) : '');
    this.examenBarajarPreguntas.set(examen.barajarPreguntas);
    this.examenBarajarOpciones.set(examen.barajarOpciones);
    this.examenMostrarRespuestas.set(examen.mostrarRespuestas);
    this.examenFechaHabilitacion.set(this.aDatetimeLocal(examen.fechaHabilitacion) ?? '');
    this.examenBloquea.set(examen.bloqueaSiguienteModulo);
    this.examenDiasRevision.set(String(examen.diasRevision));
    this.mostrarFormExamen.set(true);
  }

  protected cancelarFormExamen(): void {
    this.cerrarMensaje();
    this.mostrarFormExamen.set(false);
  }

  protected cambiarTipoExamenForm(tipo: TipoExamen): void {
    this.examenTipo.set(tipo);
    if (tipo === 'PRACTICA') {
      this.examenMaximoIntentos.set('');
      this.examenBloquea.set(false);
    }
  }

  protected cambiarFinalidadExamenForm(finalidad: FinalidadExamen): void {
    this.examenFinalidad.set(finalidad);
    if (finalidad === 'FINAL') {
      this.examenModuloId.set(null);
      this.examenBloquea.set(false);
    } else if (this.examenModuloId() === null) {
      this.examenModuloId.set(this.modulosDisponibles[0]?.id ?? null);
    }
  }

  protected guardarExamen(): void {
    const titulo = this.examenTitulo().trim();
    if (this.guardandoExamen()) {
      return;
    }
    this.intentoGuardarExamen.set(true);
    if (!titulo) {
      this.mostrarMensaje('error', 'Ingresa el título del examen.');
      return;
    }
    if (this.examenFinalidad() === 'MODULO' && this.examenModuloId() === null) {
      this.mostrarMensaje('error', 'Elige el módulo que evalúa este examen.');
      return;
    }
    const maximoIntentos = this.examenTipo() === 'PRACTICA' ? null : this.aEntero(this.examenMaximoIntentos());
    if (this.examenTipo() !== 'PRACTICA'
        && this.examenMaximoIntentos().trim()
        && (maximoIntentos === null || maximoIntentos < 1)) {
      this.mostrarMensaje('error', 'El máximo de intentos debe ser un número entero mayor que cero.');
      return;
    }
    const tiempoLimiteMinutos = this.aEntero(this.examenTiempoLimite());
    if (this.examenTiempoLimite().trim() && (tiempoLimiteMinutos === null || tiempoLimiteMinutos < 1)) {
      this.mostrarMensaje('error', 'El tiempo límite debe ser un número entero mayor que cero.');
      return;
    }
    const diasRevision = this.aEntero(this.examenDiasRevision());
    if (this.examenDiasRevision().trim() && (diasRevision === null || diasRevision < 1)) {
      this.mostrarMensaje('error', 'Los días de revisión deben ser un número entero mayor que cero.');
      return;
    }
    if (this.examenMostrarRespuestas() === 'AL_AGOTAR' && maximoIntentos === null) {
      this.mostrarMensaje('error', '"Mostrar al agotar intentos" exige fijar un máximo de intentos.');
      return;
    }

    this.guardandoExamen.set(true);
    const peticion: CrearExamenPeticion = {
      moduloId: this.examenFinalidad() === 'MODULO' ? this.examenModuloId() : null,
      titulo,
      descripcion: this.textoOpcional(this.examenDescripcion()),
      tipo: this.examenTipo(),
      finalidad: this.examenFinalidad(),
      maximoIntentos,
      tiempoLimiteMinutos,
      barajarPreguntas: this.examenBarajarPreguntas(),
      barajarOpciones: this.examenBarajarOpciones(),
      mostrarRespuestas: this.examenMostrarRespuestas(),
      fechaHabilitacion: this.esVirtual() ? null : this.aInstante(this.examenFechaHabilitacion() || null),
      bloqueaSiguienteModulo: this.examenFinalidad() === 'MODULO' && this.examenTipo() === 'CALIFICADO' && this.examenBloquea(),
      diasRevision: diasRevision ?? 3,
    };
    const editId = this.examenEditId();
    const llamada = editId
      ? this.api.actualizarExamen(editId, peticion)
      : this.api.crearExamen(this.cursoId, peticion);

    llamada
      .pipe(
        finalize(() => {
          this.guardandoExamen.set(false);
          this.detector.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (examen) => {
          if (editId) {
            this.examenes.update((lista) => lista.map((e) => (e.id === examen.id ? { ...e, ...examen, preguntas: e.preguntas } : e)));
          } else {
            this.examenes.update((lista) => [...lista, examen]);
          }
          this.mostrarFormExamen.set(false);
          this.alertasGlobales.mostrar('exito', editId ? 'Examen actualizado.' : 'Examen creado.');
        },
        error: (error: HttpErrorResponse) => {
          this.mostrarMensaje('error', this.mensajeError(error) ?? 'No pudimos guardar el examen.');
        },
      });
  }

  protected cambiarActivoExamen(examen: ExamenRespuesta): void {
    this.api
      .cambiarActivoExamen(examen.id, !examen.activo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (actualizado) => {
          this.examenes.update((lista) => lista.map((e) => (e.id === actualizado.id ? { ...e, ...actualizado, preguntas: e.preguntas } : e)));
          this.detector.markForCheck();
        },
        error: () => this.alertasGlobales.mostrar('error', 'No pudimos cambiar el estado del examen.'),
      });
  }

  protected async eliminarExamen(examen: ExamenRespuesta): Promise<void> {
    const confirmado = await this.confirmacion.preguntar({
      titulo: 'Eliminar examen',
      mensaje: `Se borrará "${examen.titulo}" con todas sus preguntas y alternativas. Esta acción no se puede deshacer. ¿Continuar?`,
      textoConfirmar: 'Eliminar examen',
      variante: 'peligro',
    });
    if (!confirmado) {
      return;
    }
    this.api
      .eliminarExamen(examen.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.examenes.update((lista) => lista.filter((e) => e.id !== examen.id));
          this.alertasGlobales.mostrar('exito', 'Examen eliminado.');
        },
        error: () => this.alertasGlobales.mostrar('error', 'No pudimos eliminar el examen.'),
      });
  }

  // La lista que se muestra puede estar filtrada (ocultando inactivos); el orden real que mueven
  // los botones ↑/↓ y que se envía al backend sigue siendo el del arreglo completo.
  protected preguntasVisibles(examen: ExamenRespuesta): PreguntaRespuesta[] {
    return this.verInactivos() ? examen.preguntas : examen.preguntas.filter((p) => p.activo);
  }

  protected indiceRealExamen(examen: ExamenRespuesta): number {
    return this.examenes().findIndex((e) => e.id === examen.id);
  }

  protected indiceRealPregunta(examen: ExamenRespuesta, pregunta: PreguntaRespuesta): number {
    return examen.preguntas.findIndex((p) => p.id === pregunta.id);
  }

  protected moverExamen(indice: number, direccion: -1 | 1): void {
    const lista = this.examenes();
    const destino = indice + direccion;
    if (destino < 0 || destino >= lista.length) {
      return;
    }
    const copia = [...lista];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    this.examenes.set(copia);
    this.api
      .reordenarExamenes(this.cursoId, { ids: copia.map((e) => e.id) })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (examenes) => this.examenes.set(examenes),
        error: () => {
          this.alertasGlobales.mostrar('error', 'No pudimos reordenar los exámenes.');
          this.cargar();
        },
      });
  }

  // ---------------------------------------------------------------- Pregunta --

  protected abrirCrearPregunta(examenId: number): void {
    this.cerrarMensaje();
    this.intentoGuardarPregunta.set(false);
    this.preguntaEditId.set(null);
    this.preguntaTipo.set('SELECCION_UNICA');
    this.preguntaEnunciado.set('');
    this.preguntaPuntaje.set('1');
    this.preguntaOpciones.set([{ texto: '', esCorrecta: false }, { texto: '', esCorrecta: false }]);
    this.preguntaFormExamenId.set(examenId);
  }

  protected abrirEditarPregunta(examenId: number, pregunta: PreguntaRespuesta): void {
    this.cerrarMensaje();
    this.intentoGuardarPregunta.set(false);
    this.preguntaEditId.set(pregunta.id);
    this.preguntaTipo.set(pregunta.tipo);
    this.preguntaEnunciado.set(pregunta.enunciado);
    this.preguntaPuntaje.set(String(pregunta.puntaje));
    this.preguntaOpciones.set(pregunta.opciones.map((o) => ({ texto: o.texto, esCorrecta: o.esCorrecta })));
    this.preguntaFormExamenId.set(examenId);
  }

  protected cancelarFormPregunta(): void {
    this.cerrarMensaje();
    this.preguntaFormExamenId.set(null);
  }

  protected cambiarTipoPreguntaForm(tipo: TipoPregunta): void {
    this.preguntaTipo.set(tipo);
    if (tipo === 'RESPUESTA_ABIERTA') {
      this.preguntaOpciones.set([]);
    } else if (tipo === 'VERDADERO_FALSO') {
      this.preguntaOpciones.set([{ texto: 'Verdadero', esCorrecta: false }, { texto: 'Falso', esCorrecta: false }]);
    } else if (this.preguntaOpciones().length < 2) {
      this.preguntaOpciones.set([{ texto: '', esCorrecta: false }, { texto: '', esCorrecta: false }]);
    }
  }

  protected agregarOpcion(): void {
    this.preguntaOpciones.update((lista) => [...lista, { texto: '', esCorrecta: false }]);
  }

  protected quitarOpcion(indice: number): void {
    this.preguntaOpciones.update((lista) => lista.filter((_, i) => i !== indice));
  }

  protected actualizarTextoOpcion(indice: number, texto: string): void {
    this.preguntaOpciones.update((lista) => lista.map((o, i) => (i === indice ? { ...o, texto } : o)));
  }

  protected marcarOpcionUnica(indice: number): void {
    this.preguntaOpciones.update((lista) => lista.map((o, i) => ({ ...o, esCorrecta: i === indice })));
  }

  protected alternarOpcionMultiple(indice: number): void {
    this.preguntaOpciones.update((lista) => lista.map((o, i) => (i === indice ? { ...o, esCorrecta: !o.esCorrecta } : o)));
  }

  protected guardarPregunta(): void {
    const examenId = this.preguntaFormExamenId();
    const enunciado = this.preguntaEnunciado().trim();
    const puntaje = this.aDecimal(this.preguntaPuntaje());
    if (examenId === null || this.guardandoPregunta()) {
      return;
    }
    this.intentoGuardarPregunta.set(true);
    if (!enunciado) {
      this.mostrarMensaje('error', 'Ingresa el enunciado de la pregunta.');
      return;
    }
    if (!puntaje || puntaje <= 0) {
      this.mostrarMensaje('error', 'El puntaje debe ser mayor que cero.');
      return;
    }
    const tipo = this.preguntaTipo();
    const opciones = this.preguntaOpciones();
    if (tipo !== 'RESPUESTA_ABIERTA') {
      if (opciones.some((o) => !o.texto.trim())) {
        this.mostrarMensaje('error', 'Completa el texto de todas las alternativas.');
        return;
      }
      const correctas = opciones.filter((o) => o.esCorrecta).length;
      if (tipo === 'SELECCION_UNICA' && correctas !== 1) {
        this.mostrarMensaje('error', 'Marca exactamente una alternativa correcta.');
        return;
      }
      if (tipo === 'SELECCION_MULTIPLE' && correctas < 1) {
        this.mostrarMensaje('error', 'Marca al menos una alternativa correcta.');
        return;
      }
      if (tipo === 'VERDADERO_FALSO' && correctas !== 1) {
        this.mostrarMensaje('error', 'Elige cuál alternativa es la correcta.');
        return;
      }
    }

    this.guardandoPregunta.set(true);
    const opcionesPeticion: CrearOpcionPeticion[] = tipo === 'RESPUESTA_ABIERTA'
      ? []
      : opciones.map((o) => ({ texto: o.texto.trim(), esCorrecta: o.esCorrecta }));
    const peticion: CrearPreguntaPeticion = { tipo, enunciado, puntaje, opciones: opcionesPeticion };
    const editId = this.preguntaEditId();
    const llamada = editId
      ? this.api.actualizarPregunta(editId, peticion)
      : this.api.crearPregunta(examenId, peticion);

    llamada
      .pipe(
        finalize(() => {
          this.guardandoPregunta.set(false);
          this.detector.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (pregunta) => {
          this.actualizarPreguntaEnEstado(examenId, pregunta, !editId);
          this.preguntaFormExamenId.set(null);
          this.alertasGlobales.mostrar('exito', editId ? 'Pregunta actualizada.' : 'Pregunta creada.');
        },
        error: (error: HttpErrorResponse) => {
          this.mostrarMensaje('error', this.mensajeError(error) ?? 'No pudimos guardar la pregunta.');
        },
      });
  }

  protected cambiarActivoPregunta(examenId: number, pregunta: PreguntaRespuesta): void {
    this.api
      .cambiarActivoPregunta(pregunta.id, !pregunta.activo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (actualizada) => {
          this.actualizarPreguntaEnEstado(examenId, actualizada, false);
          this.detector.markForCheck();
        },
        error: () => this.alertasGlobales.mostrar('error', 'No pudimos cambiar el estado de la pregunta.'),
      });
  }

  protected async eliminarPregunta(examenId: number, pregunta: PreguntaRespuesta): Promise<void> {
    const confirmado = await this.confirmacion.preguntar({
      titulo: 'Eliminar pregunta',
      mensaje: 'Se borrará la pregunta con todas sus alternativas. Esta acción no se puede deshacer. ¿Continuar?',
      textoConfirmar: 'Eliminar pregunta',
      variante: 'peligro',
    });
    if (!confirmado) {
      return;
    }
    this.api
      .eliminarPregunta(pregunta.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.examenes.update((lista) =>
            lista.map((e) => (e.id === examenId ? { ...e, preguntas: e.preguntas.filter((p) => p.id !== pregunta.id) } : e)));
          this.alertasGlobales.mostrar('exito', 'Pregunta eliminada.');
        },
        error: () => this.alertasGlobales.mostrar('error', 'No pudimos eliminar la pregunta.'),
      });
  }

  protected moverPregunta(examenId: number, indice: number, direccion: -1 | 1): void {
    const examen = this.examenes().find((e) => e.id === examenId);
    if (!examen) {
      return;
    }
    const destino = indice + direccion;
    if (destino < 0 || destino >= examen.preguntas.length) {
      return;
    }
    const copia = [...examen.preguntas];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    this.examenes.update((lista) => lista.map((e) => (e.id === examenId ? { ...e, preguntas: copia } : e)));
    this.api
      .reordenarPreguntas(examenId, { ids: copia.map((p) => p.id) })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (preguntas) => this.examenes.update((lista) => lista.map((e) => (e.id === examenId ? { ...e, preguntas } : e))),
        error: () => {
          this.alertasGlobales.mostrar('error', 'No pudimos reordenar las preguntas.');
          this.cargar();
        },
      });
  }

  private actualizarPreguntaEnEstado(examenId: number, pregunta: PreguntaRespuesta, esNueva: boolean): void {
    this.examenes.update((lista) =>
      lista.map((e) => {
        if (e.id !== examenId) {
          return e;
        }
        if (esNueva) {
          return { ...e, preguntas: [...e.preguntas, pregunta] };
        }
        return { ...e, preguntas: e.preguntas.map((p) => (p.id === pregunta.id ? pregunta : p)) };
      }),
    );
  }

  protected cerrarMensaje(): void {
    this.limpiarTimeoutMensaje();
    this.mensaje.set(null);
  }

  private mostrarMensaje(tipo: 'error' | 'exito', texto: string): void {
    this.limpiarTimeoutMensaje();
    this.mensaje.set({ tipo, texto });
    this.mensajeTimeout = setTimeout(() => {
      this.mensaje.set(null);
      this.mensajeTimeout = null;
      this.detector.markForCheck();
    }, 5000);
  }

  private limpiarTimeoutMensaje(): void {
    if (this.mensajeTimeout !== null) {
      clearTimeout(this.mensajeTimeout);
      this.mensajeTimeout = null;
    }
  }

  private mensajeError(error: HttpErrorResponse): string | null {
    const cuerpo = typeof error.error === 'object' && error.error !== null ? (error.error as { message?: string }) : null;
    return cuerpo?.message ?? null;
  }

  private textoOpcional(valor: string): string | null {
    const limpio = valor.trim();
    return limpio.length > 0 ? limpio : null;
  }

  private aEntero(valor: string): number | null {
    const limpio = valor.trim();
    if (!limpio || !/^-?\d+$/.test(limpio)) {
      return null;
    }
    const n = Number(limpio);
    return Number.isSafeInteger(n) ? n : null;
  }

  private aDecimal(valor: string): number | null {
    const limpio = valor.trim().replace(',', '.');
    if (!limpio) {
      return null;
    }
    const n = Number(limpio);
    return Number.isFinite(n) ? n : null;
  }

  private aInstante(valor: string | null): string | null {
    if (!valor) {
      return null;
    }
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
  }

  private aDatetimeLocal(valor: string | null): string | null {
    if (!valor) {
      return null;
    }
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) {
      return null;
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`;
  }
}
