import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';

import { API_URL } from '../../../core/api/api.config';
import { DashboardApiService } from './dashboard-api.service';
import { DashboardPantalla } from './dashboard';
import { Dashboard } from './dashboard.model';

const URL_DASHBOARD = `${API_URL}/admin/dashboard`;
const URL_CURSOS = `${API_URL}/admin/reportes/academico/cursos`;

function dashboard(extra: Partial<Dashboard> = {}): Dashboard {
  return {
    desde: '2026-01-01', hasta: '2026-12-31', granularidad: 'MES',
    matriculasPorPeriodo: [{ periodo: '2026-10', etiqueta: 'oct 2026', valor: 3 }],
    matriculasPorCurso: [{ clave: '7', etiqueta: 'Derecho Procesal Penal', valor: 3 }, { clave: '8', etiqueta: 'Función Notarial', valor: 1 }],
    formaIngreso: [
      { clave: 'PAGO_EN_LINEA', etiqueta: 'Pago en línea', valor: 3 },
      { clave: 'REGISTRADO_MANUAL', etiqueta: 'Pago manual registrado', valor: 1 },
      { clave: 'EXONERADO', etiqueta: 'Exonerado', valor: 0 },
      { clave: 'GRATUITA', etiqueta: 'Curso gratuito', valor: 0 },
    ],
    pagosPorPeriodo: [{ periodo: '2026-10', etiqueta: 'oct 2026', monto: 960 }], ...extra,
  };
}

/** EP06 · HU-046 — Dashboard administrativo: cuatro gráficos bajo los mismos filtros, con rango, curso y modalidad. */
describe('DashboardPantalla', () => {
  let fixture: ComponentFixture<DashboardPantalla>;
  let http: HttpTestingController;
  let navegar: ReturnType<typeof vi.spyOn>;

  const leer = <T>(nombre: string): T => (fixture.componentInstance as unknown as Record<string, T>)[nombre];
  const accion = (nombre: string, ...args: unknown[]): void =>
    (fixture.componentInstance as unknown as Record<string, (...a: unknown[]) => void>)[nombre](...args);
  const fijar = (campo: string, valor: unknown): void => {
    (fixture.componentInstance as unknown as Record<string, unknown>)[campo] = valor;
  };

  async function abrir(consulta: Record<string, string> = {}): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [DashboardPantalla],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(consulta) } } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(DashboardPantalla);
    fixture.detectChanges();
    http.expectOne(URL_CURSOS).flush([{ id: 7, etiqueta: 'Derecho Procesal Penal', detalle: 'Virtual', fecha: null }]);
  }

  afterEach(() => {
    vi.restoreAllMocks();
    http.verify();
  });

  it('al abrir consulta el año calendario actual sin filtros de curso ni modalidad', async () => {
    await abrir();

    const anio = new Date().getFullYear();
    const solicitud = http.expectOne((r) => r.url === URL_DASHBOARD);
    expect(solicitud.request.method).toBe('GET');
    expect(solicitud.request.params.get('desde')).toBe(`${anio}-01-01`);
    expect(solicitud.request.params.get('hasta')).toBe(`${anio}-12-31`);
    expect(solicitud.request.params.get('modalidad')).toBe('');
    expect(solicitud.request.params.has('cursoId')).toBe(false);
    solicitud.flush(dashboard());
    fixture.detectChanges();

    expect(leer<() => boolean>('cargando')()).toBe(false);
    expect(leer<() => Dashboard>('datos')().formaIngreso.length).toBe(4);
  });

  it('prepara los datos de cada gráfico: evolución, matrículas por curso, forma de ingreso y pagos', async () => {
    await abrir();
    http.expectOne((r) => r.url === URL_DASHBOARD).flush(dashboard());

    expect(leer<() => { etiqueta: string; valor: number }[]>('evolucion')()).toEqual([{ etiqueta: 'oct 2026', valor: 3 }]);
    expect(leer<() => { etiqueta: string; valor: number }[]>('porCurso')().map((b) => [b.etiqueta, b.valor])).toEqual([
      ['Derecho Procesal Penal', 3], ['Función Notarial', 1],
    ]);
    expect(leer<() => { etiqueta: string; valor: number }[]>('porIngreso')().map((b) => b.valor)).toEqual([3, 1, 0, 0]);
    expect(leer<() => { etiqueta: string; valor: number }[]>('pagos')()).toEqual([{ etiqueta: 'oct 2026', valor: 960 }]);
  });

  it('los filtros de la URL (curso, modalidad y rango) se aplican en la primera consulta', async () => {
    await abrir({ curso: '7', modalidad: 'EN_VIVO', rango: 'ULTIMOS_90' });

    const solicitud = http.expectOne((r) => r.url === URL_DASHBOARD);
    expect(solicitud.request.params.get('cursoId')).toBe('7');
    expect(solicitud.request.params.get('modalidad')).toBe('EN_VIVO');
    solicitud.flush(dashboard({ granularidad: 'DIA' }));
    expect(leer<string>('rango')).toBe('ULTIMOS_90');
  });

  it('cambiar el rango vuelve a consultar y guarda el filtro en la URL para poder compartirla', async () => {
    await abrir();
    http.expectOne((r) => r.url === URL_DASHBOARD).flush(dashboard());

    accion('cambiarRango', 'ANIO_ANTERIOR');

    const solicitud = http.expectOne((r) => r.url === URL_DASHBOARD);
    const anterior = new Date().getFullYear() - 1;
    expect(solicitud.request.params.get('desde')).toBe(`${anterior}-01-01`);
    expect(solicitud.request.params.get('hasta')).toBe(`${anterior}-12-31`);
    solicitud.flush(dashboard());
    expect(navegar).toHaveBeenLastCalledWith([], expect.objectContaining({
      queryParams: expect.objectContaining({ rango: 'ANIO_ANTERIOR' }),
    }));
  });

  it('una fecha final anterior a la inicial no consulta y avisa', async () => {
    await abrir();
    http.expectOne((r) => r.url === URL_DASHBOARD).flush(dashboard());
    fijar('desde', '2026-06-30');
    fijar('hasta', '2026-06-01');

    accion('editarFechas');

    http.expectNone((r) => r.url === URL_DASHBOARD);
    expect(leer<() => string | null>('error')()).toBe('La fecha final no puede ser anterior a la inicial.');
  });

  it('si el servidor rechaza el rango muestra su mensaje', async () => {
    await abrir();

    http.expectOne((r) => r.url === URL_DASHBOARD).flush(
      { message: 'El rango no puede superar 10 años.' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(leer<() => string | null>('error')()).toBe('El rango no puede superar 10 años.');
    expect(leer<() => boolean>('cargando')()).toBe(false);
  });

  it('una respuesta que llega tarde no pisa la consulta más reciente', async () => {
    await abrir();
    const primera = http.expectOne((r) => r.url === URL_DASHBOARD);

    accion('cambiarRango', 'MES');
    const segunda = http.expectOne((r) => r.url === URL_DASHBOARD);
    segunda.flush(dashboard({ granularidad: 'DIA' }));
    primera.flush(dashboard({ granularidad: 'MES' }));

    expect(leer<() => Dashboard>('datos')().granularidad).toBe('DIA');
  });

  it('cada gráfico puede verse también como tabla', async () => {
    await abrir();
    http.expectOne((r) => r.url === URL_DASHBOARD).flush(dashboard());

    expect(accionDevuelve('conTabla', 'pagos')).toBe(false);
    accion('alternarTabla', 'pagos');
    expect(accionDevuelve('conTabla', 'pagos')).toBe(true);
    accion('alternarTabla', 'pagos');
    expect(accionDevuelve('conTabla', 'pagos')).toBe(false);
  });

  function accionDevuelve(nombre: string, ...args: unknown[]): unknown {
    return (fixture.componentInstance as unknown as Record<string, (...a: unknown[]) => unknown>)[nombre](...args);
  }
});

/** EP06 · HU-046 — Consulta del dashboard con filtros opcionales. */
describe('DashboardApiService', () => {
  let servicio: DashboardApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(DashboardApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envía el rango, el curso y la modalidad como parámetros', () => {
    servicio.consultar({ desde: '2026-01-01', hasta: '2026-12-31', cursoId: 7, modalidad: 'VIRTUAL' }).subscribe();

    const solicitud = http.expectOne((r) => r.url === URL_DASHBOARD);
    expect(solicitud.request.params.get('desde')).toBe('2026-01-01');
    expect(solicitud.request.params.get('hasta')).toBe('2026-12-31');
    expect(solicitud.request.params.get('cursoId')).toBe('7');
    expect(solicitud.request.params.get('modalidad')).toBe('VIRTUAL');
    solicitud.flush(dashboard());
  });

  it('sin filtros opcionales solo envía la modalidad vacía', () => {
    servicio.consultar({ desde: '', hasta: '', cursoId: null, modalidad: '' }).subscribe();

    const solicitud = http.expectOne((r) => r.url === URL_DASHBOARD);
    expect(solicitud.request.params.keys()).toEqual(['modalidad']);
    solicitud.flush(dashboard());
  });

  it('un usuario sin rol de administrador recibe 403', () => {
    let estado = 0;
    servicio.consultar({ desde: '', hasta: '', cursoId: null, modalidad: '' }).subscribe({ error: (e) => (estado = e.status) });

    http.expectOne((r) => r.url === URL_DASHBOARD).flush(
      { message: 'No tienes permiso para realizar esta operación' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(estado).toBe(403);
  });
});
