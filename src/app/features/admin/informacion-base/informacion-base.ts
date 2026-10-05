import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import { PageResponse } from '../../../core/api/page-response.model';
import { nombrePropioValidator } from '../../cuenta/mi-perfil/mi-perfil.validators';
import { InformacionBaseApiService } from './informacion-base-api.service';
import {
  CategoriaRespuesta,
  DocenteRespuesta,
  EntidadRespuesta,
  FirmanteRespuesta,
  TabInformacionBase,
  TipoCursoRespuesta,
  TipoMaterialRespuesta,
} from './informacion-base.model';

interface ErrorApiAdmin {
  code?: string;
  message?: string;
}

interface DefinicionPestana {
  id: TabInformacionBase;
  etiqueta: string;
}

const PESTANAS: DefinicionPestana[] = [
  { id: 'tipoCurso', etiqueta: 'Tipos de curso' },
  { id: 'categoria', etiqueta: 'Categorías' },
  { id: 'docente', etiqueta: 'Docentes públicos' },
  { id: 'entidad', etiqueta: 'Entidades' },
  { id: 'firmante', etiqueta: 'Firmantes' },
  { id: 'tipoMaterial', etiqueta: 'Tipos de material' },
];

/** HU-009 — PF-012: valores reutilizables que después se seleccionan al crear o editar un
 * curso. Solo una sección es visible a la vez (ver Figma EP02-PF-012). */
@Component({
  selector: 'app-informacion-base',
  imports: [ReactiveFormsModule],
  templateUrl: './informacion-base.html',
  styleUrl: './informacion-base.scss',
})
export class InformacionBase {
  private readonly api = inject(InformacionBaseApiService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly detector = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pestanas = PESTANAS;
  protected readonly tabActiva = signal<TabInformacionBase>('tipoCurso');
  protected readonly mostrarTodos = signal(false);

  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly errorFormulario = signal<string | null>(null);
  /** null: formulario cerrado. 'nuevo': creando. número: editando ese id. */
  protected readonly modoFormulario = signal<'nuevo' | number | null>(null);

  protected readonly tiposCurso = signal<TipoCursoRespuesta[]>([]);
  protected readonly categorias = signal<CategoriaRespuesta[]>([]);
  protected readonly docentes = signal<DocenteRespuesta[]>([]);
  protected readonly entidades = signal<EntidadRespuesta[]>([]);
  protected readonly firmantes = signal<FirmanteRespuesta[]>([]);
  protected readonly tiposMaterial = signal<TipoMaterialRespuesta[]>([]);

  /** Paginación server-side: como solo una pestaña está visible a la vez, basta un único par de
   * señales que se reinicia al cambiar de pestaña o de filtro. */
  protected readonly pagina = signal(0);
  protected readonly totalPaginas = signal(0);
  private static readonly TAMANO_PAGINA = 20;

  protected readonly formTipoCurso = this.fb.group({
    codigo: ['', [Validators.required, Validators.maxLength(50)]],
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    orden: [0, [Validators.required]],
  });

  protected readonly formCategoria = this.fb.group({
    codigo: ['', [Validators.required, Validators.maxLength(50)]],
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    orden: [0, [Validators.required]],
  });

  protected readonly formDocente = this.fb.group({
    nombres: ['', [Validators.required, Validators.maxLength(120), nombrePropioValidator]],
    apellidoPaterno: ['', [Validators.required, Validators.maxLength(80), nombrePropioValidator]],
    apellidoMaterno: ['', [Validators.maxLength(80), nombrePropioValidator]],
    fotoUrl: ['', [Validators.maxLength(300)]],
    cargoProfesional: ['', [Validators.required, Validators.maxLength(180)]],
    biografiaProfesional: ['', []],
  });

  protected readonly formEntidad = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(200)]],
    logoUrl: ['', [Validators.maxLength(300)]],
  });

  protected readonly formFirmante = this.fb.group({
    nombres: ['', [Validators.required, Validators.maxLength(120), nombrePropioValidator]],
    apellidoPaterno: ['', [Validators.required, Validators.maxLength(80), nombrePropioValidator]],
    apellidoMaterno: ['', [Validators.maxLength(80), nombrePropioValidator]],
    cargoFirma: ['', [Validators.required, Validators.maxLength(180)]],
    imagenFirmaUrl: ['', [Validators.maxLength(300)]],
  });

  protected readonly formTipoMaterial = this.fb.group({
    codigo: ['', [Validators.required, Validators.maxLength(30)]],
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    descripcion: ['', []],
  });

  constructor() {
    this.cargarPestanaActiva();

    for (const form of [this.formDocente, this.formFirmante]) {
      for (const nombre of ['nombres', 'apellidoPaterno', 'apellidoMaterno'] as const) {
        const control = form.controls[nombre];
        control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((valor) => {
          const mayuscula = valor.toLocaleUpperCase('es-PE');
          if (valor !== mayuscula) {
            control.setValue(mayuscula, { emitEvent: false });
          }
        });
      }
    }
  }

  protected get tituloPestanaActiva(): string {
    return this.pestanas.find((p) => p.id === this.tabActiva())?.etiqueta ?? '';
  }

  protected cambiarPestana(id: TabInformacionBase): void {
    if (this.tabActiva() === id) {
      return;
    }
    this.tabActiva.set(id);
    this.pagina.set(0);
    this.cerrarFormulario();
    this.cargarPestanaActiva();
  }

  protected alternarMostrarTodos(): void {
    this.mostrarTodos.update((valor) => !valor);
    this.pagina.set(0);
    this.cargarPestanaActiva();
  }

  protected irAPagina(pagina: number): void {
    if (pagina < 0 || pagina >= this.totalPaginas()) {
      return;
    }
    this.pagina.set(pagina);
    this.cargarPestanaActiva();
  }

  protected abrirCrear(): void {
    this.errorFormulario.set(null);
    this.resetearFormularioActivo();
    this.modoFormulario.set('nuevo');
  }

  protected abrirEditar(id: number): void {
    this.errorFormulario.set(null);
    const tab = this.tabActiva();
    if (tab === 'tipoCurso') {
      const item = this.tiposCurso().find((t) => t.id === id);
      if (item) this.formTipoCurso.setValue({ codigo: item.codigo, nombre: item.nombre, orden: item.orden });
    } else if (tab === 'categoria') {
      const item = this.categorias().find((t) => t.id === id);
      if (item) this.formCategoria.setValue({ codigo: item.codigo, nombre: item.nombre, orden: item.orden });
    } else if (tab === 'docente') {
      const item = this.docentes().find((t) => t.personaId === id);
      if (item) {
        this.formDocente.setValue({
          nombres: item.nombres,
          apellidoPaterno: item.apellidoPaterno,
          apellidoMaterno: item.apellidoMaterno ?? '',
          fotoUrl: item.fotoUrl ?? '',
          cargoProfesional: item.cargoProfesional,
          biografiaProfesional: item.biografiaProfesional ?? '',
        });
      }
    } else if (tab === 'entidad') {
      const item = this.entidades().find((t) => t.id === id);
      if (item) this.formEntidad.setValue({ nombre: item.nombre, logoUrl: item.logoUrl ?? '' });
    } else if (tab === 'firmante') {
      const item = this.firmantes().find((t) => t.id === id);
      if (item) {
        this.formFirmante.setValue({
          nombres: item.nombres,
          apellidoPaterno: item.apellidoPaterno,
          apellidoMaterno: item.apellidoMaterno ?? '',
          cargoFirma: item.cargoFirma,
          imagenFirmaUrl: item.imagenFirmaUrl ?? '',
        });
      }
    } else if (tab === 'tipoMaterial') {
      const item = this.tiposMaterial().find((t) => t.id === id);
      if (item) this.formTipoMaterial.setValue({ codigo: item.codigo, nombre: item.nombre, descripcion: item.descripcion ?? '' });
    }
    this.modoFormulario.set(id);
  }

  protected cerrarFormulario(): void {
    this.modoFormulario.set(null);
    this.errorFormulario.set(null);
  }

  private resetearFormularioActivo(): void {
    switch (this.tabActiva()) {
      case 'tipoCurso': this.formTipoCurso.reset({ codigo: '', nombre: '', orden: 0 }); break;
      case 'categoria': this.formCategoria.reset({ codigo: '', nombre: '', orden: 0 }); break;
      case 'docente': this.formDocente.reset({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', fotoUrl: '', cargoProfesional: '', biografiaProfesional: '' }); break;
      case 'entidad': this.formEntidad.reset({ nombre: '', logoUrl: '' }); break;
      case 'firmante': this.formFirmante.reset({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', cargoFirma: '', imagenFirmaUrl: '' }); break;
      case 'tipoMaterial': this.formTipoMaterial.reset({ codigo: '', nombre: '', descripcion: '' }); break;
    }
  }

  protected campoDocenteInvalido(campo: 'nombres' | 'apellidoPaterno' | 'apellidoMaterno'): boolean {
    const control = this.formDocente.controls[campo];
    return control.invalid && control.touched;
  }

  protected campoFirmanteInvalido(campo: 'nombres' | 'apellidoPaterno' | 'apellidoMaterno'): boolean {
    const control = this.formFirmante.controls[campo];
    return control.invalid && control.touched;
  }

  protected guardar(): void {
    const tab = this.tabActiva();
    const modo = this.modoFormulario();
    if (modo === null || this.guardando()) {
      return;
    }

    switch (tab) {
      case 'tipoCurso': this.guardarTipoCurso(modo); break;
      case 'categoria': this.guardarCategoria(modo); break;
      case 'docente': this.guardarDocente(modo); break;
      case 'entidad': this.guardarEntidad(modo); break;
      case 'firmante': this.guardarFirmante(modo); break;
      case 'tipoMaterial': this.guardarTipoMaterial(modo); break;
    }
  }

  private guardarTipoCurso(modo: 'nuevo' | number): void {
    if (this.formTipoCurso.invalid) {
      this.formTipoCurso.markAllAsTouched();
      return;
    }
    const valores = this.formTipoCurso.getRawValue();
    this.guardando.set(true);
    const peticion = modo === 'nuevo'
      ? this.api.crearTipoCurso(valores)
      : this.api.actualizarTipoCurso(modo, valores);
    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarFormulario();
        this.cargarPestanaActiva(true);
      },
      error: (e: HttpErrorResponse) => this.manejarErrorFormulario(e),
    });
  }

  private guardarCategoria(modo: 'nuevo' | number): void {
    if (this.formCategoria.invalid) {
      this.formCategoria.markAllAsTouched();
      return;
    }
    const valores = this.formCategoria.getRawValue();
    this.guardando.set(true);
    const peticion = modo === 'nuevo'
      ? this.api.crearCategoria(valores)
      : this.api.actualizarCategoria(modo, valores);
    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarFormulario();
        this.cargarPestanaActiva(true);
      },
      error: (e: HttpErrorResponse) => this.manejarErrorFormulario(e),
    });
  }

  private guardarDocente(modo: 'nuevo' | number): void {
    if (this.formDocente.invalid) {
      this.formDocente.markAllAsTouched();
      return;
    }
    const v = this.formDocente.getRawValue();
    const peticion = {
      nombres: v.nombres.trim(),
      apellidoPaterno: v.apellidoPaterno.trim(),
      apellidoMaterno: this.textoOpcional(v.apellidoMaterno),
      fotoUrl: this.textoOpcional(v.fotoUrl),
      cargoProfesional: v.cargoProfesional.trim(),
      biografiaProfesional: this.textoOpcional(v.biografiaProfesional),
    };
    this.guardando.set(true);
    const obs = modo === 'nuevo' ? this.api.crearDocente(peticion) : this.api.actualizarDocente(modo, peticion);
    obs.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarFormulario();
        this.cargarPestanaActiva(true);
      },
      error: (e: HttpErrorResponse) => this.manejarErrorFormulario(e),
    });
  }

  private guardarEntidad(modo: 'nuevo' | number): void {
    if (this.formEntidad.invalid) {
      this.formEntidad.markAllAsTouched();
      return;
    }
    const v = this.formEntidad.getRawValue();
    const peticion = { nombre: v.nombre.trim(), logoUrl: this.textoOpcional(v.logoUrl) };
    this.guardando.set(true);
    const obs = modo === 'nuevo' ? this.api.crearEntidad(peticion) : this.api.actualizarEntidad(modo, peticion);
    obs.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarFormulario();
        this.cargarPestanaActiva(true);
      },
      error: (e: HttpErrorResponse) => this.manejarErrorFormulario(e),
    });
  }

  private guardarFirmante(modo: 'nuevo' | number): void {
    if (this.formFirmante.invalid) {
      this.formFirmante.markAllAsTouched();
      return;
    }
    const v = this.formFirmante.getRawValue();
    const peticion = {
      nombres: v.nombres.trim(),
      apellidoPaterno: v.apellidoPaterno.trim(),
      apellidoMaterno: this.textoOpcional(v.apellidoMaterno),
      cargoFirma: v.cargoFirma.trim(),
      imagenFirmaUrl: this.textoOpcional(v.imagenFirmaUrl),
    };
    this.guardando.set(true);
    const obs = modo === 'nuevo' ? this.api.crearFirmante(peticion) : this.api.actualizarFirmante(modo, peticion);
    obs.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarFormulario();
        this.cargarPestanaActiva(true);
      },
      error: (e: HttpErrorResponse) => this.manejarErrorFormulario(e),
    });
  }

  private guardarTipoMaterial(modo: 'nuevo' | number): void {
    if (this.formTipoMaterial.invalid) {
      this.formTipoMaterial.markAllAsTouched();
      return;
    }
    const v = this.formTipoMaterial.getRawValue();
    const peticion = { codigo: v.codigo.trim(), nombre: v.nombre.trim(), descripcion: this.textoOpcional(v.descripcion) };
    this.guardando.set(true);
    const obs = modo === 'nuevo' ? this.api.crearTipoMaterial(peticion) : this.api.actualizarTipoMaterial(modo, peticion);
    obs.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarFormulario();
        this.cargarPestanaActiva(true);
      },
      error: (e: HttpErrorResponse) => this.manejarErrorFormulario(e),
    });
  }

  protected cambiarActivo(id: number, activo: boolean): void {
    const tab = this.tabActiva();
    const recargar = () => this.cargarPestanaActiva(true);
    switch (tab) {
      case 'tipoCurso': this.api.cambiarActivoTipoCurso(id, activo).subscribe(recargar); break;
      case 'categoria': this.api.cambiarActivoCategoria(id, activo).subscribe(recargar); break;
      case 'docente': this.api.cambiarActivoDocente(id, activo).subscribe(recargar); break;
      case 'entidad': this.api.cambiarActivoEntidad(id, activo).subscribe(recargar); break;
      case 'firmante': this.api.cambiarActivoFirmante(id, activo).subscribe(recargar); break;
      case 'tipoMaterial': this.api.cambiarActivoTipoMaterial(id, activo).subscribe(recargar); break;
    }
  }

  /** `forzar`: vuelve a pedir la página actual aunque ya se haya cargado (tras crear, editar o
   * cambiar el estado de un elemento). */
  private cargarPestanaActiva(forzar = false): void {
    const tab = this.tabActiva();
    if (!forzar && this.cargando()) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    const incluirInactivos = this.mostrarTodos();
    const pagina = this.pagina();
    const tamano = InformacionBase.TAMANO_PAGINA;

    const manejar = <T>(obs: Observable<PageResponse<T>>, set: (v: T[]) => void) => {
      obs.subscribe({
        next: (respuesta) => {
          set(respuesta.items);
          this.totalPaginas.set(respuesta.totalPages);
          this.cargando.set(false);
          this.detector.markForCheck();
        },
        error: () => {
          this.error.set('No pudimos cargar la información. Inténtalo nuevamente.');
          this.cargando.set(false);
          this.detector.markForCheck();
        },
      });
    };

    switch (tab) {
      case 'tipoCurso': manejar(this.api.listarTiposCurso(incluirInactivos, pagina, tamano), (v) => this.tiposCurso.set(v)); break;
      case 'categoria': manejar(this.api.listarCategorias(incluirInactivos, pagina, tamano), (v) => this.categorias.set(v)); break;
      case 'docente': manejar(this.api.listarDocentes(incluirInactivos, pagina, tamano), (v) => this.docentes.set(v)); break;
      case 'entidad': manejar(this.api.listarEntidades(incluirInactivos, pagina, tamano), (v) => this.entidades.set(v)); break;
      case 'firmante': manejar(this.api.listarFirmantes(incluirInactivos, pagina, tamano), (v) => this.firmantes.set(v)); break;
      case 'tipoMaterial': manejar(this.api.listarTiposMaterial(incluirInactivos, pagina, tamano), (v) => this.tiposMaterial.set(v)); break;
    }
  }

  private manejarErrorFormulario(error: HttpErrorResponse): void {
    this.guardando.set(false);
    const cuerpo = typeof error.error === 'object' && error.error !== null ? (error.error as ErrorApiAdmin) : null;
    this.errorFormulario.set(cuerpo?.message ?? 'No pudimos guardar los cambios. Inténtalo nuevamente.');
    this.detector.markForCheck();
  }

  private textoOpcional(valor: string): string | null {
    const limpio = valor.trim();
    return limpio.length > 0 ? limpio : null;
  }
}
