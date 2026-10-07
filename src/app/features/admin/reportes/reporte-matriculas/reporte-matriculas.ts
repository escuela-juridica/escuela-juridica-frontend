import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatriculaApiService, ReporteMatricula } from '../../../matriculas/matricula-api.service';
@Component({ selector:'app-reporte-matriculas', imports:[FormsModule,DatePipe], templateUrl:'./reporte-matriculas.html', styleUrl:'./reporte-matriculas.scss' })
export class ReporteMatriculas { private readonly api=inject(MatriculaApiService); private readonly destroyRef=inject(DestroyRef); protected readonly filas=signal<ReporteMatricula[]>([]); protected readonly cargando=signal(true); protected texto=''; protected estado=''; constructor(){this.cargar();} protected cargar():void {this.cargando.set(true);this.api.reporte(this.texto,this.estado).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:r=>{this.filas.set(r);this.cargando.set(false);},error:()=>this.cargando.set(false)});} protected exportar():void { window.open(this.api.urlExportacion(this.texto,this.estado),'_blank'); } }
