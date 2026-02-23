import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';

import { TareaService } from '../../services/tarea.service';
import { Tarea } from '../../models/tarea.model';
import { HabitacionService } from '../../services/habitacion.service';
import { Habitacion } from '../../models/habitacion.model';
import { CompletarLimpiezaDialogComponent } from './completar-limpieza-dialog.component';

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule
  ],
  templateUrl: './todo-list.component.html',
  styleUrls: ['./todo-list.component.scss']
})
export class TodoListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  tareas: Tarea[] = [];
  cargando = false;
  creando = false;
  completando = new Set<string>(); // IDs de tareas que se están completando

  tareaForm: FormGroup;
  habitaciones: Habitacion[] = [];

  constructor(
    private tareaService: TareaService,
    private habitacionService: HabitacionService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private dialog: MatDialog
  ) {
    this.tareaForm = this.fb.group({
      tipo: ['otro', Validators.required],
      habitacion: ['', Validators.required],
      descripcion: ['', [Validators.required, Validators.maxLength(200)]]
    });
  }

  ngOnInit(): void {
    this.cargarHabitaciones();
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

  private cargarHabitaciones(): void {
    this.habitacionService.getHabitaciones(1, 200).subscribe({
      next: (response) => {
        this.habitaciones = response.habitaciones || [];
      },
      error: (error) => {
        console.error('❌ TodoListComponent - Error al cargar habitaciones:', error);
        this.mostrarMensaje('Error al cargar habitaciones para tareas', 'error');
      }
    });
  }

  crearTareaManual(): void {
    if (this.tareaForm.invalid || this.creando) {
      return;
    }

    this.creando = true;
    const { tipo, habitacion, descripcion } = this.tareaForm.value;

    this.tareaService.crearTarea({
      tipo,
      habitacion,
      descripcion,
      creadoPor: 'Usuario'
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.mostrarMensaje('Tarea creada exitosamente', 'success');
          const nuevaTarea = (response as any).data as Tarea;
          if (nuevaTarea) {
            this.tareas = [nuevaTarea, ...this.tareas];
          } else {
            this.cargarTareasPendientes();
          }
          this.tareaForm.reset({ tipo: 'otro', habitacion: '', descripcion: '' });
          this.creando = false;
        },
        error: (error) => {
          console.error('❌ TodoListComponent - Error al crear tarea:', error);
          this.mostrarMensaje('Error al crear la tarea', 'error');
          this.creando = false;
        }
      });
  }

  completarTarea(tarea: Tarea): void {
    console.log('🔍 TodoListComponent - Completando tarea:', tarea._id);
    
    if (this.completando.has(tarea._id)) {
      console.log('⚠️ TodoListComponent - Tarea ya se está completando');
      return; // Ya se está completando
    }

    if (tarea.tipo === 'limpieza') {
      const dialogRef = this.dialog.open(CompletarLimpiezaDialogComponent, {
        width: '400px',
        data: { tarea }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.ejecutarCompletarTarea(tarea, result.observaciones, result.configuracionCamas);
        }
      });
    } else {
      this.ejecutarCompletarTarea(tarea, 'Tarea completada desde el dashboard');
    }
  }

  private ejecutarCompletarTarea(tarea: Tarea, observaciones: string, configuracionCamas?: any[]): void {
    this.completando.add(tarea._id);

    this.tareaService.completarTarea(tarea._id, {
      completadoPor: 'Usuario',
      observaciones: observaciones,
      configuracionCamas: configuracionCamas
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

  // Descripción amigable usando datos de la habitación poblada
  obtenerDescripcionTarea(tarea: Tarea): string {
    const numero = (tarea as any)?.habitacion?.numero;
    const tipo = (tarea as any)?.habitacion?.tipo;
    switch (tarea.tipo) {
      case 'limpieza':
        return numero && tipo ? `Limpieza habitación ${numero} - ${tipo}` : 'Limpieza requerida';
      case 'mantenimiento':
        return numero && tipo ? `Mantenimiento habitación ${numero} - ${tipo}` : 'Mantenimiento requerido';
      default:
        return tarea.descripcion || 'Tarea pendiente';
    }
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
