import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { AccesoApiService } from '../../features/auth/acceso/acceso-api.service';

export interface UsuarioSesion {
  usuarioId?: number;
  nombreCompleto: string;
  correo: string;
  rolPrincipal: 'ALUMNO' | 'ADMINISTRADOR';
  requiereCambioContrasena?: boolean;
}

type EstadoSesion = 'cargando' | 'autenticado' | 'visitante';

@Injectable({
  providedIn: 'root',
})
export class Session {
  private readonly accesoApi = inject(AccesoApiService);

  private readonly _usuario = signal<UsuarioSesion | null>(null);
  private readonly _estado = signal<EstadoSesion>('cargando');

  readonly usuario = this._usuario.asReadonly();
  readonly estado = this._estado.asReadonly();
  readonly cargandoInicial = computed(() => this._estado() === 'cargando');
  readonly estaAutenticado = computed(() => this._estado() === 'autenticado');

  iniciarSesion(usuario: UsuarioSesion): void {
    this._usuario.set(usuario);
    this._estado.set('autenticado');
  }

  actualizarNombre(nombreCompleto: string): void {
    const actual = this._usuario();
    if (actual) {
      this._usuario.set({ ...actual, nombreCompleto });
    }
  }

  restaurar(): Observable<void> {
    return this.accesoApi.sesion().pipe(
      tap((usuario) => this.iniciarSesion(usuario)),
      map(() => undefined),
      catchError(() => {
        this._usuario.set(null);
        this._estado.set('visitante');
        return of(undefined);
      }),
    );
  }

  cerrarSesion(): Observable<void> {
    return this.accesoApi.cerrar().pipe(
      catchError(() => of(undefined)),
      tap(() => this.limpiarLocal()),
    );
  }

  limpiarLocal(): void {
    this._usuario.set(null);
    this._estado.set('visitante');
  }
}
