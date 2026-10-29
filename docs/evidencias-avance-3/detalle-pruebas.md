# Detalle de pruebas por archivo — Avance 3

Cada línea es una prueba ejecutada; el estado proviene del reporte de la ejecución.

## EP04 · `src/app/features/aula/aula-resumen/aula-resumen.spec.ts`

HU-022 / HU-026 · Resumen del aula: continuar, bloqueos, próximas sesiones, ingreso a sesión en vivo — 8/8 aprobadas

- ✔ AulaResumen > al entrar al aula no hay una lección abierta y "Continuar" apunta a la primera disponible
- ✔ AulaResumen > con todo completado ya no ofrece continuar
- ✔ AulaResumen > si solo queda una lección bloqueada muestra el motivo en lugar de "Continuar"
- ✔ AulaResumen > identifica el examen que frena el avance y cuenta los calificados pendientes
- ✔ AulaResumen > lista las próximas sesiones en vivo ordenadas por fecha e ignora las ya realizadas
- ✔ AulaResumen > ingresar a una sesión registra la asistencia, abre el enlace y refresca el aula
- ✔ AulaResumen > si el ingreso es rechazado muestra el mensaje del servidor y no abre ninguna ventana
- ✔ AulaResumen > mientras un ingreso está en curso ignora un segundo clic

## EP04 · `src/app/features/aula/aula-sesion.service.spec.ts`

HU-022 · Ingresar al aula, ver módulos y lecciones, continuar el curso — 9/9 aprobadas

- ✔ AulaSesionService > al ingresar al aula pide el temario del curso y muestra el estado de carga hasta recibirlo
- ✔ AulaSesionService > aplana módulos y lecciones en el orden del curso con su posición global y por módulo
- ✔ AulaSesionService > "Continuar" reabre la lección que indica el servidor
- ✔ AulaSesionService > sin lección de continuación válida no hay a dónde continuar
- ✔ AulaSesionService > navega a la lección anterior y a la siguiente a partir de la lección actual
- ✔ AulaSesionService > si el alumno no está matriculado muestra el mensaje real del servidor
- ✔ AulaSesionService > ante una falla sin cuerpo usa un mensaje genérico
- ✔ AulaSesionService > refrescar vuelve a pedir el temario sin mostrar la pantalla de carga
- ✔ AulaSesionService > refrescar sin haber cargado ningún curso no llama al servidor

## EP04 · `src/app/features/leccion/leccion-reproductor-api.service.spec.ts`

HU-023 / HU-024 · Materiales protegidos, progreso de video, completar lección — 5/5 aprobadas

- ✔ LeccionReproductorApiService > lista los materiales de una lección con GET
- ✔ LeccionReproductorApiService > sin matrícula el servidor rechaza los materiales y el error llega al llamador
- ✔ LeccionReproductorApiService > registra el avance del video enviando segundos reproducidos y última posición
- ✔ LeccionReproductorApiService > completa la lección con POST y cuerpo vacío
- ✔ LeccionReproductorApiService > una lección bloqueada no se completa: el motivo del servidor llega al llamador

## EP04 · `src/app/features/sesiones/sesion-alumno-api.service.spec.ts`

HU-026 · Calendario de sesiones e ingreso a una sesión en vivo — 5/5 aprobadas

- ✔ SesionAlumnoApiService > sin fechas pide el calendario sin parámetros (el servidor usa el mes actual)
- ✔ SesionAlumnoApiService > con un rango pide las sesiones entre esas fechas
- ✔ SesionAlumnoApiService > un rango invertido se informa con el mensaje del servidor
- ✔ SesionAlumnoApiService > al ingresar a una sesión en su ventana recibe el enlace de la reunión
- ✔ SesionAlumnoApiService > fuera de la ventana de la sesión el ingreso se rechaza

## EP05 · `src/app/features/certificacion/certificacion-api.service.spec.ts`

HU-032 a HU-034 · Estado de certificación, datos, emisión, mis certificados, verificación — 8/8 aprobadas

- ✔ CertificacionApiService > consulta el estado de certificación de un curso
- ✔ CertificacionApiService > confirma los datos a imprimir con PUT y devuelve la certificación actualizada
- ✔ CertificacionApiService > emite el certificado con POST
- ✔ CertificacionApiService > emitir sin cumplir los requisitos devuelve el motivo del servidor
- ✔ CertificacionApiService > lista solo los certificados del alumno autenticado
- ✔ CertificacionApiService > verifica un certificado por código sin sesión, codificando el código en la URL
- ✔ CertificacionApiService > un código inexistente se informa como 404
- ✔ CertificacionApiService > descarga el PDF privado y lo guarda con el nombre certificado-CODIGO.pdf

## EP05 · `src/app/features/certificacion/certificacion-bloque/certificacion-bloque.spec.ts`

HU-032 · Estado de certificación, confirmar datos y emitir — 9/9 aprobadas

- ✔ CertificacionBloque > al abrir consulta la certificación del curso y muestra por qué todavía no está disponible
- ✔ CertificacionBloque > si no puede consultarla muestra el mensaje del servidor
- ✔ CertificacionBloque > cuando faltan los datos abre el formulario precargado con los nombres de la cuenta
- ✔ CertificacionBloque > no envía los datos si el formulario está incompleto
- ✔ CertificacionBloque > confirma los datos con PUT y pasa a "listo para generar"
- ✔ CertificacionBloque > si el servidor rechaza los datos los conserva en pantalla y muestra el motivo
- ✔ CertificacionBloque > generar el certificado exige confirmar primero y luego lo emite con POST
- ✔ CertificacionBloque > si la emisión falla informa el motivo y mantiene el diálogo abierto
- ✔ CertificacionBloque > con el certificado emitido ofrece la descarga y la abre en el visor privado

## EP05 · `src/app/features/certificacion/mis-certificados/mis-certificados.spec.ts`

HU-033 · Consultar y descargar mis certificados — 6/6 aprobadas

- ✔ MisCertificados > al abrir pide los certificados del alumno autenticado y los muestra
- ✔ MisCertificados > sin certificados emitidos la lista queda vacía sin error
- ✔ MisCertificados > si la carga falla informa el mensaje del servidor
- ✔ MisCertificados > ver abre el visor privado del PDF en una pestaña nueva
- ✔ MisCertificados > un certificado anulado no tiene descarga: ver y descargar no hacen nada
- ✔ MisCertificados > si la descarga del PDF falla avisa al alumno

## EP05 · `src/app/features/certificacion/verificar-certificado/verificar-certificado.spec.ts`

HU-034 · Verificación pública de un certificado — 7/7 aprobadas

- ✔ VerificarCertificado > al abrir sin código no consulta nada y espera a que el usuario lo escriba
- ✔ VerificarCertificado > un enlace con ?codigo= (el del QR) consulta de inmediato y muestra un certificado vigente
- ✔ VerificarCertificado > un certificado anulado se muestra como no válido
- ✔ VerificarCertificado > un código que no existe responde "no encontrado" sin mostrar datos
- ✔ VerificarCertificado > una falla del servidor se distingue de un código inexistente
- ✔ VerificarCertificado > escribir el código a mano lo consulta y lo deja en la URL para poder compartirlo
- ✔ VerificarCertificado > con el campo vacío no consulta y marca el campo como pendiente de completar

## EP05 · `src/app/features/examen/examen-api.service.spec.ts`

HU-028 / HU-029 · Rendir examen: ficha, intento, respuestas, envío — 7/7 aprobadas

- ✔ ExamenApiService > consulta la ficha del examen con GET
- ✔ ExamenApiService > inicia un intento con POST y devuelve el intento en progreso
- ✔ ExamenApiService > no inicia otro intento cuando se agotaron: el servidor explica el motivo
- ✔ ExamenApiService > guarda la respuesta de una pregunta con PUT enviando las alternativas marcadas
- ✔ ExamenApiService > guarda una respuesta abierta enviando el texto
- ✔ ExamenApiService > envía el intento y recibe la nota calificada automáticamente
- ✔ ExamenApiService > consulta un intento ya existente por su identificador

## EP05 · `src/app/features/examen/examen-pantalla.spec.ts`

HU-028 / HU-029 · Rendir examen automático, respuesta abierta pendiente, tiempo agotado — 11/11 aprobadas

- ✔ ExamenPantalla > al abrir carga la ficha del examen y la muestra antes de iniciar un intento
- ✔ ExamenPantalla > si la ficha no se puede abrir muestra el mensaje del servidor
- ✔ ExamenPantalla > iniciar un intento abre la primera pregunta con todo sin responder
- ✔ ExamenPantalla > si no se puede iniciar avisa el motivo y vuelve a cargar la ficha
- ✔ ExamenPantalla > marcar una alternativa guarda la respuesta en el servidor al instante
- ✔ ExamenPantalla > en una selección múltiple marcar dos alternativas las conserva y desmarcar una la quita
- ✔ ExamenPantalla > enviar con todo respondido muestra la nota y si el alumno aprobó
- ✔ ExamenPantalla > un intento no aprobado se muestra como resultado con su nota
- ✔ ExamenPantalla > con una respuesta abierta el intento queda pendiente de revisión, sin nota todavía
- ✔ ExamenPantalla > si el envío falla muestra el error y el alumno puede intentarlo de nuevo
- ✔ ExamenPantalla > al agotarse el tiempo consulta el intento y muestra el resultado cerrado por tiempo

## EP06 · `src/app/features/admin/dashboard/dashboard.spec.ts`

HU-046 · Dashboard administrativo (gráficos, filtros, rango) — 11/11 aprobadas

- ✔ DashboardPantalla > al abrir consulta el año calendario actual sin filtros de curso ni modalidad
- ✔ DashboardPantalla > prepara los datos de cada gráfico: evolución, matrículas por curso, forma de ingreso y pagos
- ✔ DashboardPantalla > los filtros de la URL (curso, modalidad y rango) se aplican en la primera consulta
- ✔ DashboardPantalla > cambiar el rango vuelve a consultar y guarda el filtro en la URL para poder compartirla
- ✔ DashboardPantalla > una fecha final anterior a la inicial no consulta y avisa
- ✔ DashboardPantalla > si el servidor rechaza el rango muestra su mensaje
- ✔ DashboardPantalla > una respuesta que llega tarde no pisa la consulta más reciente
- ✔ DashboardPantalla > cada gráfico puede verse también como tabla
- ✔ DashboardApiService > envía el rango, el curso y la modalidad como parámetros
- ✔ DashboardApiService > sin filtros opcionales solo envía la modalidad vacía
- ✔ DashboardApiService > un usuario sin rol de administrador recibe 403

## EP06 · `src/app/features/admin/excepciones-pago/excepciones-pago.spec.ts`

HU-037 · Excepciones de matrícula y pago — 7/7 aprobadas

- ✔ ExcepcionesPago > al abrir lista las excepciones pendientes, paginadas desde el servidor
- ✔ ExcepcionesPago > filtrar por tipo vuelve a la primera página con ese tipo
- ✔ ExcepcionesPago > si la lista falla informa el error del servidor
- ✔ ExcepcionesPago > revisar una excepción carga su detalle completo
- ✔ ExcepcionesPago > no registra la atención si la descripción es demasiado corta
- ✔ ExcepcionesPago > registra la atención brindada y avisa que el pago y la matrícula no se modificaron
- ✔ ExcepcionesPago > atender dos veces el mismo caso muestra el conflicto del servidor

## EP06 · `src/app/features/admin/reportes/reporte-pagos/reporte-pagos.spec.ts`

HU-042 · Reporte de pagos: filtros, total confirmado, exportación — 10/10 aprobadas

- ✔ ReportePagosPantalla > al abrir carga el detalle, el total confirmado y los medios para el filtro
- ✔ ReportePagosPantalla > solo el pago aprobado suma: el rechazado aparece en el detalle sin sumar
- ✔ ReportePagosPantalla > filtrar por estado vuelve al inicio y repite los mismos filtros en detalle y total
- ✔ ReportePagosPantalla > una fecha final anterior a la inicial no consulta y avisa
- ✔ ReportePagosPantalla > cambiar de página pide esa página y no sale del rango disponible
- ✔ ReportePagosPantalla > limpiar los filtros deja todo en blanco y vuelve a consultar
- ✔ ReportePagosPantalla > si el reporte falla muestra el mensaje del servidor
- ✔ ReportePagosPantalla > exportar a Excel abre la descarga con los mismos filtros de la pantalla
- ✔ ReportePagosApiService > envía los filtros con valor y omite las fechas y el curso vacíos
- ✔ ReportePagosApiService > el total y el Excel usan exactamente los mismos filtros que el detalle

## EP06 · `src/app/features/matriculas/matricula-api.service.spec.ts`

HU-017 / HU-019 / HU-020 / HU-041 · Matrículas: mis cursos, gratuita, administrativa, reporte — 7/7 aprobadas

- ✔ MatriculaApiService > lista los cursos del alumno autenticado
- ✔ MatriculaApiService > matricula gratis en un curso gratuito con POST
- ✔ MatriculaApiService > una matrícula duplicada se informa con el mensaje del servidor
- ✔ MatriculaApiService > la matrícula administrativa envía la condición económica y la confirmación de la advertencia
- ✔ MatriculaApiService > lista las matrículas administrativas filtrando por texto y estado con paginación del servidor
- ✔ MatriculaApiService > cancela una matrícula con PATCH enviando el motivo
- ✔ MatriculaApiService > el reporte de matrículas envía los filtros y la exportación conserva los mismos

## EP06 · `src/app/features/pagos/checkout-pago/checkout-pago.spec.ts`

HU-047 · Checkout: confirmar precio, abrir Culqi, enviar token — 11/11 aprobadas

- ✔ CheckoutPago > carga el curso y los intentos previos y deja la compra lista para confirmar
- ✔ CheckoutPago > si el alumno ya tiene la matrícula activa lo lleva a su panel en lugar de cobrar otra vez
- ✔ CheckoutPago > un curso gratuito no pasa por el pago
- ✔ CheckoutPago > un curso inexistente informa que no se encontró
- ✔ CheckoutPago > sin confirmar el precio no se inicia ningún pago
- ✔ CheckoutPago > confirmado el precio inicia el pago, abre Culqi y al recibir el token lo envía y va al resultado
- ✔ CheckoutPago > si el cobro del token falla avisa y lleva igual a la pantalla de resultado para ver el estado real
- ✔ CheckoutPago > si el precio cambió pide confirmarlo otra vez y vuelve a cargar el precio vigente
- ✔ CheckoutPago > un error al iniciar el pago muestra el mensaje del servidor y no abre Culqi
- ✔ CheckoutPago > con un intento pendiente se reanuda sin volver a confirmar el precio
- ✔ CheckoutPago > muestra los intentos anteriores que no quedaron pendientes

## EP06 · `src/app/features/pagos/culqi-checkout.service.spec.ts`

HU-047 · Configuración y resultados del checkout de Culqi (sin red) — 8/8 aprobadas

- ✔ CulqiCheckoutService > abre el checkout con la llave pública, el monto en céntimos y la orden del intento
- ✔ CulqiCheckoutService > ofrece tarjeta y Yape y deja fuera banca móvil, agentes y cuotéalo
- ✔ CulqiCheckoutService > las billeteras no se ofrecen mientras estén deshabilitadas, sea cual sea el monto
- ✔ CulqiCheckoutService > con tarjeta o Yape cierra el modal y entrega el token para que el servidor cobre
- ✔ CulqiCheckoutService > con una orden (billetera) avisa pero deja el modal abierto para mostrar el QR
- ✔ CulqiCheckoutService > si Culqi informa un error entrega su mensaje para el usuario
- ✔ CulqiCheckoutService > sin mensaje de Culqi usa uno genérico
- ✔ CulqiCheckoutService > si el script de Culqi no carga la operación se rechaza y se puede reintentar

## EP06 · `src/app/features/pagos/pagos-api.service.spec.ts`

HU-047 · Iniciar pago, token, consultar pagos y constancia — 6/6 aprobadas

- ✔ PagosApiService > inicia el pago confirmando el importe vigente que vio el alumno
- ✔ PagosApiService > si el precio cambió el servidor responde PRICE_CHANGED y no se inicia el pago
- ✔ PagosApiService > envía el token del checkout para que el servidor cobre
- ✔ PagosApiService > consulta el estado de un intento y sus intentos por curso
- ✔ PagosApiService > la constancia solo existe para un pago aprobado: otro estado responde 400
- ✔ PagosApiService > reenvía el aviso del resultado con POST

## EP06 · `src/app/features/pagos/resultado-pago/resultado-pago.spec.ts`

HU-047 · Resultado del pago: aprobado, pendiente, rechazado, error — 8/8 aprobadas

- ✔ ResultadoPago > un pago aprobado muestra el resultado y pide la constancia
- ✔ ResultadoPago > un pago rechazado no pide constancia y permite volver a intentarlo
- ✔ ResultadoPago > un pago con error tampoco concede acceso ni genera constancia
- ✔ ResultadoPago > mientras Culqi no comunica el resultado vuelve a consultar cada pocos segundos hasta que cambia
- ✔ ResultadoPago > un pedido que no existe informa que no se encontró
- ✔ ResultadoPago > una falla del servidor muestra un mensaje genérico para reintentar
- ✔ ResultadoPago > reenviar el aviso avisa si el correo salió
- ✔ ResultadoPago > si el aviso no se puede reenviar muestra el motivo del servidor

## EP06 · `src/app/features/reclamaciones/libro-reclamaciones/libro-reclamaciones.spec.ts`

HU-039 · Libro de reclamaciones: validaciones, adjuntos y presentación — 12/12 aprobadas

- ✔ LibroReclamaciones > sin sesión el formulario arranca vacío y no consulta datos de la cuenta
- ✔ LibroReclamaciones > con sesión prellena los datos conocidos para que la persona los revise
- ✔ LibroReclamaciones > si falla la precarga el formulario sigue siendo utilizable
- ✔ LibroReclamaciones > enviar el formulario vacío no llama al servidor y pide revisar los campos
- ✔ LibroReclamaciones > un DNI que no tiene 8 dígitos se marca inválido según el tipo de documento
- ✔ LibroReclamaciones > sin aceptar la declaración jurada el caso no se envía
- ✔ LibroReclamaciones > con todo en regla presenta el caso por la ruta pública y muestra la constancia
- ✔ LibroReclamaciones > con sesión el caso se presenta por la ruta de la cuenta
- ✔ LibroReclamaciones > si el servidor rechaza el caso muestra su mensaje y permite corregir
- ✔ LibroReclamaciones > solo acepta imágenes PNG, JPG o WEBP
- ✔ LibroReclamaciones > rechaza una imagen de más de 5 MB y acepta una válida
- ✔ LibroReclamaciones > permite hasta 10 imágenes

## EP06 · `src/app/features/reclamaciones/reclamaciones-api.service.spec.ts`

HU-039 · Presentar un reclamo (con y sin sesión) — 5/5 aprobadas

- ✔ ReclamacionesApiService > con sesión consulta los datos conocidos para prellenar el formulario
- ✔ ReclamacionesApiService > sin sesión presenta el caso por la ruta pública con los datos como parte JSON "datos"
- ✔ ReclamacionesApiService > con sesión usa la ruta de la cuenta para que el caso quede ligado a ella
- ✔ ReclamacionesApiService > adjunta cada imagen como parte "imagenes" conservando su nombre
- ✔ ReclamacionesApiService > un DNI inválido es rechazado por el servidor y el mensaje llega al llamador
