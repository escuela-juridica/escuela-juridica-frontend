import { Routes } from '@angular/router';

import { adminGuard } from './core/session/admin-guard';
import { sessionGuard } from './core/session/session-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./core/layout/layout-publico/layout-publico').then((m) => m.LayoutPublico),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'catalogo' },
      {
        path: 'catalogo',
        loadComponent: () =>
          import('./features/cursos/catalogo/catalogo').then((m) => m.Catalogo),
      }, // PF-001
      {
        path: 'cursos/:urlAmigable',
        loadComponent: () =>
          import('./features/cursos/ficha-curso/ficha-curso').then((m) => m.FichaCurso),
      }, // PF-002
      {
        path: 'privacidad',
        loadComponent: () =>
          import('./features/legal/privacidad/privacidad').then((m) => m.Privacidad),
      }, // PF-011a
      {
        path: 'terminos',
        loadComponent: () =>
          import('./features/legal/terminos/terminos').then((m) => m.Terminos),
      }, // PF-011b
      {
        path: 'libro-de-reclamaciones',
        loadComponent: () =>
          import('./features/reclamaciones/libro-reclamaciones/libro-reclamaciones').then(
            (m) => m.LibroReclamaciones,
          ),
      }, // PF-036 (HU-039)
    ],
  },
  // PF-003/PF-004: sin ningún layout — pantalla completa a su propio ritmo (hero + formulario),
  // igual que en el prototipo (esLogin/esRegistro no llevan header ni footer).
  {
    path: 'acceso',
    loadComponent: () => import('./features/auth/acceso/acceso').then((m) => m.Acceso),
  }, // PF-003
  {
    path: 'registro',
    loadComponent: () => import('./features/auth/registro/registro').then((m) => m.Registro),
  }, // PF-004
  {
    path: '',
    loadComponent: () =>
      import('./core/layout/layout-auth/layout-auth').then((m) => m.LayoutAuth),
    children: [
      {
        path: 'verificar-correo',
        loadComponent: () =>
          import('./features/auth/verificar-correo/verificar-correo').then(
            (m) => m.VerificarCorreo,
          ),
      }, // PF-005
      {
        path: 'recuperar-password',
        loadComponent: () =>
          import('./features/auth/recuperar-password/recuperar-password').then(
            (m) => m.RecuperarPassword,
          ),
      }, // PF-006
      {
        path: 'nueva-password',
        loadComponent: () =>
          import('./features/auth/nueva-password/nueva-password').then(
            (m) => m.NuevaPassword,
          ),
      }, // PF-007
    ],
  },
  {
    path: 'app',
    canActivate: [sessionGuard],
    loadComponent: () =>
      import('./core/layout/layout-alumno/layout-alumno').then((m) => m.LayoutAlumno),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'panel' },
      {
        path: 'panel',
        loadComponent: () => import('./features/cuenta/panel/panel').then((m) => m.Panel),
      }, // PF-008
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/cuenta/mi-perfil/mi-perfil').then((m) => m.MiPerfil),
      }, // PF-009
      {
        path: 'pagar/:urlAmigable',
        loadComponent: () =>
          import('./features/pagos/checkout-pago/checkout-pago').then((m) => m.CheckoutPago),
      }, // PF-017 (HU-047)
      {
        path: 'pagos/:numeroPedido',
        loadComponent: () =>
          import('./features/pagos/resultado-pago/resultado-pago').then((m) => m.ResultadoPago),
      }, // PF-018 (HU-047)
      {
        path: 'certificados',
        loadComponent: () =>
          import('./features/certificacion/mis-certificados/mis-certificados').then((m) => m.MisCertificados),
      }, // HU-033
      {
        path: 'calendario',
        loadComponent: () =>
          import('./features/calendario/calendario').then((m) => m.Calendario),
      }, // PF-022 (HU-026)
    ],
  },
  // HU-034 — Verificación pública de certificados: sin sesión, por código o por el QR del documento.
  {
    path: 'verificar-certificado',
    loadComponent: () =>
      import('./core/layout/layout-publico/layout-publico').then((m) => m.LayoutPublico),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/certificacion/verificar-certificado/verificar-certificado').then(
            (m) => m.VerificarCertificado,
          ),
      },
    ],
  },
  // HU-022/023/024 — Aula del curso: dentro del layout del alumno (navbar principal), con el temario
  // compartido por el resumen (PF-020) y el reproductor de lecciones (PF-021) mediante `AulaShell`.
  {
    path: 'aula',
    canActivate: [sessionGuard],
    loadComponent: () =>
      import('./core/layout/layout-alumno/layout-alumno').then((m) => m.LayoutAlumno),
    children: [
      {
        path: ':cursoId',
        loadComponent: () => import('./features/aula/aula-shell/aula-shell').then((m) => m.AulaShell),
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () =>
              import('./features/aula/aula-resumen/aula-resumen').then((m) => m.AulaResumen),
          }, // PF-020
          {
            path: 'lecciones/:leccionId',
            loadComponent: () =>
              import('./features/leccion/leccion-reproductor').then((m) => m.LeccionReproductor),
          }, // PF-021
          {
            path: 'examenes/:examenId',
            loadComponent: () => import('./features/examen/examen-pantalla').then((m) => m.ExamenPantalla),
          }, // HU-028 / HU-029
        ],
      },
    ],
  },
  // EP02: HU-008 (usuarios), HU-009 (información base, bajo "Configuración") y HU-010 (cursos).
  // El resto del panel administrativo queda pendiente.
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./core/layout/layout-admin/layout-admin').then((m) => m.LayoutAdmin),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/dashboard/dashboard').then((m) => m.DashboardPantalla),
      }, // PF-040 (HU-046)
      {
        // Crear y editar usuario se hacen en modales dentro del listado, no en rutas aparte.
        path: 'usuarios',
        loadComponent: () =>
          import('./features/admin/usuarios/usuarios-listado/usuarios-listado').then(
            (m) => m.UsuariosListado,
          ),
      },
      {
        path: 'informacion-base',
        loadComponent: () =>
          import('./features/admin/informacion-base/informacion-base').then(
            (m) => m.InformacionBase,
          ),
      },
      {
        path: 'cursos',
        loadComponent: () =>
          import('./features/admin/cursos/cursos-listado/cursos-listado').then(
            (m) => m.CursosListado,
          ),
      },
      {
        path: 'cursos/:id',
        loadComponent: () =>
          import('./features/admin/cursos/curso-editor/curso-editor').then((m) => m.CursoEditor),
      },
      {
        path: 'matriculas',
        loadComponent: () =>
          import('./features/admin/matriculas/matriculas-listado/matriculas-listado').then(
            (m) => m.MatriculasListado,
          ),
      },
      {
        path: 'reportes/asistencia',
        loadComponent: () =>
          import('./features/admin/reportes/reporte-asistencia/reporte-asistencia').then(
            (m) => m.ReporteAsistenciaPantalla,
          ),
      }, // PF-039 (HU-045)
      { path: 'evaluaciones', pathMatch: 'full', redirectTo: 'evaluaciones/pendientes' },
      {
        path: 'evaluaciones/pendientes',
        loadComponent: () =>
          import('./features/admin/evaluaciones/bandeja-pendientes/bandeja-pendientes').then(
            (m) => m.BandejaPendientes,
          ),
      }, // HU-030
      {
        path: 'evaluaciones/intentos/:intentoId',
        loadComponent: () =>
          import('./features/admin/evaluaciones/revision-intento/revision-intento').then(
            (m) => m.RevisionIntentoPantalla,
          ),
      }, // HU-030
      {
        path: 'certificados',
        loadComponent: () =>
          import('./features/admin/certificados/gestion-certificados/gestion-certificados').then(
            (m) => m.GestionCertificados,
          ),
      }, // PF-033 (HU-035)
      {
        path: 'certificados/manual/:matriculaId',
        loadComponent: () =>
          import('./features/admin/certificados/emision-manual/emision-manual').then((m) => m.EmisionManual),
      }, // PF-034 (HU-035)
      {
        path: 'certificados/:certificadoId',
        loadComponent: () =>
          import('./features/admin/certificados/correccion-certificado/correccion-certificado').then(
            (m) => m.CorreccionCertificado,
          ),
      }, // PF-034 (HU-036)
      {
        path: 'excepciones-pago',
        loadComponent: () =>
          import('./features/admin/excepciones-pago/excepciones-pago').then((m) => m.ExcepcionesPago),
      }, // PF-035 (HU-037)
      {
        path: 'reclamaciones',
        loadComponent: () =>
          import('./features/admin/reclamaciones/bandeja-reclamaciones/bandeja-reclamaciones').then(
            (m) => m.BandejaReclamaciones,
          ),
      }, // PF-037 (HU-040)
      {
        path: 'reclamaciones/:id',
        loadComponent: () =>
          import('./features/admin/reclamaciones/detalle-reclamacion/detalle-reclamacion').then(
            (m) => m.DetalleReclamacion,
          ),
      }, // PF-038 (HU-040)
      {
        path: 'reportes/pagos',
        loadComponent: () =>
          import('./features/admin/reportes/reporte-pagos/reporte-pagos').then((m) => m.ReportePagosPantalla),
      }, // HU-042
      {
        path: 'reportes/certificados',
        loadComponent: () =>
          import('./features/admin/reportes/reporte-certificados/reporte-certificados').then(
            (m) => m.ReporteCertificadosPantalla,
          ),
      }, // HU-044
      {
        path: 'reportes/academico',
        loadComponent: () =>
          import('./features/admin/reportes/reporte-academico/reporte-academico').then(
            (m) => m.ReporteAcademicoPantalla,
          ),
      }, // HU-043
      {
        path: 'matriculas/:matriculaId/academico',
        loadComponent: () =>
          import('./features/admin/matriculas/seguimiento-academico/seguimiento-academico').then(
            (m) => m.SeguimientoAcademico,
          ),
      }, // HU-031
      {
        path: 'reportes/matriculas',
        loadComponent: () =>
          import('./features/admin/reportes/reporte-matriculas/reporte-matriculas').then(
            (m) => m.ReporteMatriculas,
          ),
      },
    ],
  },
];
