import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { Modal } from '../../../../shared/ui/modal/modal';
import { AdminUsuariosApiService } from '../admin-usuarios-api.service';
import { UsuarioCrear } from '../usuario-crear/usuario-crear';
import { UsuarioDetalle } from '../usuario-detalle/usuario-detalle';
import { CrearUsuarioAdminRespuesta, RolUsuarioAdmin, UsuarioAdminRespuesta } from '../usuario-admin.model';
import { claseEstadoCuenta, etiquetaEstadoCuenta } from '../usuario-admin-etiquetas';

/** HU-008 — Gestionar usuarios administrativamente. Listado paginado contra la API real; crear
 * y editar se hacen en modales, no en pantallas aparte.
 * Diseño según el Figma EP02-PF-010-HU-008-Gestión de usuarios. */
@Component({
  selector: 'app-usuarios-listado',
  imports: [FormsModule, Modal, UsuarioCrear, UsuarioDetalle],
  templateUrl: './usuarios-listado.html',
  styleUrl: './usuarios-listado.scss',
})
export class UsuariosListado implements OnInit {
  private readonly api = inject(AdminUsuariosApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly detector = inject(ChangeDetectorRef);

  protected readonly texto = signal('');
  protected readonly filtroRol = signal<RolUsuarioAdmin | 'TODOS'>('TODOS');
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly usuarios = signal<UsuarioAdminRespuesta[]>([]);
  protected readonly pagina = signal(0);
  protected readonly totalPaginas = signal(0);

  /** null: ningún modal abierto. 'nuevo': modal de creación. número: editando ese usuarioId. */
  protected readonly modalAbierto = signal<'nuevo' | number | null>(null);

  protected readonly etiquetaEstadoCuenta = etiquetaEstadoCuenta;
  protected readonly claseEstadoCuenta = claseEstadoCuenta;

  ngOnInit(): void {
    this.cargar();
  }

  protected onBusquedaInput(valor: string): void {
    this.texto.set(valor);
    this.pagina.set(0);
    this.cargar();
  }

  protected onFiltroRolChange(valor: string): void {
    this.filtroRol.set(valor as RolUsuarioAdmin | 'TODOS');
    this.pagina.set(0);
    this.cargar();
  }

  protected irAPagina(pagina: number): void {
    if (pagina < 0 || pagina >= this.totalPaginas()) {
      return;
    }
    this.pagina.set(pagina);
    this.cargar();
  }

  protected abrirCrear(): void {
    this.modalAbierto.set('nuevo');
  }

  protected abrirEditar(usuarioId: number): void {
    this.modalAbierto.set(usuarioId);
  }

  protected cerrarModal(): void {
    this.modalAbierto.set(null);
  }

  /** Solo el número de usuario en edición; null en cualquier otro caso (incluido 'nuevo'). */
  protected get idEnEdicion(): number | null {
    const modal = this.modalAbierto();
    return typeof modal === 'number' ? modal : null;
  }

  /** Una cuenta creada u editada puede no estar en la página actual; recargar es más simple y
   * correcto que intentar insertarla a mano en la lista paginada. */
  protected alCrear(respuesta: CrearUsuarioAdminRespuesta): void {
    this.cargar();
    this.modalAbierto.set(respuesta.usuario.usuarioId);
  }

  protected alActualizar(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api
      .listar(this.texto(), this.filtroRol(), 'TODOS', this.pagina(), 20)
      .pipe(
        finalize(() => {
          this.cargando.set(false);
          this.detector.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (respuesta) => {
          this.usuarios.set(respuesta.items);
          this.totalPaginas.set(respuesta.totalPages);
        },
        error: (error: HttpErrorResponse) => {
          this.error.set(
            error.status === 403
              ? 'No tienes permiso para ver esta información.'
              : 'No pudimos cargar los usuarios. Inténtalo nuevamente.',
          );
        },
      });
  }
}
