import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Observable,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  forkJoin,
  of,
  switchMap,
} from 'rxjs';

import { InformacionBaseApiService } from '../../informacion-base/informacion-base-api.service';
import {
  CategoriaRespuesta,
  DocenteRespuesta,
  EntidadRespuesta,
  FirmanteRespuesta,
  TipoCursoRespuesta,
} from '../../informacion-base/informacion-base.model';
import { CursoAdminApiService } from '../curso-admin-api.service';
import { CursoEditorRespuesta, ModalidadCurso, TipoVentaCurso } from '../curso-admin.model';

type PestanaEditor = 'informacion' | 'contenido' | 'sesiones' | 'examenes' | 'certificacion' | 'publicacion';
type CampoInformacion = 'titulo' | 'fechaInicio' | 'fechaFin' | 'precioRegular' | 'cupoMaximo' | 'vigenciaAccesoDias';

interface ErrorApiAdmin {
  code?: string;
  message?: string;
}

/** HU-010 — Editor del curso (ADM-PF-014). Solo la pestaña "Información" está implementada; el
 * resto (Contenido HU-011, Sesiones HU-012, Exámenes HU-013, Certificación HU-014, Publicación
 * HU-015) se completa en sus propias historias. Información, docentes y firmantes se guardan
 * juntos con un único botón, aunque internamente llamen a tres endpoints distintos. */
@Component({
  selector: 'app-curso-editor',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './curso-editor.html',
  styleUrl: './curso-editor.scss',
})
export class CursoEditor implements OnInit {
  private readonly api = inject(CursoAdminApiService);
  private readonly infoBaseApi = inject(InformacionBaseApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly detector = inject(ChangeDetectorRef);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly pestanas: { id: PestanaEditor; etiqueta: string }[] = [
    { id: 'informacion', etiqueta: 'Información' },
    { id: 'contenido', etiqueta: 'Contenido' },
    { id: 'sesiones', etiqueta: 'Sesiones' },
    { id: 'examenes', etiqueta: 'Exámenes' },
    { id: 'certificacion', etiqueta: 'Certificación' },
    { id: 'publicacion', etiqueta: 'Publicación' },
  ];
  protected readonly tabActiva = signal<PestanaEditor>('informacion');

  protected readonly cursoId = Number(this.route.snapshot.paramMap.get('id'));
  protected readonly curso = signal<CursoEditorRespuesta | null | undefined>(undefined);

  protected readonly tiposCurso = signal<TipoCursoRespuesta[]>([]);
  protected readonly categorias = signal<CategoriaRespuesta[]>([]);
  protected readonly entidades = signal<EntidadRespuesta[]>([]);
  protected readonly docentesDisponibles = signal<DocenteRespuesta[]>([]);
  protected readonly firmantesDisponibles = signal<FirmanteRespuesta[]>([]);

  protected readonly guardando = signal(false);
  protected readonly intentoGuardar = signal(false);
  protected readonly errorInformacion = signal<string | null>(null);

  protected readonly mensaje = signal<{ tipo: 'error' | 'exito'; texto: string } | null>(null);
  private mensajeTimeout: ReturnType<typeof setTimeout> | null = null;

  protected readonly docentesSeleccionados = signal<number[]>([]);
  protected readonly firmantesSeleccionados = signal<number[]>([]);
  protected readonly busquedaDocente = signal('');
  protected readonly busquedaFirmante = signal('');

  protected readonly beneficios = signal<string[]>([]);
  protected readonly nuevoBeneficio = signal('');
  protected readonly sugerenciasBeneficio = signal<string[]>([]);
  private readonly busquedaBeneficio$ = new Subject<string>();
  protected readonly beneficiosMaximo = 10;
  protected readonly beneficioLongitudMaxima = 150;

  protected readonly formInformacion = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(220)]],
    urlAmigable: ['', [Validators.maxLength(180)]],
    descripcion: ['', []],
    imagenPortadaUrl: ['', []],
    tipoCursoId: this.fb.control<number | null>(null),
    categoriaTematicaId: this.fb.control<number | null>(null),
    entidadCertificadoraId: this.fb.control<number | null>(null),
    modalidad: this.fb.control<ModalidadCurso>('VIRTUAL', [Validators.required]),
    tipoVenta: this.fb.control<TipoVentaCurso>('GRATUITO', [Validators.required]),
    destacado: [false],
    precioRegular: [0, [Validators.required, Validators.min(0)]],
    precioPromocional: this.fb.control<number | null>(null),
    promocionInicioEn: this.fb.control<string | null>(null),
    promocionFinEn: this.fb.control<string | null>(null),
    fechaInicio: this.fb.control<string | null>(null),
    fechaFin: this.fb.control<string | null>(null),
    fechaCierreMatricula: this.fb.control<string | null>(null),
    cupoMaximo: this.fb.control<number | null>(null, [Validators.min(1)]),
    horasAcademicas: this.fb.control<number | null>(null, [Validators.min(0)]),
    vigenciaAccesoDias: this.fb.control<number | null>(null, [Validators.min(1)]),
  });

  constructor() {
    this.formInformacion.controls.modalidad.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((modalidad) => this.actualizarValidadoresPorModalidad(modalidad));

    this.busquedaBeneficio$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((texto) => {
          if (texto.trim().length < 2) {
            return of<string[]>([]);
          }
          return this.api.sugerirBeneficios(texto).pipe(catchError(() => of<string[]>([])));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((sugerencias) => {
        this.sugerenciasBeneficio.set(sugerencias.filter((s) => !this.beneficios().includes(s)));
        this.detector.markForCheck();
      });
  }

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.limpiarTimeoutMensaje());
    this.cargarTodo();
  }

  protected cambiarPestana(id: PestanaEditor): void {
    this.tabActiva.set(id);
  }

  protected get esVirtual(): boolean {
    return this.formInformacion.controls.modalidad.value === 'VIRTUAL';
  }

  protected campoInvalido(nombre: CampoInformacion): boolean {
    const control = this.formInformacion.controls[nombre];
    return control.invalid && (control.touched || this.intentoGuardar());
  }

  protected etiquetaModalidad(modalidad: string): string {
    switch (modalidad) {
      case 'VIRTUAL': return 'Virtual';
      case 'EN_VIVO': return 'En vivo';
      case 'HIBRIDO': return 'Híbrido';
      default: return modalidad;
    }
  }

  protected actualizarBusquedaBeneficio(valor: string): void {
    this.nuevoBeneficio.set(valor);
    this.busquedaBeneficio$.next(valor);
  }

  protected agregarBeneficio(): void {
    this.agregarBeneficioTexto(this.nuevoBeneficio());
  }

  protected elegirSugerenciaBeneficio(texto: string): void {
    this.agregarBeneficioTexto(texto);
  }

  protected quitarBeneficio(indice: number): void {
    this.beneficios.update((lista) => lista.filter((_, i) => i !== indice));
  }

  private agregarBeneficioTexto(valor: string): void {
    const limpio = valor.trim();
    if (!limpio) {
      return;
    }
    if (this.beneficios().length >= this.beneficiosMaximo) {
      this.mostrarMensaje('error', `No puedes agregar más de ${this.beneficiosMaximo} beneficios.`);
      return;
    }
    const yaExiste = this.beneficios().some((b) => b.toLowerCase() === limpio.toLowerCase());
    if (yaExiste) {
      this.mostrarMensaje('error', 'Ese beneficio ya está en la lista.');
      return;
    }
    this.beneficios.update((lista) => [...lista, limpio.slice(0, this.beneficioLongitudMaxima)]);
    this.nuevoBeneficio.set('');
    this.sugerenciasBeneficio.set([]);
  }

  protected datosDocente(personaId: number): DocenteRespuesta | undefined {
    return this.docentesDisponibles().find((d) => d.personaId === personaId);
  }

  protected mostrarSugerenciasDocente(): boolean {
    return this.busquedaDocente().trim().length > 0;
  }

  protected docentesFiltrados(): DocenteRespuesta[] {
    const termino = this.busquedaDocente().trim().toLowerCase();
    return this.docentesDisponibles()
      .filter((d) => !this.docentesSeleccionados().includes(d.personaId))
      .filter((d) => d.nombreCompleto.toLowerCase().includes(termino))
      .slice(0, 8);
  }

  protected agregarDocente(personaId: number): void {
    this.docentesSeleccionados.update((lista) => (lista.includes(personaId) ? lista : [...lista, personaId]));
    this.busquedaDocente.set('');
  }

  protected quitarDocente(personaId: number): void {
    this.docentesSeleccionados.update((lista) => lista.filter((id) => id !== personaId));
  }

  protected moverDocente(indice: number, direccion: -1 | 1): void {
    this.docentesSeleccionados.update((lista) => this.mover(lista, indice, direccion));
  }

  protected datosFirmante(firmanteId: number): FirmanteRespuesta | undefined {
    return this.firmantesDisponibles().find((f) => f.id === firmanteId);
  }

  protected mostrarSugerenciasFirmante(): boolean {
    return this.busquedaFirmante().trim().length > 0;
  }

  protected firmantesFiltrados(): FirmanteRespuesta[] {
    const termino = this.busquedaFirmante().trim().toLowerCase();
    return this.firmantesDisponibles()
      .filter((f) => !this.firmantesSeleccionados().includes(f.id))
      .filter((f) => f.nombreCompleto.toLowerCase().includes(termino))
      .slice(0, 8);
  }

  protected agregarFirmante(firmanteId: number): void {
    this.firmantesSeleccionados.update((lista) => (lista.includes(firmanteId) ? lista : [...lista, firmanteId]));
    this.busquedaFirmante.set('');
  }

  protected quitarFirmante(firmanteId: number): void {
    this.firmantesSeleccionados.update((lista) => lista.filter((id) => id !== firmanteId));
  }

  protected moverFirmante(indice: number, direccion: -1 | 1): void {
    this.firmantesSeleccionados.update((lista) => this.mover(lista, indice, direccion));
  }

  protected cerrarMensaje(): void {
    this.limpiarTimeoutMensaje();
    this.mensaje.set(null);
  }

  protected volverAlListado(): void {
    this.router.navigate(['/admin/cursos']);
  }

  /** Un único botón guarda información, docentes y firmantes a la vez, aunque por detrás sean
   * tres llamadas distintas: desde la perspectiva de quien administra, es una sola pestaña. */
  protected guardarTodo(): void {
    if (this.guardando()) {
      return;
    }
    this.intentoGuardar.set(true);
    this.errorInformacion.set(null);
    if (this.formInformacion.invalid) {
      this.formInformacion.markAllAsTouched();
      this.mostrarMensaje('error', 'Revisa los campos marcados en rojo.');
      return;
    }

    const v = this.formInformacion.getRawValue();
    this.guardando.set(true);

    const llamadas: Record<string, Observable<CursoEditorRespuesta>> = {
      informacion: this.api.actualizarInformacion(this.cursoId, {
        titulo: v.titulo.trim(),
        urlAmigable: this.textoOpcional(v.urlAmigable),
        descripcion: this.textoOpcional(v.descripcion),
        imagenPortadaUrl: this.textoOpcional(v.imagenPortadaUrl),
        tipoCursoId: v.tipoCursoId,
        categoriaTematicaId: v.categoriaTematicaId,
        entidadCertificadoraId: v.entidadCertificadoraId,
        modalidad: v.modalidad,
        tipoVenta: v.tipoVenta,
        destacado: v.destacado,
        precioRegular: v.precioRegular,
        precioPromocional: v.precioPromocional,
        promocionInicioEn: this.aInstante(v.promocionInicioEn),
        promocionFinEn: this.aInstante(v.promocionFinEn),
        fechaInicio: v.fechaInicio,
        fechaFin: v.modalidad === 'VIRTUAL' ? null : v.fechaFin,
        fechaCierreMatricula: v.modalidad === 'VIRTUAL' ? null : v.fechaCierreMatricula,
        cupoMaximo: v.cupoMaximo,
        horasAcademicas: v.horasAcademicas,
        vigenciaAccesoDias: v.vigenciaAccesoDias,
        beneficios: this.beneficios(),
      }),
      firmantes: this.api.actualizarFirmantes(this.cursoId, { firmanteIds: this.firmantesSeleccionados() }),
    };
    // El backend exige al menos un docente en esta llamada; si todavía no se eligió ninguno,
    // se omite en vez de fallar con un error confuso sobre un campo que ni siquiera se tocó.
    if (this.docentesSeleccionados().length > 0) {
      llamadas['docentes'] = this.api.actualizarDocentes(this.cursoId, { personaIds: this.docentesSeleccionados() });
    }

    forkJoin(llamadas)
      .pipe(
        switchMap(() => this.api.obtener(this.cursoId)),
        finalize(() => {
          this.guardando.set(false);
          this.detector.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (curso) => {
          this.curso.set(curso);
          this.intentoGuardar.set(false);
          this.mostrarMensaje('exito', 'Cambios guardados.');
        },
        error: (error: HttpErrorResponse) => {
          this.errorInformacion.set(this.mensajeError(error) ?? 'No pudimos guardar los cambios.');
          this.scrollArriba();
        },
      });
  }

  private actualizarValidadoresPorModalidad(modalidad: ModalidadCurso): void {
    const inicio = this.formInformacion.controls.fechaInicio;
    const fin = this.formInformacion.controls.fechaFin;
    if (modalidad === 'VIRTUAL') {
      inicio.clearValidators();
      fin.clearValidators();
    } else {
      inicio.setValidators([Validators.required]);
      fin.setValidators([Validators.required]);
    }
    inicio.updateValueAndValidity({ emitEvent: false });
    fin.updateValueAndValidity({ emitEvent: false });
  }

  private cargarTodo(): void {
    if (!this.cursoId || Number.isNaN(this.cursoId)) {
      this.curso.set(null);
      return;
    }
    forkJoin({
      curso: this.api.obtener(this.cursoId),
      tiposCurso: this.infoBaseApi.listarTiposCurso(false, 0, 100),
      categorias: this.infoBaseApi.listarCategorias(false, 0, 100),
      entidades: this.infoBaseApi.listarEntidades(false, 0, 100),
      docentes: this.infoBaseApi.listarDocentes(false, 0, 100),
      firmantes: this.infoBaseApi.listarFirmantes(false, 0, 100),
    })
      .pipe(
        finalize(() => this.detector.markForCheck()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ curso, tiposCurso, categorias, entidades, docentes, firmantes }) => {
          this.curso.set(curso);
          this.tiposCurso.set(tiposCurso.items);
          this.categorias.set(categorias.items);
          this.entidades.set(entidades.items);
          this.docentesDisponibles.set(docentes.items);
          this.firmantesDisponibles.set(firmantes.items);
          this.aplicarCurso(curso);
        },
        error: () => this.curso.set(null),
      });
  }

  private aplicarCurso(curso: CursoEditorRespuesta): void {
    this.formInformacion.setValue({
      titulo: curso.titulo,
      urlAmigable: curso.urlAmigable,
      descripcion: curso.descripcion ?? '',
      imagenPortadaUrl: curso.imagenPortadaUrl ?? '',
      tipoCursoId: curso.tipoCursoId,
      categoriaTematicaId: curso.categoriaTematicaId,
      entidadCertificadoraId: curso.entidadCertificadoraId,
      modalidad: curso.modalidad ?? 'VIRTUAL',
      tipoVenta: curso.tipoVenta ?? 'GRATUITO',
      destacado: curso.destacado,
      precioRegular: curso.precioRegular,
      precioPromocional: curso.precioPromocional,
      promocionInicioEn: this.aDatetimeLocal(curso.promocionInicioEn),
      promocionFinEn: this.aDatetimeLocal(curso.promocionFinEn),
      fechaInicio: curso.fechaInicio,
      fechaFin: curso.fechaFin,
      fechaCierreMatricula: curso.fechaCierreMatricula,
      cupoMaximo: curso.cupoMaximo,
      horasAcademicas: curso.horasAcademicas,
      vigenciaAccesoDias: curso.vigenciaAccesoDias,
    });
    this.actualizarValidadoresPorModalidad(curso.modalidad ?? 'VIRTUAL');
    this.beneficios.set([...curso.beneficios]);
    this.docentesSeleccionados.set(curso.docentes.slice().sort((a, b) => a.orden - b.orden).map((d) => d.personaId));
    this.firmantesSeleccionados.set(curso.firmantes.slice().sort((a, b) => a.orden - b.orden).map((f) => f.firmanteId));
  }

  private mover<T>(lista: T[], indice: number, direccion: -1 | 1): T[] {
    const destino = indice + direccion;
    if (destino < 0 || destino >= lista.length) {
      return lista;
    }
    const copia = [...lista];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    return copia;
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

  private mostrarMensaje(tipo: 'error' | 'exito', texto: string): void {
    this.limpiarTimeoutMensaje();
    this.mensaje.set({ tipo, texto });
    this.scrollArriba();
    this.mensajeTimeout = setTimeout(() => {
      this.mensaje.set(null);
      this.mensajeTimeout = null;
      this.detector.markForCheck();
    }, 5000);
  }

  /** La pestaña puede ser larga (varias tarjetas); sin esto, el mensaje de confirmación queda
   * arriba, fuera de vista, si guardaste con la página desplazada hacia abajo. */
  private scrollArriba(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private limpiarTimeoutMensaje(): void {
    if (this.mensajeTimeout !== null) {
      clearTimeout(this.mensajeTimeout);
      this.mensajeTimeout = null;
    }
  }

  private mensajeError(error: HttpErrorResponse): string | null {
    const cuerpo = typeof error.error === 'object' && error.error !== null ? (error.error as ErrorApiAdmin) : null;
    return cuerpo?.message ?? null;
  }

  private textoOpcional(valor: string): string | null {
    const limpio = valor.trim();
    return limpio.length > 0 ? limpio : null;
  }
}
