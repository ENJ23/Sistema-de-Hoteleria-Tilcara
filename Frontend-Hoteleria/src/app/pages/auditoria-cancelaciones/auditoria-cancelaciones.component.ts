import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { CancelacionService, CancelacionReserva } from '../../services/cancelacion.service';
import { ReembolsoDialogComponent } from '../../components/reembolso-dialog/reembolso-dialog.component';
import { DetalleCancelacionDialogComponent } from '../../components/detalle-cancelacion-dialog/detalle-cancelacion-dialog.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auditoria-cancelaciones',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatSortModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './auditoria-cancelaciones.component.html',
  styleUrls: ['./auditoria-cancelaciones.component.scss']
})
export class AuditoriaCancelacionesComponent implements OnInit {
  cancelaciones: CancelacionReserva[] = [];
  loading = false;
  totalCancelaciones = 0;

  // Filtros
  filtrosForm: FormGroup;

  // Tabla
  displayedColumns: string[] = [
    'fechaCancelacion',
    'cliente',
    'habitacion',
    'fechas',
    'montoPagado',
    'estadoReembolso',
    'acciones'
  ];

  // Paginación
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 25, 50];

  // Estadísticas
  estadisticas: any = null;

  constructor(
    private cancelacionService: CancelacionService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private authService: AuthService
  ) {
    this.filtrosForm = this.fb.group({
      estadoReembolso: [''],
      fechaInicio: [''],
      fechaFin: ['']
    });
  }

  ngOnInit(): void {
    console.log('🎯 AuditoriaCancelacionesComponent inicializado');

    // Verificar autenticación
    const token = this.authService.getToken();
    const user = this.authService.currentUserValue;
    console.log('🔐 Token disponible:', !!token);
    console.log('👤 Usuario actual:', user);

    this.cargarCancelaciones();
    this.cargarEstadisticas();
  }

  cargarCancelaciones(): void {
    this.loading = true;
    const filtros = this.filtrosForm.value;

    this.cancelacionService.getCancelaciones(filtros).subscribe({
      next: (response) => {
        this.cancelaciones = response.cancelaciones;
        this.totalCancelaciones = response.total;
        this.loading = false;
        console.log('✅ Cancelaciones cargadas:', response);
      },
      error: (error) => {
        console.error('❌ Error al cargar cancelaciones:', error);

        // Manejar diferentes tipos de errores
        if (error.status === 401) {
          this.snackBar.open('🔐 Sesión expirada. Por favor, inicia sesión nuevamente', 'Cerrar', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        } else if (error.status === 403) {
          this.snackBar.open('🔐 No tienes permisos para acceder a esta información', 'Cerrar', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        } else if (error.status === 404) {
          this.snackBar.open('⚠️ Endpoint no disponible. Verifica que el backend esté actualizado', 'Cerrar', {
            duration: 5000,
            panelClass: ['warning-snackbar']
          });
        } else if (error.status === 500) {
          this.snackBar.open('🔧 Error interno del servidor. Verifica que el backend esté funcionando', 'Cerrar', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        } else {
          this.snackBar.open('❌ Error al cargar cancelaciones', 'Cerrar', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }

        this.loading = false;
      }
    });
  }

  cargarEstadisticas(): void {
    this.cancelacionService.getEstadisticasReembolsos().subscribe({
      next: (estadisticas) => {
        this.estadisticas = estadisticas;
        console.log('✅ Estadísticas cargadas:', estadisticas);
      },
      error: (error) => {
        console.error('❌ Error al cargar estadísticas:', error);

        // Fallback: crear estadísticas básicas
        this.estadisticas = {
          estadisticas: [],
          totalCancelaciones: 0,
          totalMontoReembolsos: 0
        };

        // Mostrar mensaje de error solo si no es 404 (endpoint no existe)
        if (error.status !== 404) {
          this.snackBar.open('⚠️ Error al cargar estadísticas. Mostrando datos básicos.', 'Cerrar', {
            duration: 5000,
            panelClass: ['warning-snackbar']
          });
        }
      }
    });
  }

  getCountByStatus(status: string): number {
    if (!this.estadisticas || !this.estadisticas.estadisticas) return 0;
    const stat = this.estadisticas.estadisticas.find((s: any) => s._id === status);
    return stat ? stat.count : 0;
  }

  aplicarFiltros(): void {
    this.pageIndex = 0;
    this.cargarCancelaciones();
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset();
    this.pageIndex = 0;
    this.cargarCancelaciones();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.cargarCancelaciones();
  }

  procesarReembolso(cancelacion: CancelacionReserva): void {
    const dialogRef = this.dialog.open(ReembolsoDialogComponent, {
      width: '500px',
      data: { cancelacion }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.snackBar.open('✅ Reembolso procesado exitosamente', 'Cerrar', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.cargarCancelaciones();
        this.cargarEstadisticas();
      }
    });
  }

  verDetalles(cancelacion: CancelacionReserva): void {
    const dialogRef = this.dialog.open(DetalleCancelacionDialogComponent, {
      width: '900px',
      maxHeight: '90vh',
      data: { cancelacion },
      panelClass: 'detalle-cancelacion-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.snackBar.open('✅ Operación completada', 'Cerrar', {
          duration: 2000
        });
        this.cargarCancelaciones();
        this.cargarEstadisticas();
      }
    });
  }

  cerrarSinReembolsar(cancelacion: CancelacionReserva): void {
    const motivo = prompt('Ingrese el motivo por el cual se cierra esta cancelación sin reembolsar:');
    
    if (!motivo || motivo.trim() === '') {
      this.snackBar.open('⚠️ Debe ingresar un motivo', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    const confirmacion = confirm(
      `¿Está seguro de cerrar esta cancelación sin reembolsar?\n\n` +
      `Cliente: ${cancelacion.cliente.nombre} ${cancelacion.cliente.apellido}\n` +
      `Monto pagado: ${this.formatearPrecio(cancelacion.montoPagado)}\n` +
      `Motivo: ${motivo}\n\n` +
      `Esta acción marcará el reembolso como RECHAZADO y no se devolverá dinero al cliente.`
    );

    if (!confirmacion) return;

    this.loading = true;
    this.cancelacionService.cerrarSinReembolsar(cancelacion._id, motivo).subscribe({
      next: () => {
        this.snackBar.open('✅ Cancelación cerrada sin reembolsar', 'Cerrar', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.cargarCancelaciones();
        this.cargarEstadisticas();
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error al cerrar cancelación:', error);
        this.snackBar.open(
          error.error?.message || '❌ Error al cerrar cancelación sin reembolsar',
          'Cerrar',
          {
            duration: 5000,
            panelClass: ['error-snackbar']
          }
        );
        this.loading = false;
      }
    });
  }

  eliminarCancelacion(cancelacion: CancelacionReserva): void {
    const confirmacion = confirm(
      `¿Está seguro de ELIMINAR esta cancelación?\n\n` +
      `Cliente: ${cancelacion.cliente.nombre} ${cancelacion.cliente.apellido}\n` +
      `Habitación: ${cancelacion.habitacion.numero}\n` +
      `Estado: ${cancelacion.estadoReembolso}\n\n` +
      `⚠️ ADVERTENCIA: Esta acción es PERMANENTE y no se puede deshacer.\n` +
      `Solo se pueden eliminar cancelaciones Pendientes o Rechazadas.\n\n` +
      `¿Desea continuar?`
    );

    if (!confirmacion) return;

    this.loading = true;
    this.cancelacionService.eliminarCancelacion(cancelacion._id).subscribe({
      next: () => {
        this.snackBar.open('✅ Cancelación eliminada correctamente', 'Cerrar', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.cargarCancelaciones();
        this.cargarEstadisticas();
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error al eliminar cancelación:', error);
        let mensaje = '❌ Error al eliminar cancelación';
        
        if (error.error?.message) {
          mensaje = error.error.message;
        }
        
        if (error.error?.sugerencia) {
          mensaje += `\n\n💡 ${error.error.sugerencia}`;
        }

        this.snackBar.open(mensaje, 'Cerrar', {
          duration: 7000,
          panelClass: ['error-snackbar']
        });
        this.loading = false;
      }
    });
  }

  puedeCerrarSinReembolsar(cancelacion: CancelacionReserva): boolean {
    return cancelacion.estadoReembolso === 'Pendiente';
  }

  puedeEliminar(cancelacion: CancelacionReserva): boolean {
    return cancelacion.estadoReembolso === 'Pendiente' || cancelacion.estadoReembolso === 'Rechazado';
  }

  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(precio);
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'Pendiente': return 'warn';
      case 'Procesado': return 'primary';
      case 'Completado': return 'accent';
      case 'Rechazado': return 'warn';
      default: return 'basic';
    }
  }

  getEstadoIcon(estado: string): string {
    switch (estado) {
      case 'Pendiente': return 'schedule';
      case 'Procesado': return 'autorenew';
      case 'Completado': return 'check_circle';
      case 'Rechazado': return 'cancel';
      default: return 'help';
    }
  }

  exportarCancelaciones(): void {
    // Implementar exportación
    this.snackBar.open('📊 Exportando cancelaciones...', 'Cerrar', {
      duration: 2000
    });
  }
}
