import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';

import { TareaService } from '../../services/tarea.service';
import { Tarea } from '../../models/tarea.model';

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './todo-list.component.html',
  styleUrls: ['./todo-list.component.scss']
})
export class TodoListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  tareas: Tarea[] = [];
  cargando = false;
  completando = new Set<string>(); // IDs de tareas que se están completando

  constructor(
    private tareaService: TareaService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.cargarTareasPendientes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarTareasPendientes(): void {
    console.log('🔍 TodoListComponent - Cargando tareas pendientes...');
    this.cargando = true;
    
    this.tareaService.getTareasPendientes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('🔍 TodoListComponent - Respuesta del backend:', response);
          this.tareas = response.data || [];
          console.log('🔍 TodoListComponent - Tareas cargadas:', this.tareas.length);
          this.cargando = false;
        },
        error: (error) => {
          console.error('❌ TodoListComponent - Error al cargar tareas pendientes:', error);
          this.mostrarMensaje('Error al cargar tareas pendientes', 'error');
          this.cargando = false;
        }
      });
  }

  completarTarea(tarea: Tarea): void {
    console.log('🔍 TodoListComponent - Completando tarea:', tarea._id);
    
    if (this.completando.has(tarea._id)) {
      console.log('⚠️ TodoListComponent - Tarea ya se está completando');
      return; // Ya se está completando
    }

    this.completando.add(tarea._id);

    this.tareaService.completarTarea(tarea._id, {
      completadoPor: 'Usuario',
      observaciones: 'Tarea completada desde el dashboard'
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        console.log('✅ TodoListComponent - Tarea completada exitosamente:', response);
        this.mostrarMensaje('Tarea completada exitosamente', 'success');
        
        // Remover la tarea de la lista (ya que se elimina al completarse)
        this.tareas = this.tareas.filter(t => t._id !== tarea._id);
        console.log('🔍 TodoListComponent - Tareas restantes:', this.tareas.length);
        
        this.completando.delete(tarea._id);
      },
      error: (error) => {
        console.error('❌ TodoListComponent - Error al completar tarea:', error);
        this.mostrarMensaje('Error al completar tarea', 'error');
        this.completando.delete(tarea._id);
      }
    });
  }

  obtenerIconoTipo(tipo: string): string {
    return this.tareaService.obtenerIconoTipo(tipo);
  }

  obtenerColorTipo(tipo: string): string {
    return this.tareaService.obtenerColorTipo(tipo);
  }

  obtenerTiempoTranscurrido(fechaCreacion: Date | string): string {
    return this.tareaService.obtenerTiempoTranscurrido(fechaCreacion);
  }

  estaCompletando(tareaId: string): boolean {
    return this.completando.has(tareaId);
  }

  trackByTareaId(index: number, tarea: Tarea): string {
    return tarea._id;
  }

  private mostrarMensaje(mensaje: string, tipo: 'success' | 'error' = 'success'): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: tipo === 'success' ? 'success-snackbar' : 'error-snackbar'
    });
  }
}
