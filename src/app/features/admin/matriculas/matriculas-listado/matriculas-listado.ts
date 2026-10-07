import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatriculaApiService } from '../../../matriculas/matricula-api.service';
import { MatriculaAdministrativa } from '../../../matriculas/matricula.model';
import { AlertaGlobalService } from '../../../../core/notificaciones/alerta-global.service';
import { Modal } from '../../../../shared/ui/modal/modal';
import { AdminUsuariosApiService } from '../../usuarios/admin-usuarios-api.service';
import { UsuarioAdminRespuesta } from '../../usuarios/usuario-admin.model';
import { CursoAdminApiService } from '../../cursos/curso-admin-api.service';
import { CursoResumenRespuesta } from '../../cursos/curso-admin.model';
import { CrearMatriculaAdministrativa } from '../../../matriculas/matricula-api.service';

@Component({ selector: 'app-matriculas-listado', imports: [FormsModule, DatePipe, Modal], templateUrl: './matriculas-listado.html', styleUrl: './matriculas-listado.scss' })
export class MatriculasListado {
  private readonly api = inject(MatriculaApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly alertas = inject(AlertaGlobalService);
  private readonly usuariosApi = inject(AdminUsuariosApiService);
  private readonly cursosApi = inject(CursoAdminApiService);
  protected readonly filas = signal<MatriculaAdministrativa[]>([]);
  protected readonly cargando = signal(true);
  protected texto = '';
  protected estado = '';
  protected readonly alumnos = signal<UsuarioAdminRespuesta[]>([]);
  protected readonly cursos = signal<CursoResumenRespuesta[]>([]);
  protected readonly formularioAbierto = signal(false);
  protected readonly enviando = signal(false);
  protected nueva: CrearMatriculaAdministrativa = { usuarioId: 0, cursoId: 0, condicionEconomica: 'EXONERADO', importe: 0, medio: null, referencia: null, motivo: '' };
  constructor() { this.cargar(); }
  protected cargar(): void {
    this.cargando.set(true);
    this.api.listarAdministrativas(this.texto, this.estado).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: r => { this.filas.set(r); this.cargando.set(false); }, error: () => { this.alertas.mostrar('error', 'No pudimos cargar las matriculas.'); this.cargando.set(false); } });
  }
  protected cancelar(fila: MatriculaAdministrativa): void {
    const motivo = window.prompt(`Indica el motivo para cancelar la matricula de ${fila.alumno}.`);
    if (!motivo?.trim()) return;
    this.api.cancelar(fila.id, motivo.trim()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.alertas.mostrar('exito', 'Matricula cancelada.'); this.cargar(); }, error: e => this.alertas.mostrar('error', e.error?.message ?? 'No pudimos cancelar la matricula.') });
  }
  protected abrirFormulario(): void {
    this.formularioAbierto.set(true);
    this.usuariosApi.listar('', 'ALUMNO', 'TODOS', 0, 50).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(r => this.alumnos.set(r.items));
    this.cursosApi.listar('', 0, 50).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(r =>
      this.cursos.set(r.items.filter(c => c.estadoCodigo === 'PUBLICADO' || c.estadoCodigo === 'EN_CURSO')),
    );
  }
  protected guardar(): void {
    if (!this.nueva.usuarioId || !this.nueva.cursoId || !this.nueva.motivo.trim()) { this.alertas.mostrar('error', 'Selecciona alumno, curso y registra un motivo.'); return; }
    if (this.nueva.condicionEconomica === 'REGISTRADO_MANUAL' && (!this.nueva.importe || !this.nueva.medio?.trim() || !this.nueva.referencia?.trim())) { this.alertas.mostrar('error', 'El registro manual requiere importe, medio y referencia.'); return; }
    this.enviando.set(true);
    this.api.crearAdministrativa(this.nueva).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.enviando.set(false); this.formularioAbierto.set(false); this.alertas.mostrar('exito', 'Matricula registrada.'); this.cargar(); }, error: e => { this.enviando.set(false); this.alertas.mostrar('error', e.error?.message ?? 'No pudimos registrar la matricula.'); } });
  }
}
