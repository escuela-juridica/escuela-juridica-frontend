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
  TipoMaterialRespuesta,
} from '../../informacion-base/informacion-base.model';
import { ContenidoApiService } from '../contenido/contenido-api.service';
import {
  LeccionRespuesta,
  MaterialRespuesta,
  ModuloDisponibleRespuesta,
  ModuloRespuesta,
  TipoLeccion,
} from '../contenido/contenido.model';
import { CursoAdminApiService } from '../curso-admin-api.service';
import { CursoEditorRespuesta, ModalidadCurso, TipoVentaCurso } from '../curso-admin.model';
import { Modal } from '../../../../shared/ui/modal/modal';

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
  imports: [ReactiveFormsModule, RouterLink, Modal],
  templateUrl: './curso-editor.html',
  styleUrl: './curso-editor.scss',
})
export class CursoEditor implements OnInit {
  private readonly api = inject(CursoAdminApiService);
  private readonly infoBaseApi = inject(InformacionBaseApiService);
  private readonly contenidoApi = inject(ContenidoApiService);
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

  // ---------------------------------------------------------------- HU-011 Contenido --
  protected readonly tiposMaterial = signal<TipoMaterialRespuesta[]>([]);
  protected readonly modulos = signal<ModuloRespuesta[]>([]);
  protected readonly cargandoContenido = signal(false);
  protected readonly contenidoCargado = signal(false);
  protected readonly erroContenido = signal<string | null>(null);
  protected readonly modulosExpandidos = signal<Set<number>>(new Set());
  protected readonly leccionesExpandidas = signal<Set<number>>(new Set());

  protected readonly mostrarFormModulo = signal(false);
  protected readonly moduloEditId = signal<number | null>(null);
  protected readonly moduloTitulo = signal('');
  protected readonly moduloDescripcion = signal('');
  protected readonly guardandoModulo = signal(false);

  protected readonly modalModuloExistenteAbierto = signal(false);
  protected readonly busquedaModuloExistente = signal('');
  protected readonly resultadosModuloExistente = signal<ModuloDisponibleRespuesta[]>([]);
  protected readonly buscandoModuloExistente = signal(false);
  private readonly busquedaModuloExistente$ = new Subject<string>();

  protected readonly leccionFormModuloId = signal<number | null>(null);
  protected readonly leccionEditId = signal<number | null>(null);
  protected readonly leccionTitulo = signal('');
  protected readonly leccionDescripcion = signal('');
  protected readonly leccionTipo = signal<TipoLeccion>('GRABADA');
  protected readonly leccionObligatoria = signal(true);
  protected readonly leccionVistaPrevia = signal(false);
  protected readonly leccionFechaInicio = signal('');
  protected readonly leccionFechaFin = signal('');
  protected readonly guardandoLeccion = signal(false);

  protected readonly materialFormLeccionId = signal<number | null>(null);
  protected readonly materialEditId = signal<number | null>(null);
  protected readonly materialModo = signal<'enlace' | 'archivo'>('enlace');
  protected readonly materialTitulo = signal('');
  protected readonly materialTipoMaterialId = signal<number | null>(null);
  protected readonly materialOrigen = signal<'YOUTUBE' | 'EXTERNO'>('YOUTUBE');
  protected readonly materialReferencia = signal('');
  protected readonly materialYoutubeNoListado = signal(false);
  protected readonly materialPermiteDescarga = signal(false);
  protected readonly materialArchivo = signal<File | null>(null);
  protected readonly guardandoMaterial = signal(false);
  protected readonly materialOrigenActual = signal('');
  protected readonly materialOrigenCodigo = signal('');
  protected readonly materialTipoNombreActual = signal('');

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

    this.busquedaModuloExistente$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((texto) => {
          this.buscandoModuloExistente.set(true);
          return this.contenidoApi
            .listarModulosDisponibles(texto, this.cursoId)
            .pipe(catchError(() => of<ModuloDisponibleRespuesta[]>([])));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultados) => {
        this.resultadosModuloExistente.set(resultados);
        this.buscandoModuloExistente.set(false);
        this.detector.markForCheck();
      });
  }

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.limpiarTimeoutMensaje());
    this.cargarTodo();
  }

  protected cambiarPestana(id: PestanaEditor): void {
    this.tabActiva.set(id);
    if (id === 'contenido' && !this.contenidoCargado()) {
      this.cargarContenido();
    }
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

  // ---------------------------------------------------------------- HU-011 Contenido --

  private cargarContenido(): void {
    this.cargandoContenido.set(true);
    this.erroContenido.set(null);
    this.contenidoApi
      .obtenerEstructura(this.cursoId)
      .pipe(
        finalize(() => {
          this.cargandoContenido.set(false);
          this.detector.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (modulos) => {
          this.modulos.set(modulos);
          this.contenidoCargado.set(true);
        },
        error: () => this.erroContenido.set('No pudimos cargar el contenido del curso.'),
      });
  }

  protected moduloExpandido(moduloId: number): boolean {
    return this.modulosExpandidos().has(moduloId);
  }

  protected alternarModulo(moduloId: number): void {
    this.modulosExpandidos.update((set) => this.alternarEnSet(set, moduloId));
  }

  protected leccionExpandida(leccionId: number): boolean {
    return this.leccionesExpandidas().has(leccionId);
  }

  protected alternarLeccion(leccionId: number): void {
    this.leccionesExpandidas.update((set) => this.alternarEnSet(set, leccionId));
  }

  private alternarEnSet(set: Set<number>, id: number): Set<number> {
    const copia = new Set(set);
    if (copia.has(id)) {
      copia.delete(id);
    } else {
      copia.add(id);
    }
    return copia;
  }

  protected etiquetaTipoLeccion(tipo: string): string {
    return tipo === 'EN_VIVO' ? 'En vivo' : 'Grabada';
  }

  protected etiquetaOrigenMaterial(origen: string): string {
    switch (origen) {
      case 'SUBIDO': return 'Archivo subido';
      case 'YOUTUBE': return 'YouTube';
      case 'EXTERNO': return 'Enlace externo';
      default: return origen;
    }
  }

  protected formatearTamano(bytes: number | null): string {
    if (bytes === null) {
      return '';
    }
    if (bytes >= 1_048_576) {
      return `${(bytes / 1_048_576).toFixed(1)} MB`;
    }
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  // -- Módulos --

  protected abrirCrearModulo(): void {
    this.moduloEditId.set(null);
    this.moduloTitulo.set('');
    this.moduloDescripcion.set('');
    this.mostrarFormModulo.set(true);
  }

  protected abrirEditarModulo(modulo: ModuloRespuesta): void {
    this.moduloEditId.set(modulo.id);
    this.moduloTitulo.set(modulo.titulo);
    this.moduloDescripcion.set(modulo.descripcion ?? '');
    this.mostrarFormModulo.set(true);
  }

  protected cancelarFormModulo(): void {
    this.mostrarFormModulo.set(false);
  }

  protected guardarModulo(): void {
    const titulo = this.moduloTitulo().trim();
    if (!titulo || this.guardandoModulo()) {
      return;
    }
    this.guardandoModulo.set(true);
    const peticion = { titulo, descripcion: this.textoOpcional(this.moduloDescripcion()) };
    const editId = this.moduloEditId();
    const llamada = editId
      ? this.contenidoApi.actualizarModulo(editId, peticion)
      : this.contenidoApi.crearModulo(this.cursoId, peticion);

    llamada
      .pipe(
        finalize(() => {
          this.guardandoModulo.set(false);
          this.detector.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (modulo) => {
          if (editId) {
            this.modulos.update((lista) => lista.map((m) => (m.id === modulo.id ? { ...m, ...modulo, lecciones: m.lecciones } : m)));
          } else {
            this.modulos.update((lista) => [...lista, modulo]);
          }
          this.mostrarFormModulo.set(false);
          this.mostrarMensaje('exito', editId ? 'Módulo actualizado.' : 'Módulo creado.');
        },
        error: (error: HttpErrorResponse) => {
          this.mostrarMensaje('error', this.mensajeError(error) ?? 'No pudimos guardar el módulo.');
        },
      });
  }

  protected cambiarActivoModulo(modulo: ModuloRespuesta): void {
    this.contenidoApi
      .cambiarActivoModulo(modulo.id, !modulo.activo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (actualizado) => {
          this.modulos.update((lista) => lista.map((m) => (m.id === actualizado.id ? { ...m, ...actualizado, lecciones: m.lecciones } : m)));
          this.detector.markForCheck();
        },
        error: () => this.mostrarMensaje('error', 'No pudimos cambiar el estado del módulo.'),
      });
  }

  protected moverModulo(indice: number, direccion: -1 | 1): void {
    const lista = this.modulos();
    const destino = indice + direccion;
    if (destino < 0 || destino >= lista.length) {
      return;
    }
    const copia = [...lista];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    this.modulos.set(copia);
    this.contenidoApi
      .reordenarModulos(this.cursoId, { ids: copia.map((m) => m.id) })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (modulos) => this.modulos.set(modulos),
        error: () => {
          this.mostrarMensaje('error', 'No pudimos reordenar los módulos.');
          this.cargarContenido();
        },
      });
  }

  protected abrirModuloExistente(): void {
    this.busquedaModuloExistente.set('');
    this.resultadosModuloExistente.set([]);
    this.modalModuloExistenteAbierto.set(true);
  }

  protected cerrarModuloExistente(): void {
    this.modalModuloExistenteAbierto.set(false);
  }

  protected buscarModuloExistente(texto: string): void {
    this.busquedaModuloExistente.set(texto);
    this.busquedaModuloExistente$.next(texto);
  }

  protected copiarModulo(moduloOrigenId: number): void {
    this.contenidoApi
      .copiarModulo(this.cursoId, moduloOrigenId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (modulo) => {
          this.modulos.update((lista) => [...lista, modulo]);
          this.modalModuloExistenteAbierto.set(false);
          this.mostrarMensaje('exito', 'Módulo copiado.');
        },
        error: (error: HttpErrorResponse) => {
          this.mostrarMensaje('error', this.mensajeError(error) ?? 'No pudimos copiar el módulo.');
        },
      });
  }

  // -- Lecciones --

  protected abrirCrearLeccion(moduloId: number): void {
    this.leccionEditId.set(null);
    this.leccionTitulo.set('');
    this.leccionDescripcion.set('');
    this.leccionTipo.set('GRABADA');
    this.leccionObligatoria.set(true);
    this.leccionVistaPrevia.set(false);
    this.leccionFechaInicio.set('');
    this.leccionFechaFin.set('');
    this.leccionFormModuloId.set(moduloId);
  }

  protected abrirEditarLeccion(moduloId: number, leccion: LeccionRespuesta): void {
    this.leccionEditId.set(leccion.id);
    this.leccionTitulo.set(leccion.titulo);
    this.leccionDescripcion.set(leccion.descripcion ?? '');
    this.leccionTipo.set(leccion.tipo);
    this.leccionObligatoria.set(leccion.esObligatoria);
    this.leccionVistaPrevia.set(leccion.esVistaPrevia);
    this.leccionFechaInicio.set(this.aDatetimeLocal(leccion.fechaHoraInicio) ?? '');
    this.leccionFechaFin.set(this.aDatetimeLocal(leccion.fechaHoraFin) ?? '');
    this.leccionFormModuloId.set(moduloId);
  }

  protected cancelarFormLeccion(): void {
    this.leccionFormModuloId.set(null);
  }

  protected cambiarTipoLeccionForm(tipo: TipoLeccion): void {
    this.leccionTipo.set(tipo);
    if (tipo === 'EN_VIVO') {
      this.leccionVistaPrevia.set(false);
    }
  }

  protected guardarLeccion(): void {
    const titulo = this.leccionTitulo().trim();
    const moduloId = this.leccionFormModuloId();
    if (!titulo || moduloId === null || this.guardandoLeccion()) {
      return;
    }
    this.guardandoLeccion.set(true);
    const peticion = {
      titulo,
      descripcion: this.textoOpcional(this.leccionDescripcion()),
      tipo: this.leccionTipo(),
      esObligatoria: this.leccionObligatoria(),
      esVistaPrevia: this.leccionVistaPrevia(),
      fechaHoraInicio: this.aInstante(this.leccionFechaInicio() || null),
      fechaHoraFin: this.aInstante(this.leccionFechaFin() || null),
    };
    const editId = this.leccionEditId();
    const llamada = editId
      ? this.contenidoApi.actualizarLeccion(editId, peticion)
      : this.contenidoApi.crearLeccion(moduloId, peticion);

    llamada
      .pipe(
        finalize(() => {
          this.guardandoLeccion.set(false);
          this.detector.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (leccion) => {
          this.actualizarLeccionEnEstado(moduloId, leccion, !editId);
          this.leccionFormModuloId.set(null);
          this.mostrarMensaje('exito', editId ? 'Lección actualizada.' : 'Lección creada.');
        },
        error: (error: HttpErrorResponse) => {
          this.mostrarMensaje('error', this.mensajeError(error) ?? 'No pudimos guardar la lección.');
        },
      });
  }

  protected cambiarActivoLeccion(moduloId: number, leccion: LeccionRespuesta): void {
    this.contenidoApi
      .cambiarActivoLeccion(leccion.id, !leccion.activo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (actualizada) => {
          this.actualizarLeccionEnEstado(moduloId, actualizada, false);
          this.detector.markForCheck();
        },
        error: () => this.mostrarMensaje('error', 'No pudimos cambiar el estado de la lección.'),
      });
  }

  protected moverLeccion(moduloId: number, indice: number, direccion: -1 | 1): void {
    const modulo = this.modulos().find((m) => m.id === moduloId);
    if (!modulo) {
      return;
    }
    const destino = indice + direccion;
    if (destino < 0 || destino >= modulo.lecciones.length) {
      return;
    }
    const copia = [...modulo.lecciones];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    this.modulos.update((lista) => lista.map((m) => (m.id === moduloId ? { ...m, lecciones: copia } : m)));
    this.contenidoApi
      .reordenarLecciones(moduloId, { ids: copia.map((l) => l.id) })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lecciones) => this.modulos.update((lista) => lista.map((m) => (m.id === moduloId ? { ...m, lecciones } : m))),
        error: () => {
          this.mostrarMensaje('error', 'No pudimos reordenar las lecciones.');
          this.cargarContenido();
        },
      });
  }

  private actualizarLeccionEnEstado(moduloId: number, leccion: LeccionRespuesta, esNueva: boolean): void {
    this.modulos.update((lista) =>
      lista.map((m) => {
        if (m.id !== moduloId) {
          return m;
        }
        if (esNueva) {
          return { ...m, lecciones: [...m.lecciones, leccion] };
        }
        return {
          ...m,
          lecciones: m.lecciones.map((l) => (l.id === leccion.id ? { ...l, ...leccion, materiales: l.materiales } : l)),
        };
      }),
    );
  }

  // -- Materiales --

  protected abrirCrearMaterial(leccionId: number): void {
    this.materialEditId.set(null);
    this.materialModo.set('enlace');
    this.materialTitulo.set('');
    this.materialTipoMaterialId.set(this.tiposMaterial()[0]?.id ?? null);
    this.materialOrigen.set('YOUTUBE');
    this.materialReferencia.set('');
    this.materialYoutubeNoListado.set(false);
    this.materialPermiteDescarga.set(false);
    this.materialArchivo.set(null);
    this.materialFormLeccionId.set(leccionId);
  }

  protected abrirEditarMaterial(leccionId: number, material: MaterialRespuesta): void {
    this.materialEditId.set(material.id);
    this.materialTitulo.set(material.titulo);
    this.materialPermiteDescarga.set(material.permiteDescarga);
    this.materialOrigenActual.set(this.etiquetaOrigenMaterial(material.recurso.origen));
    this.materialOrigenCodigo.set(material.recurso.origen);
    this.materialTipoNombreActual.set(material.recurso.tipoMaterialNombre);
    this.materialOrigen.set(material.recurso.origen === 'EXTERNO' ? 'EXTERNO' : 'YOUTUBE');
    this.materialReferencia.set(material.recurso.referencia);
    this.materialYoutubeNoListado.set(material.recurso.youtubeNoListadoConfirmado ?? false);
    this.materialFormLeccionId.set(leccionId);
  }

  protected tipoMaterialEsVideo(): boolean {
    const id = this.materialTipoMaterialId();
    return this.tiposMaterial().find((t) => t.id === id)?.codigo === 'VIDEO';
  }

  protected cambiarTipoMaterialForm(id: number): void {
    this.materialTipoMaterialId.set(id);
    const esVideo = this.tiposMaterial().find((t) => t.id === id)?.codigo === 'VIDEO';
    this.materialOrigen.set(esVideo ? 'YOUTUBE' : 'EXTERNO');
    if (!esVideo) {
      this.materialYoutubeNoListado.set(false);
    }
  }

  protected cancelarFormMaterial(): void {
    this.materialFormLeccionId.set(null);
  }

  protected elegirModoMaterial(modo: 'enlace' | 'archivo'): void {
    this.materialModo.set(modo);
    if (modo === 'enlace') {
      this.materialArchivo.set(null);
    } else {
      this.materialReferencia.set('');
      this.materialYoutubeNoListado.set(false);
    }
  }

  protected archivoSeleccionado(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    this.materialArchivo.set(input.files && input.files.length > 0 ? input.files[0] : null);
  }

  protected guardarMaterial(): void {
    const leccionId = this.materialFormLeccionId();
    const titulo = this.materialTitulo().trim();
    if (leccionId === null || !titulo || this.guardandoMaterial()) {
      return;
    }

    if (this.materialEditId()) {
      if (this.materialOrigenCodigo() !== 'SUBIDO' && !this.materialReferencia().trim()) {
        this.mostrarMensaje('error', 'Ingresa la URL del material.');
        return;
      }
      this.guardandoMaterial.set(true);
      this.contenidoApi
        .actualizarMaterial(this.materialEditId()!, {
          titulo,
          permiteDescarga: this.materialPermiteDescarga(),
          referencia: this.materialOrigenCodigo() === 'SUBIDO' ? null : this.materialReferencia().trim(),
          youtubeNoListadoConfirmado: this.materialOrigenCodigo() === 'YOUTUBE' ? this.materialYoutubeNoListado() : null,
        })
        .pipe(
          finalize(() => {
            this.guardandoMaterial.set(false);
            this.detector.markForCheck();
          }),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: (material) => {
            this.actualizarMaterialEnEstado(leccionId, material, false);
            this.materialFormLeccionId.set(null);
            this.mostrarMensaje('exito', 'Material actualizado.');
          },
          error: (error: HttpErrorResponse) => {
            this.mostrarMensaje('error', this.mensajeError(error) ?? 'No pudimos guardar el material.');
          },
        });
      return;
    }

    const tipoMaterialId = this.materialTipoMaterialId();
    if (!tipoMaterialId) {
      this.mostrarMensaje('error', 'Elige el tipo de material.');
      return;
    }
    if (this.materialModo() === 'enlace' && !this.materialReferencia().trim()) {
      this.mostrarMensaje('error', 'Ingresa la URL del material.');
      return;
    }

    this.guardandoMaterial.set(true);
    const llamada =
      this.materialModo() === 'archivo'
        ? (() => {
            const archivo = this.materialArchivo();
            if (!archivo) {
              this.guardandoMaterial.set(false);
              this.mostrarMensaje('error', 'Selecciona un archivo.');
              return null;
            }
            return this.contenidoApi.subirMaterialArchivo(
              leccionId, archivo, titulo, tipoMaterialId, this.materialPermiteDescarga(),
            );
          })()
        : this.contenidoApi.crearMaterialEnlace(leccionId, {
            titulo,
            tipoMaterialId,
            origen: this.materialOrigen(),
            referencia: this.materialReferencia().trim(),
            youtubeNoListadoConfirmado: this.materialOrigen() === 'YOUTUBE' ? this.materialYoutubeNoListado() : null,
            permiteDescarga: this.materialPermiteDescarga(),
            duracionSegundos: null,
          });

    if (!llamada) {
      return;
    }

    llamada
      .pipe(
        finalize(() => {
          this.guardandoMaterial.set(false);
          this.detector.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (material) => {
          this.actualizarMaterialEnEstado(leccionId, material, true);
          this.materialFormLeccionId.set(null);
          this.mostrarMensaje('exito', 'Material agregado.');
        },
        error: (error: HttpErrorResponse) => {
          this.mostrarMensaje('error', this.mensajeError(error) ?? 'No pudimos guardar el material.');
        },
      });
  }

  protected cambiarActivoMaterial(leccionId: number, material: MaterialRespuesta): void {
    this.contenidoApi
      .cambiarActivoMaterial(material.id, !material.activo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (actualizado) => {
          this.actualizarMaterialEnEstado(leccionId, actualizado, false);
          this.detector.markForCheck();
        },
        error: () => this.mostrarMensaje('error', 'No pudimos cambiar el estado del material.'),
      });
  }

  protected moverMaterial(leccionId: number, moduloId: number, indice: number, direccion: -1 | 1): void {
    const modulo = this.modulos().find((m) => m.id === moduloId);
    const leccion = modulo?.lecciones.find((l) => l.id === leccionId);
    if (!leccion) {
      return;
    }
    const destino = indice + direccion;
    if (destino < 0 || destino >= leccion.materiales.length) {
      return;
    }
    const copia = [...leccion.materiales];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    this.modulos.update((lista) =>
      lista.map((m) =>
        m.id !== moduloId
          ? m
          : { ...m, lecciones: m.lecciones.map((l) => (l.id === leccionId ? { ...l, materiales: copia } : l)) },
      ),
    );
    this.contenidoApi
      .reordenarMateriales(leccionId, { ids: copia.map((mat) => mat.id) })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (materiales) =>
          this.modulos.update((lista) =>
            lista.map((m) =>
              m.id !== moduloId
                ? m
                : { ...m, lecciones: m.lecciones.map((l) => (l.id === leccionId ? { ...l, materiales } : l)) },
            ),
          ),
        error: () => {
          this.mostrarMensaje('error', 'No pudimos reordenar los materiales.');
          this.cargarContenido();
        },
      });
  }

  private actualizarMaterialEnEstado(leccionId: number, material: MaterialRespuesta, esNuevo: boolean): void {
    this.modulos.update((lista) =>
      lista.map((m) => ({
        ...m,
        lecciones: m.lecciones.map((l) => {
          if (l.id !== leccionId) {
            return l;
          }
          if (esNuevo) {
            return { ...l, materiales: [...l.materiales, material] };
          }
          return { ...l, materiales: l.materiales.map((mat) => (mat.id === material.id ? material : mat)) };
        }),
      })),
    );
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
      tiposMaterial: this.infoBaseApi.listarTiposMaterial(false, 0, 100),
    })
      .pipe(
        finalize(() => this.detector.markForCheck()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ curso, tiposCurso, categorias, entidades, docentes, firmantes, tiposMaterial }) => {
          this.curso.set(curso);
          this.tiposCurso.set(tiposCurso.items);
          this.categorias.set(categorias.items);
          this.entidades.set(entidades.items);
          this.docentesDisponibles.set(docentes.items);
          this.firmantesDisponibles.set(firmantes.items);
          this.tiposMaterial.set(tiposMaterial.items);
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
