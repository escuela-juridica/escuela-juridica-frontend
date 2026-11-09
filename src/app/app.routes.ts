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
      },
      {
        path: 'cursos/:urlAmigable',
        loadComponent: () =>
          import('./features/cursos/ficha-curso/ficha-curso').then((m) => m.FichaCurso),
      },
      {
        path: 'privacidad',
        loadComponent: () =>
          import('./features/legal/privacidad/privacidad').then((m) => m.Privacidad),
      },
      {
        path: 'terminos',
        loadComponent: () =>
          import('./features/legal/terminos/terminos').then((m) => m.Terminos),
      },
      {
        path: 'libro-de-reclamaciones',
        loadComponent: () =>
          import('./features/reclamaciones/libro-reclamaciones/libro-reclamaciones').then(
            (m) => m.LibroReclamaciones,
          ),
      },
    ],
  },
  {
    path: 'acceso',
    loadComponent: () => import('./features/auth/acceso/acceso').then((m) => m.Acceso),
  },
  {
    path: 'registro',
    loadComponent: () => import('./features/auth/registro/registro').then((m) => m.Registro),
  },
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
      },
      {
        path: 'recuperar-password',
        loadComponent: () =>
          import('./features/auth/recuperar-password/recuperar-password').then(
            (m) => m.RecuperarPassword,
          ),
      },
      {
        path: 'nueva-password',
        loadComponent: () =>
          import('./features/auth/nueva-password/nueva-password').then(
            (m) => m.NuevaPassword,
          ),
      },
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
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/cuenta/mi-perfil/mi-perfil').then((m) => m.MiPerfil),
      },
      {
        path: 'pagar/:urlAmigable',
        loadComponent: () =>
          import('./features/pagos/checkout-pago/checkout-pago').then((m) => m.CheckoutPago),
      },
      {
        path: 'pagos/:numeroPedido',
        loadComponent: () =>
          import('./features/pagos/resultado-pago/resultado-pago').then((m) => m.ResultadoPago),
      },
      {
        path: 'certificados',
        loadComponent: () =>
          import('./features/certificacion/mis-certificados/mis-certificados').then((m) => m.MisCertificados),
      },
      {
        path: 'calendario',
        loadComponent: () =>
          import('./features/calendario/calendario').then((m) => m.Calendario),
      },
    ],
  },
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
          },
          {
            path: 'lecciones/:leccionId',
            loadComponent: () =>
              import('./features/leccion/leccion-reproductor').then((m) => m.LeccionReproductor),
          },
          {
            path: 'examenes/:examenId',
            loadComponent: () => import('./features/examen/examen-pantalla').then((m) => m.ExamenPantalla),
          },
        ],
      },
    ],
  },
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
      },
      {
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
      },
      { path: 'evaluaciones', pathMatch: 'full', redirectTo: 'evaluaciones/pendientes' },
      {
        path: 'evaluaciones/pendientes',
        loadComponent: () =>
          import('./features/admin/evaluaciones/bandeja-pendientes/bandeja-pendientes').then(
            (m) => m.BandejaPendientes,
          ),
      },
      {
        path: 'evaluaciones/intentos/:intentoId',
        loadComponent: () =>
          import('./features/admin/evaluaciones/revision-intento/revision-intento').then(
            (m) => m.RevisionIntentoPantalla,
          ),
      },
      {
        path: 'certificados',
        loadComponent: () =>
          import('./features/admin/certificados/gestion-certificados/gestion-certificados').then(
            (m) => m.GestionCertificados,
          ),
      },
      {
        path: 'certificados/manual/:matriculaId',
        loadComponent: () =>
          import('./features/admin/certificados/emision-manual/emision-manual').then((m) => m.EmisionManual),
      },
      {
        path: 'certificados/:certificadoId',
        loadComponent: () =>
          import('./features/admin/certificados/correccion-certificado/correccion-certificado').then(
            (m) => m.CorreccionCertificado,
          ),
      },
      {
        path: 'reclamaciones',
        loadComponent: () =>
          import('./features/admin/reclamaciones/bandeja-reclamaciones/bandeja-reclamaciones').then(
            (m) => m.BandejaReclamaciones,
          ),
      },
      {
        path: 'reclamaciones/:id',
        loadComponent: () =>
          import('./features/admin/reclamaciones/detalle-reclamacion/detalle-reclamacion').then(
            (m) => m.DetalleReclamacion,
          ),
      },
      {
        path: 'reportes/pagos',
        loadComponent: () =>
          import('./features/admin/reportes/reporte-pagos/reporte-pagos').then((m) => m.ReportePagosPantalla),
      },
      {
        path: 'reportes/certificados',
        loadComponent: () =>
          import('./features/admin/reportes/reporte-certificados/reporte-certificados').then(
            (m) => m.ReporteCertificadosPantalla,
          ),
      },
      {
        path: 'reportes/academico',
        loadComponent: () =>
          import('./features/admin/reportes/reporte-academico/reporte-academico').then(
            (m) => m.ReporteAcademicoPantalla,
          ),
      },
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
