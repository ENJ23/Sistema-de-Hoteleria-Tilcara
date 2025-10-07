import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

// Material
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort, Sort } from '@angular/material/sort';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// Models y servicios
import { 
  Habitacion, 
  EstadoHabitacion, 
  TipoHabitacion,
  HabitacionFilters 
} from '../../../models/habitacion.model';
import { HabitacionService, HabitacionResponse } from '../../../services/habitacion.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-lista-habitaciones',
  templateUrl: './lista-habitaciones.component.html',
  styleUrls: ['./lista-habitaciones.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    // Material
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatMenuModule,
    MatChipsModule,
    MatSnackBarModule,
    // Components
    ConfirmDialogComponent
  ]
})
export class ListaHabitacionesComponent implements OnInit {
  // Columnas a mostrar en la tabla
  displayedColumns: string[] = ['numero', 'tipo', 'piso', 'capacidad', 'precioActual', 'estado', 'acciones'];
  
  // Fuente de datos para la tabla
  dataSource: MatTableDataSource<Habitacion>;
  
  // Estados de carga y filtros
  loading = false;
  totalHabitaciones = 0;
  pageSize = 10;
  pageIndex = 0;
  sortActive = 'numero';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Filtros
  filtros: HabitacionFilters = {
    estado: '',
    tipo: '',
    piso: undefined,
    precioMin: undefined,
    precioMax: undefined,
    capacidad: undefined,
    busqueda: ''
  };
  
  // Opciones para los selects de filtrado
  estados: EstadoHabitacion[] = [];
  tipos: TipoHabitacion[] = [];
  
  // Para manejar la suscripción
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  /**
   * Obtiene la clase CSS para el badge de estado
   */
  getBadgeClass(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'disponible':
        return 'status-disponible';
      case 'ocupada':
        return 'status-ocupada';
      case 'mantenimiento':
        return 'status-mantenimiento';
      case 'reservada':
        return 'status-reservada';
      default:
        return 'status-default';
    }
  }

  /**
   * Cambia el estado de una habitación
   */
  cambiarEstado(habitacion: Habitacion, nuevoEstado: EstadoHabitacion): void {
    this.habitacionService.cambiarEstadoHabitacion(habitacion._id, nuevoEstado).subscribe({
      next: (habActualizada: Habitacion) => {
        // Actualizar la habitación en la lista
        const index = this.dataSource.data.findIndex(h => h._id === habActualizada._id);
        if (index !== -1) {
          const data = [...this.dataSource.data];
          data[index] = habActualizada;
          this.dataSource.data = data;
        }
        this.snackBar.open('Estado actualizado correctamente', 'Cerrar', { duration: 3000 });
      },
      error: (error: any) => {
        console.error('Error al actualizar el estado', error);
        this.snackBar.open(
          'Error al actualizar el estado. Por favor, intente nuevamente.',
          'Cerrar',
          { duration: 5000, panelClass: ['error-snackbar'] }
        );
      }
    });
  }

  /**
   * Muestra el diálogo de confirmación para eliminar una habitación
   */
  confirmarEliminacion(habitacion: Habitacion): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        titulo: 'Confirmar eliminación',
        mensaje: `¿Está seguro de que desea eliminar la habitación ${habitacion.numero}?`,
        colorBotonConfirmar: 'warn',
        textoBotonConfirmar: 'Eliminar',
        textoBotonCancelar: 'Cancelar',
        tipo: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.eliminarHabitacion(habitacion._id);
      }
    });
  }

  /**
   * Elimina una habitación
   */
  private eliminarHabitacion(id: string): void {
    this.habitacionService.deleteHabitacion(id).subscribe({
      next: () => {
        this.snackBar.open('Habitación eliminada correctamente', 'Cerrar', { duration: 3000 });
        this.cargarHabitaciones();
      },
      error: (error: any) => {
        console.error('Error al eliminar la habitación', error);
        this.snackBar.open(
          'Error al eliminar la habitación. Por favor, intente nuevamente.',
          'Cerrar',
          { duration: 5000, panelClass: ['error-snackbar'] }
        );
      }
    });
  }

  constructor(
    private habitacionService: HabitacionService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    // Inicializar el dataSource
    this.dataSource = new MatTableDataSource<Habitacion>([]);
    
    // Configurar el debounce para la búsqueda
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.pageIndex = 0; // Reiniciar a la primera página
      this.cargarHabitaciones();
    });
  }

  ngOnInit(): void {
    this.estados = this.habitacionService.getEstadosHabitacion();
    this.tipos = this.habitacionService.getTiposHabitacion();
    
    // Cargar habitaciones iniciales
    this.cargarHabitaciones();
    
    // Suscribirse a cambios en los parámetros de consulta para detectar actualizaciones
    this.route.queryParams
      .pipe(
        takeUntil(this.destroy$),
        // Opcional: agregar debounce si hay muchos parámetros que cambian rápidamente
        debounceTime(100)
      )
      .subscribe(() => {
        // Recargar habitaciones cuando cambian los parámetros de consulta
        this.cargarHabitaciones();
      });
  }

  ngAfterViewInit() {
    // Configurar el ordenamiento
    if (this.sort) {
      this.dataSource.sort = this.sort;
      this.sort.sortChange.pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.pageIndex = 0;
        this.sortActive = this.sort.active;
        this.sortDirection = this.sort.direction as 'asc' | 'desc';
        this.cargarHabitaciones();
      });
    }

    // Configurar la paginación
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
      this.paginator.page.pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.pageIndex = this.paginator.pageIndex;
        this.pageSize = this.paginator.pageSize;
        this.cargarHabitaciones();
      });
    }
  }
  
  ngOnDestroy() {
    // Limpiar suscripciones
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Aplica los filtros de búsqueda
   */
  aplicarFiltros(): void {
    this.pageIndex = 0;
    this.cargarHabitaciones();
  }

  /**
   * Limpia todos los filtros
   */
  limpiarFiltros(): void {
    this.filtros = {
      estado: '',
      tipo: '',
      piso: undefined,
      precioMin: undefined,
      precioMax: undefined,
      capacidad: undefined,
      busqueda: ''
    };
    this.aplicarFiltros();
  }

  /**
   * Navega a la página de creación de una nueva habitación
   */
  nuevaHabitacion(): void {
    this.router.navigate(['/habitaciones/nueva']);
  }

  /**
   * Navega a la página de edición de una habitación
   */
  editarHabitacion(id: string): void {
    this.router.navigate(['/habitaciones/editar', id]);
  }

  /**
   * Navega a la página de detalle de una habitación
   */
  verDetalle(id: string): void {
    this.router.navigate(['/habitaciones', id]);
  }


  /**
   * Obtiene el color del badge según el estado de la habitación
   */
  getEstadoColor(estado: EstadoHabitacion): string {
    const colores: Record<EstadoHabitacion, string> = {
      'Disponible': '#4caf50',  // Verde
      'Ocupada': '#f44336',     // Rojo
      'Mantenimiento': '#ff9800', // Naranja
      'Reservada': '#2196f3',    // Azul
      'Fuera de servicio': '#9e9e9e' // Gris
    };
    return colores[estado] || '#9e9e9e';
  }

  /**
   * Obtiene el icono correspondiente al estado de la habitación
   */
  getEstadoIcon(estado: EstadoHabitacion): string {
    const iconos: Record<EstadoHabitacion, string> = {
      'Disponible': 'check_circle',
      'Ocupada': 'event_busy',
      'Mantenimiento': 'build',
      'Reservada': 'event_available',
      'Fuera de servicio': 'block'
    };
    return iconos[estado] || 'help';
  }

  /**
   * Obtiene el número de habitaciones disponibles
   */
  getHabitacionesDisponibles(): number {
    return this.dataSource.data.filter(h => h.estado === 'Disponible').length;
  }

  /**
   * Obtiene el número de habitaciones ocupadas
   */
  getHabitacionesOcupadas(): number {
    return this.dataSource.data.filter(h => h.estado === 'Ocupada').length;
  }

  /**
   * Obtiene el número de habitaciones en mantenimiento
   */
  getHabitacionesMantenimiento(): number {
    return this.dataSource.data.filter(h => h.estado === 'Mantenimiento').length;
  }

  /**
   * Cargar las habitaciones desde el servidor con los filtros actuales
   */
  cargarHabitaciones(): void {
    console.log('Iniciando carga de habitaciones...');
    console.log('Filtros actuales:', this.filtros);
    console.log('Paginación:', { pageIndex: this.pageIndex, pageSize: this.pageSize });
    
    this.loading = true;
    
    this.habitacionService.getHabitaciones(
      this.pageIndex + 1, // Ajustar para la paginación basada en 1 del backend
      this.pageSize,
      this.filtros.estado as EstadoHabitacion,
      this.filtros.tipo as TipoHabitacion,
      this.filtros.busqueda
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: HabitacionResponse) => {
        console.log('Respuesta recibida en el componente:', response);
        console.log('Número de habitaciones recibidas:', response.habitaciones?.length || 0);
        
        // Actualizar los datos del dataSource existente
        this.dataSource.data = response.habitaciones || [];
        this.totalHabitaciones = response.total || 0;
        this.loading = false;
        
        console.log('DataSource después de actualizar:', this.dataSource);
        console.log('Datos en dataSource:', this.dataSource.data);
        console.log('Total de habitaciones:', this.totalHabitaciones);
        
        // Forzar la detección de cambios
        this.dataSource._updateChangeSubscription();
      },
      error: (error) => {
        console.error('Error al cargar las habitaciones', error);
        console.error('Error completo:', JSON.stringify(error, null, 2));
        
        this.snackBar.open(
          'Error al cargar las habitaciones. Por favor, intente nuevamente.',
          'Cerrar',
          { duration: 5000, panelClass: ['error-snackbar'] }
        );
        this.loading = false;
      },
      complete: () => {
        console.log('Suscripción a getHabitaciones completada');
      }
    });
  }

  /**
   * Aplica el filtro de búsqueda en la tabla
   */
  aplicarFiltro(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.filtros.busqueda = filterValue.trim().toLowerCase();
    this.pageIndex = 0;
    this.cargarHabitaciones();
    
    // Resetear el paginador si existe
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }
}
