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
      { path: '', pathMatch: 'full', redirectTo: 'usuarios' },
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
    ],
  },
];
