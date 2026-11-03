# Matriz de cobertura — Avance 3

Repositorio: `escuela-juridica-frontend`. Solo se listan las pruebas **agregadas** para las épicas 4, 5 y 6; el resultado sale de los
reportes reales de ejecución (ver `resultados/`), no está escrito a mano.

| Épica | Historia/flujo | Archivo de prueba | Tipo de prueba | Resultado |
|---|---|---|---|---|
| EP04 | HU-022 / HU-026 · Resumen del aula: continuar, bloqueos, próximas sesiones, ingreso a sesión en vivo | `src/app/features/aula/aula-resumen/aula-resumen.spec.ts` | Componente (TestBed + HttpTestingController) | 8/8 aprobadas |
| EP04 | HU-022 · Ingresar al aula, ver módulos y lecciones, continuar el curso | `src/app/features/aula/aula-sesion.service.spec.ts` | Servicio HTTP (HttpTestingController) | 9/9 aprobadas |
| EP04 | HU-023 / HU-024 · Materiales protegidos, progreso de video, completar lección | `src/app/features/leccion/leccion-reproductor-api.service.spec.ts` | Servicio HTTP (HttpTestingController) | 5/5 aprobadas |
| EP04 | HU-026 · Calendario de sesiones e ingreso a una sesión en vivo | `src/app/features/sesiones/sesion-alumno-api.service.spec.ts` | Servicio HTTP (HttpTestingController) | 5/5 aprobadas |
| EP05 | HU-032 a HU-034 · Estado de certificación, datos, emisión, mis certificados, verificación | `src/app/features/certificacion/certificacion-api.service.spec.ts` | Servicio HTTP (HttpTestingController) | 8/8 aprobadas |
| EP05 | HU-032 · Estado de certificación, confirmar datos y emitir | `src/app/features/certificacion/certificacion-bloque/certificacion-bloque.spec.ts` | Componente (TestBed + HttpTestingController) | 9/9 aprobadas |
| EP05 | HU-033 · Consultar y descargar mis certificados | `src/app/features/certificacion/mis-certificados/mis-certificados.spec.ts` | Componente (TestBed + HttpTestingController) | 6/6 aprobadas |
| EP05 | HU-034 · Verificación pública de un certificado | `src/app/features/certificacion/verificar-certificado/verificar-certificado.spec.ts` | Componente (TestBed + HttpTestingController) | 7/7 aprobadas |
| EP05 | HU-028 / HU-029 · Rendir examen: ficha, intento, respuestas, envío | `src/app/features/examen/examen-api.service.spec.ts` | Servicio HTTP (HttpTestingController) | 7/7 aprobadas |
| EP05 | HU-028 / HU-029 · Rendir examen automático, respuesta abierta pendiente, tiempo agotado | `src/app/features/examen/examen-pantalla.spec.ts` | Componente (TestBed + HttpTestingController) | 11/11 aprobadas |
| EP06 | HU-046 · Dashboard administrativo (gráficos, filtros, rango) | `src/app/features/admin/dashboard/dashboard.spec.ts` | Componente (TestBed + HttpTestingController) + servicio | 11/11 aprobadas |
| EP06 | HU-037 · Excepciones de matrícula y pago | `src/app/features/admin/excepciones-pago/excepciones-pago.spec.ts` | Componente (TestBed + HttpTestingController) | 7/7 aprobadas |
| EP06 | HU-042 · Reporte de pagos: filtros, total confirmado, exportación | `src/app/features/admin/reportes/reporte-pagos/reporte-pagos.spec.ts` | Componente (TestBed + HttpTestingController) + servicio | 10/10 aprobadas |
| EP06 | HU-017 / HU-019 / HU-020 / HU-041 · Matrículas: mis cursos, gratuita, administrativa, reporte | `src/app/features/matriculas/matricula-api.service.spec.ts` | Servicio HTTP (HttpTestingController) | 7/7 aprobadas |
| EP06 | HU-047 · Checkout: confirmar precio, abrir Culqi, enviar token | `src/app/features/pagos/checkout-pago/checkout-pago.spec.ts` | Componente (TestBed + HttpTestingController) | 11/11 aprobadas |
| EP06 | HU-047 · Configuración y resultados del checkout de Culqi (sin red) | `src/app/features/pagos/culqi-checkout.service.spec.ts` | Servicio (doble de Culqi en window) | 8/8 aprobadas |
| EP06 | HU-047 · Iniciar pago, token, consultar pagos y constancia | `src/app/features/pagos/pagos-api.service.spec.ts` | Servicio HTTP (HttpTestingController) | 6/6 aprobadas |
| EP06 | HU-047 · Resultado del pago: aprobado, pendiente, rechazado, error | `src/app/features/pagos/resultado-pago/resultado-pago.spec.ts` | Componente (TestBed + HttpTestingController) | 8/8 aprobadas |
| EP06 | HU-039 · Libro de reclamaciones: validaciones, adjuntos y presentación | `src/app/features/reclamaciones/libro-reclamaciones/libro-reclamaciones.spec.ts` | Componente (TestBed + HttpTestingController) | 12/12 aprobadas |
| EP06 | HU-039 · Presentar un reclamo (con y sin sesión) | `src/app/features/reclamaciones/reclamaciones-api.service.spec.ts` | Servicio HTTP (HttpTestingController) | 5/5 aprobadas |

**Total de pruebas nuevas:** 160 en 20 archivos.
- EP04: 27 pruebas en 4 archivos
- EP05: 48 pruebas en 6 archivos
- EP06: 85 pruebas en 10 archivos
