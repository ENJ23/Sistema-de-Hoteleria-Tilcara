import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

// Material
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';

// Models y servicios
import { Habitacion } from '../../../models/habitacion.model';
import { HabitacionService } from '../../../services/habitacion.service';

// Componentes
import { HeaderComponent } from '../../../components/layout/header/header.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-detalle-habitacion',
  templateUrl: './detalle-habitacion.component.html',
  styleUrls: ['./detalle-habitacion.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    // Material
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatListModule,
    MatChipsModule,
    MatSnackBarModule,
    // Componentes
    HeaderComponent,
    LoadingSpinnerComponent
  ]
})
export class DetalleHabitacionComponent implements OnInit {
  habitacion: Habitacion | null = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private habitacionService: HabitacionService,
    private snackBar: MatSnackBar,
    private location: Location
  ) { }

  ngOnInit(): void {
    this.obtenerHabitacion();
  }

  obtenerHabitacion(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.mostrarError('ID de habitación no proporcionado');
      return;
    }

    this.loading = true;
    this.habitacionService.getHabitacion(id).subscribe({
      next: (habitacion) => {
        this.habitacion = habitacion;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar la habitación', error);
        this.mostrarError('No se pudo cargar la información de la habitación');
        this.loading = false;
      }
    });
  }

  cambiarDisponibilidad(activa: boolean): void {
    if (!this.habitacion) return;

    this.loading = true;
    this.habitacionService.cambiarDisponibilidad(this.habitacion._id, activa).subscribe({
      next: (habitacionActualizada) => {
        if (this.habitacion) {
          this.habitacion.activa = habitacionActualizada.activa;
        }
        this.mostrarMensaje(`Habitación ${activa ? 'activada' : 'desactivada'}`, 'success');
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cambiar disponibilidad', error);
        this.mostrarError('No se pudo cambiar la disponibilidad de la habitación');
        this.loading = false;
      }
    });
  }

  editarHabitacion(): void {
    if (this.habitacion) {
      this.router.navigate(['/habitaciones/editar', this.habitacion._id]);
    }
  }

  volver(): void {
    this.location.back();
  }

  private mostrarMensaje(mensaje: string, tipo: 'success' | 'error' | 'info'): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      panelClass: [`snackbar-${tipo}`],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  private mostrarError(mensaje: string): void {
    this.mostrarMensaje(mensaje, 'error');
  }
}
