# ESEJUR — Frontend

Aplicación Angular de "Escuela Jurídica" (ESEJUR): catálogo público de cursos, panel de alumno y panel administrativo. Consume la API REST del backend Spring Boot. Proyecto académico del Curso Integrador II — Software (UTP).

## Stack técnico

| Componente | Versión / detalle |
|---|---|
| Angular | 21 (standalone, sin NgModules) |
| Detección de cambios | Zoneless por configuración por defecto (no se incluye `zone.js`; el estado se maneja con `signal`/`computed`) |
| Test runner | Vitest, vía el builder `@angular/build:unit-test` |
| Routing | `provideRouter`, 100% lazy loading con `loadComponent` |
| UI | Componentes propios (sin Material/PrimeNG/Bootstrap); `ngx-spinner` para el loader global; `swiper` para el carrusel del catálogo |
| HTTP | `HttpClient` + interceptores funcionales |
| Gestor de paquetes | npm |

## Estructura de carpetas (`src/app/`)

```
core/
├── api/              URL base de la API + modelo genérico de paginación
├── carga/             Spinner global (contador de peticiones activas)
├── dialogo/            Diálogo de confirmación global (reemplaza confirm() nativo)
├── interceptors/       carga-global, credenciales, sesión vencida
├── layout/             Shells por rol: admin, alumno, auth, público
├── notificaciones/     Alertas globales tipo toast
└── session/             Estado de sesión (signals), guards de ruta

features/
├── admin/              Panel administrativo: cursos, usuarios, matrículas, reportes, info base
├── auth/                Acceso, registro, verificación de correo, recuperación de contraseña
├── cuenta/              Panel del alumno y edición de su propio perfil
├── cursos/              Catálogo público y ficha de curso
├── legal/               Páginas estáticas (privacidad, términos)
└── matriculas/          API/modelo de matrícula compartido entre alumno y admin

shared/ui/
├── alerta-global/           Banner de alerta
├── confirmacion-dialog/     Modal de confirmación, montado una sola vez en la raíz
└── modal/                   Shell de modal genérico
```

## Arquitectura de estado y sesión

**`Session`** (`core/session/session.ts`) mantiene el estado con signals: `_usuario` y `_estado: 'cargando' | 'autenticado' | 'visitante'`. El JWT nunca se guarda en localStorage — vive en una cookie HttpOnly, por eso `credencialesInterceptor` fuerza `withCredentials: true` en toda petición. `restaurar()` se llama una sola vez al arrancar la app (vía `provideAppInitializer`), consulta `GET /auth/sesion` y resuelve el estado antes de que el router empiece a navegar.

**Guards** (`CanActivateFn` funcionales): `sessionGuard` exige sesión autenticada (protege `/app/**`); `adminGuard` exige además rol `ADMINISTRADOR` (protege `/admin/**`).

**Interceptores HTTP** (registrados en `app.config.ts`, en este orden):
1. `cargaGlobalInterceptor` — muestra/oculta el spinner global contando peticiones activas en vuelo.
2. `credencialesInterceptor` — fuerza `withCredentials: true` para que la cookie de sesión viaje entre orígenes.
3. `sesionVencidaInterceptor` — captura cualquier 401 inesperado (excluyendo las rutas `/auth/**`, donde un 401 es normal), limpia la sesión local, redirige a `/acceso` y muestra un diálogo de "sesión finalizada".

**`ConfirmacionService`** reemplaza el `confirm()` nativo: `preguntar(opciones): Promise<boolean>`, resuelta por el único `<app-confirmacion-dialog />` montado en `app.html`, consumible desde cualquier componente. **`AlertaGlobalService`** ofrece un canal de toast simple (éxito/error/info) con auto-cierre a los 5 segundos.

## Routing (`app.routes.ts`)

Un único array, 100% lazy (`loadComponent`), organizado por shells de layout:

| Base | Layout | Guard | Hijos |
|---|---|---|---|
| `''` | `LayoutPublico` | — | catálogo, ficha de curso, privacidad, términos |
| `acceso`, `registro` | sin layout | — | pantalla completa, sin header/footer |
| `''` | `LayoutAuth` | — | verificar correo, recuperar/nueva contraseña |
| `app` | `LayoutAlumno` | `sessionGuard` | panel, perfil |
| `admin` | `LayoutAdmin` | `adminGuard` | usuarios, información base, cursos, matrículas, reportes |

Crear/editar usuario se resuelve con **modales dentro del listado** de admin, no con rutas propias.

## Patrón de componentes

100% standalone. Formularios: mezcla de Reactive Forms (`NonNullableFormBuilder`) para formularios grandes y `signal()` sueltos para estado de UI local en formularios anidados dentro de modales (p. ej. módulos/lecciones del editor de curso). Validators custom reutilizados entre features (`registro.validators.ts`, `mi-perfil.validators.ts`).

**Consumo de API**: un servicio `*-api.service.ts` por feature (`providedIn: 'root'`), construyendo la URL desde `API_URL` y exponiendo un método por endpoint, tipado contra interfaces `*Peticion`/`*Respuesta` de un `*.model.ts` hermano. `PageResponse<T>` es el contrato genérico de paginación compartido por todo listado paginado.

El componente más complejo es `CursoEditor` (~1360 líneas): `FormGroup` reactivo para "Información" combinado con decenas de signals para módulos/lecciones/materiales/sesiones en modales, `forkJoin` para paralelizar cargas iniciales, `debounceTime`+`switchMap` para autocompletado y búsqueda.

## Funcionalidades principales

- **Catálogo público** — listado filtrable con carrusel, ficha de curso por URL amigable con panel de precio/matrícula.
- **Autenticación** — acceso, registro (formulario + flujo Google, con desafío anti-robot), verificación de correo, recuperación de contraseña.
- **Cuenta del alumno** — panel con cursos activos y progreso, edición de perfil y seguridad.
- **Admin / Usuarios** — listado paginado; crear y editar en modales.
- **Admin / Información base** — catálogos maestros para crear/editar cursos.
- **Admin / Cursos** — editor con pestañas Información, Contenido, Sesiones, Exámenes, Certificación, Publicación (solo se muestra "Sesiones" si la modalidad no es virtual).
- **Admin / Matrículas** — listado y gestión, matrícula manual con condición económica y motivo.
- **Admin / Reportes** — reporte de matrículas filtrable y exportable (CSV, Excel, PDF).
- **Legal** — páginas estáticas de privacidad y términos.

## Estilos

`src/styles/_tokens.scss` define variables CSS nativas (`:root { --variable }`) como fuente única de verdad — paleta, espaciado en base 8px, radios, sombras, tipografía — sin inventar valores nuevos fuera de ahí. `src/styles/_componentes.scss` implementa el sistema de componentes compartidos con convención BEM-like (`.btn`, `.btn--primario`, `.badge`, `.alerta`, `.card`, etc.), incluido el "editor en árbol" del admin (`.editor-modulo`, `.editor-leccion`, `.editor-material`). Cada componente mantiene además su propio SCSS de alcance local para estilos no reutilizables.

## Testing

28 archivos `*.spec.ts`, corridos con Vitest. Cobertura concentrada en guards, `Session`, los tres layouts/shells, y sobre todo en **auth/registro** (el bloque más probado) y las pantallas de alumno/público. No hay specs aún para los interceptores, `ConfirmacionService`/`AlertaGlobalService`, ni para las features de `admin/cursos`, `admin/matriculas`, `admin/reportes` e `admin/informacion-base`.

```bash
ng test
```

## Build

Builder moderno `@angular/build:application` (esbuild/Vite). Presupuestos en producción: bundle inicial 500 kB (warning) / 1 MB (error); CSS por componente 8 kB (warning) / 12 kB (error). `ng build` sin flags compila en modo producción; `ng serve` sin flags levanta en modo desarrollo. No hay proxy de desarrollo configurado — la comunicación con el backend es directa vía `environment.apiUrl`.

```bash
ng build
```

## Cómo ejecutar el proyecto

**Requisitos**: Node.js compatible con Angular CLI 21, npm. Backend corriendo en paralelo (ver `escuela-juridica-backend/README.md`).

```bash
npm install
npm start      # ng serve, http://localhost:4200
```

En desarrollo, el frontend espera la API en `http://localhost:8080/api` (`src/environments/environment.ts`). El backend debe tener CORS habilitado para `http://localhost:4200`.
