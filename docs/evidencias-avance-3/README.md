# Evidencias del Avance 3 — Frontend (pruebas de las épicas 4, 5 y 6)

Este directorio documenta las pruebas automatizadas que se agregaron al frontend para demostrar que los flujos principales de las
**épicas 4 (aula, progreso y sesiones)**, **5 (evaluación y certificación)** y **6 (pagos, reclamos y reportes)** fueron
verificados. No se modificó código de producción: todos los archivos nuevos son `*.spec.ts`.

## Resultado de la ejecución

| | Antes del Avance 3 | Ahora |
|---|---|---|
| Archivos de prueba | 25 | **45** (+20) |
| Pruebas | 73 | **233** (+160) |
| Aprobadas | 73 | **233** |
| Fallidas | 0 | **0** |
| Errores no controlados | 0 | **0** |
| Omitidas | 0 | **0** |

- `npm test -- --watch=false`: 45 archivos, 233 pruebas, **0 fallas** — duración de las pruebas 14,0 s (transform, importación y
  entorno incluidos; unos 39 s de punta a punta con la compilación). Ver [`consola/npm-test.log`](consola/npm-test.log).
- `npm run build` (compilación de producción de Angular): **exitosa**, sin errores — ver [`consola/npm-build.log`](consola/npm-build.log).

Las 73 pruebas anteriores siguen presentes y aprobadas; no se eliminó ni se debilitó ninguna.

## Contenido de esta carpeta

| Archivo | Para qué sirve |
|---|---|
| [`matriz-cobertura.md`](matriz-cobertura.md) / [`matriz-cobertura.csv`](matriz-cobertura.csv) | Épica, historia/flujo, archivo de prueba, tipo de prueba y resultado de cada archivo nuevo. |
| [`detalle-pruebas.md`](detalle-pruebas.md) | Cada prueba nueva por nombre, con su estado de la última ejecución. |
| [`consola/`](consola) | Salida de consola de `npm test -- --watch=false` y de `npm run build`. |
| [`resultados/vitest-junit.xml`](resultados/vitest-junit.xml) | Reporte JUnit de la suite completa (`--reporters=junit`). |
| [`resultados/resumen-vitest.txt`](resultados/resumen-vitest.txt) | Pruebas, fallas, errores y tiempo por archivo. |

## Qué demuestra cada épica

**EP04 — Aula, progreso y sesiones (27 pruebas nuevas)**

- *Ingresar al aula, ver módulos y lecciones, continuar el curso* (`aula-sesion.service.spec.ts`, `aula-resumen.spec.ts`): el temario
  se pide por `GET /api/aula/cursos/{id}`, las lecciones se ordenan con su posición global, "Continuar" apunta a la lección que
  indica el servidor, se navega a la anterior y siguiente, y un alumno sin matrícula ve el mensaje real del servidor.
- *Materiales y progreso* (`leccion-reproductor-api.service.spec.ts`): materiales protegidos, avance de video y completar lección,
  incluido el rechazo de una lección bloqueada con su motivo.
- *Calendario y sesión* (`sesion-alumno-api.service.spec.ts`, `aula-resumen.spec.ts`): calendario con y sin rango, rango invertido
  rechazado, ingreso a una sesión que abre el enlace y refresca el aula, e ingreso rechazado fuera de la ventana.

**EP05 — Evaluación y certificación (48 pruebas nuevas)**

- *Estado de certificación* (`certificacion-bloque.spec.ts`, `certificacion-api.service.spec.ts`): requisitos pendientes, datos
  precargados, formulario inválido que no se envía, confirmación de datos con `PUT`, emisión con confirmación previa, errores del servidor.
- *Rendir un examen automático* (`examen-pantalla.spec.ts`, `examen-api.service.spec.ts`): ficha, inicio del intento, guardado
  inmediato de cada respuesta, selección múltiple, envío con nota y aprobado/no aprobado, cierre por tiempo agotado.
- *Resultado o condición pendiente*: un intento con respuesta abierta queda `PENDIENTE_REVISION` sin nota; el rechazo al iniciar o
  enviar se informa con el mensaje del servidor.
- *Consultar certificados y verificación pública* (`mis-certificados.spec.ts`, `verificar-certificado.spec.ts`): lista de
  certificados, descarga solo de los vigentes, verificación por `?codigo=` o escrita a mano, certificado anulado, código inexistente (404) y falla del servidor.

**EP06 — Pagos, reclamos y reportes (85 pruebas nuevas)**

- *Iniciar matrícula pagada y checkout* (`checkout-pago.spec.ts`, `pagos-api.service.spec.ts`, `culqi-checkout.service.spec.ts`):
  el precio se confirma antes de pagar, se abre Culqi con la llave pública y el monto en céntimos, el token se envía al servidor,
  `PRICE_CHANGED` obliga a confirmar de nuevo y los medios ofrecidos son tarjeta y Yape.
- *Resultado de pago y consulta de pagos* (`resultado-pago.spec.ts`): aprobado con constancia, rechazado y error sin constancia,
  pendiente que se vuelve a consultar hasta resolverse, reenvío de aviso.
- *Presentar un reclamo* (`libro-reclamaciones.spec.ts`, `reclamaciones-api.service.spec.ts`): validaciones del formulario, tipo y
  tamaño de imágenes, ruta pública o con sesión, constancia.
- *Dashboard y reporte administrativo* (`dashboard.spec.ts`, `reporte-pagos.spec.ts`, `excepciones-pago.spec.ts`,
  `matricula-api.service.spec.ts`): filtros que viajan al servidor, respuestas tardías que no pisan la consulta más reciente,
  paginación del servidor, total que solo suma pagos confirmados, exportación a Excel y atención de excepciones.

## Cómo están hechas las pruebas

- Angular standalone con **Vitest + TestBed**; las llamadas HTTP se verifican con **`HttpTestingController`** y las URLs se arman con
  `API_URL` del `environment`, igual que en los specs existentes.
- Las pantallas se prueban por **estado, rutas, llamadas HTTP, navegación, validaciones y mensajes funcionales** (no por estilos). Los
  miembros `protected` de los componentes se consultan por nombre desde el spec; no se tocó el código de producción.
- Nada llega a la red: Culqi se reemplaza por un doble en `window`, `window.open`/`scrollTo` y las descargas se espían, y el reloj se
  controla con `vi.useFakeTimers` en las pruebas de tiempo.

## Alcance y pendientes reales

- Sin componente de prueba (solo su servicio HTTP cuando existe): **calendario** (FullCalendar), **reproductor de lección**,
  **layout del aula** (`aula-shell`), cancelación de curso, bandeja y revisión de evaluaciones, gestión de certificados,
  seguimiento académico y los reportes académico, de asistencia, de certificados y de matrículas.
- El checkout nunca carga el script real de Culqi ni abre el modal: se comprueba la configuración que se le entrega y cómo se reacciona
  a cada resultado, no su interfaz.
- Observación (sin cambiar código): `ReportePagosPantalla` consulta el total sin manejador de error; si ese pedido falla, el error queda
  sin tratar mientras el detalle sí informa el suyo.
