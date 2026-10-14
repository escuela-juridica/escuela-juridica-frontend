import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { cargaGlobalInterceptor } from './core/interceptors/carga-global.interceptor';
import { credencialesInterceptor } from './core/interceptors/credenciales.interceptor';
import { sesionVencidaInterceptor } from './core/interceptors/sesion-vencida.interceptor';
import { Session } from './core/session/session';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(
      withInterceptors([cargaGlobalInterceptor, credencialesInterceptor, sesionVencidaInterceptor]),
    ),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    provideAppInitializer(() => firstValueFrom(inject(Session).restaurar())),
  ],
};
