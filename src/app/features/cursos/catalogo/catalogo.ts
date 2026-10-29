import {
  AfterViewInit,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, of, startWith, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import type { Swiper } from 'swiper/types';
import { CursoApiService } from '../curso-api.service';
import { CodigoEstadoComercial, CursoTarjeta, Modalidad, OpcionFiltro } from '../curso.model';
import {
  claseDisponibilidad,
  claseModalidad,
  etiquetaModalidad,
  formatearFecha,
  formatearPrecio,
} from '../curso-formato.util';

const HERO_IMGS = ['img/catalogo/hero-1.jpg', 'img/catalogo/hero-2.jpg', 'img/catalogo/hero-3.jpg'];

const TAMANO_PAGINA = 9;

type EstadoPantalla = 'cargando' | 'listo' | 'vacio' | 'error';

@Component({
  selector: 'app-catalogo',
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Catalogo implements OnInit, AfterViewInit {
  private readonly cursoApi = inject(CursoApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  protected readonly filtros = this.fb.nonNullable.group({
    texto: '',
    tipo: '',
    categoria: '',
  });

  protected readonly cursos = signal<CursoTarjeta[]>([]);
  protected readonly tipos = signal<OpcionFiltro[]>([]);
  protected readonly categorias = signal<OpcionFiltro[]>([]);
  protected readonly pagina = signal(0);
  protected readonly totalElementos = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly estado = signal<EstadoPantalla>('cargando');

  private readonly valoresFiltros = toSignal(this.filtros.valueChanges, {
    initialValue: this.filtros.getRawValue(),
  });

  protected readonly hayFiltrosAplicados = computed(() => {
    const valores = this.valoresFiltros();
    return valores.texto !== '' || valores.tipo !== '' || valores.categoria !== '';
  });

  protected readonly paginasVisibles = computed(() =>
    Array.from({ length: this.totalPaginas() }, (_, indice) => indice),
  );

  private readonly recargar = new Subject<void>();
  private readonly anclaCatalogo = viewChild<ElementRef<HTMLElement>>('anclaCatalogo');

  ngOnInit(): void {
    this.cursoApi
      .filtros()
      .pipe(
        catchError(() => of({ tipos: [], categorias: [] })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((filtros) => {
        this.tipos.set(filtros.tipos);
        this.categorias.set(filtros.categorias);
      });

    this.filtros.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(
          (anterior, actual) => JSON.stringify(anterior) === JSON.stringify(actual),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.pagina.set(0);
        this.recargar.next();
      });

    this.recargar
      .pipe(
        startWith(undefined),
        switchMap(() => {
          this.estado.set('cargando');
          const valores = this.filtros.getRawValue();
          return this.cursoApi
            .listar({
              texto: valores.texto.trim(),
              tipo: valores.tipo,
              categoria: valores.categoria,
              pagina: this.pagina(),
              tamano: TAMANO_PAGINA,
            })
            .pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((respuesta) => {
        if (respuesta === null) {
          this.cursos.set([]);
          this.totalElementos.set(0);
          this.totalPaginas.set(0);
          this.estado.set('error');
          return;
        }

        this.cursos.set(respuesta.items);
        this.totalElementos.set(respuesta.totalElements);
        this.totalPaginas.set(respuesta.totalPages);
        this.estado.set(respuesta.items.length === 0 ? 'vacio' : 'listo');
      });
  }

  protected irAPagina(pagina: number): void {
    if (pagina < 0 || pagina >= this.totalPaginas() || pagina === this.pagina()) {
      return;
    }
    this.pagina.set(pagina);
    this.recargar.next();
    const ancla = this.anclaCatalogo()?.nativeElement;
    if (ancla) {
      const cabecera = ancla.ownerDocument.querySelector('header');
      // El contenedor comienza justo al terminar el banner. Reservamos solo
      // la cabecera fija; el padding del contenedor separa los filtros.
      ancla.style.scrollMarginTop = `${cabecera?.getBoundingClientRect().height ?? 0}px`;
      ancla.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  protected paginaAnterior(): void {
    this.irAPagina(this.pagina() - 1);
  }

  protected paginaSiguiente(): void {
    this.irAPagina(this.pagina() + 1);
  }

  protected limpiarTodo(): void {
    this.pagina.set(0);
    this.filtros.setValue({ texto: '', tipo: '', categoria: '' });
  }

  protected reintentar(): void {
    this.recargar.next();
  }

  protected claseModalidad(modalidad: Modalidad | null): string {
    return claseModalidad(modalidad);
  }

  protected etiquetaModalidad(modalidad: Modalidad | null): string {
    return etiquetaModalidad(modalidad);
  }

  protected claseDisponibilidad(codigo: CodigoEstadoComercial): string {
    return claseDisponibilidad(codigo);
  }

  protected etiquetaDisponibilidad(curso: CursoTarjeta): string {
    const estado = curso.estadoComercial;
    if (estado.codigo === 'UPCOMING' && estado.fechaInicio) {
      return `Inicia el ${formatearFecha(estado.fechaInicio)}`;
    }
    return estado.etiqueta;
  }

  protected formatearFecha(fecha: string): string {
    return formatearFecha(fecha);
  }

  protected formatearPrecio(monto: number): string {
    return formatearPrecio(monto);
  }

  protected fondoTarjeta(imagen: string | null): string {
    const degradado =
      'linear-gradient(180deg, rgba(16, 24, 40, 0.45) 0%, rgba(16, 24, 40, 0) 55%)';
    return imagen ? `${degradado}, url('${imagen}')` : degradado;
  }

  protected nombresDocentes(curso: CursoTarjeta): string {
    return curso.docentes.map((docente) => docente.nombreCompleto).join(' · ');
  }

  protected readonly heroImgs = HERO_IMGS;
  protected readonly heroIndexActivo = signal(0);

  private readonly heroSwiperRef =
    viewChild<ElementRef<HTMLElement & { swiper: Swiper; initialize(): void }>>('heroSwiper');

  async ngAfterViewInit(): Promise<void> {
    const swiperEl = this.heroSwiperRef()?.nativeElement;
    if (!swiperEl) return;

    const { register } = await import('swiper/element/bundle');
    register();

    Object.assign(swiperEl, {
      loop: true,
      speed: 350,
      slidesPerView: 1,
      autoplay: { delay: 5000, disableOnInteraction: false },
    });
    swiperEl.initialize();
    swiperEl.addEventListener('swiperslidechange', () => {
      this.heroIndexActivo.set(swiperEl.swiper.realIndex);
    });
  }

  protected heroPrev(): void {
    this.heroSwiperRef()?.nativeElement.swiper.slidePrev();
  }

  protected heroNext(): void {
    this.heroSwiperRef()?.nativeElement.swiper.slideNext();
  }

  protected heroIrA(i: number): void {
    this.heroSwiperRef()?.nativeElement.swiper.slideToLoop(i);
  }
}
