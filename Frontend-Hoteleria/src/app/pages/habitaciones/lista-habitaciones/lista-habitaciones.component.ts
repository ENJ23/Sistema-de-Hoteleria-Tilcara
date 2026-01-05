import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, forkJoin, map, of, catchError } from 'rxjs';

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
  TipoHabitacion,
  HabitacionFilters
} from '../../../models/habitacion.model';
import { HabitacionService, HabitacionResponse } from '../../../services/habitacion.service';
import { ReservaService } from '../../../services/reserva.service'; // Importar ReservaService
import { Reserva } from '../../../models/reserva.model'; // Importar Reserva model
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

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
    tipo: '',
    piso: undefined,
    precioMin: undefined,
    precioMax: undefined,
    capacidad: undefined,
    busqueda: ''
  };

  // Opciones para los selects de filtrado
  tipos: TipoHabitacion[] = [];

  // Para manejar la suscripción
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  /**
   * Obtiene la clase CSS para el badge de disponibilidad
   */
  getBadgeClass(activa: boolean): string {
    return activa ? 'status-disponible' : 'status-inactivo';
  }

  /**
   * Cambia la disponibilidad de una habitación
   */
  cambiarDisponibilidad(habitacion: Habitacion, activa: boolean): void {
    this.habitacionService.cambiarDisponibilidad(habitacion._id, activa).subscribe({
      next: (habActualizada: Habitacion) => {
        // Actualizar la habitación en la lista
        const index = this.dataSource.data.findIndex(h => h._id === habActualizada._id);
        if (index !== -1) {
          const data = [...this.dataSource.data];
          data[index] = habActualizada;
          this.dataSource.data = data;
        }
        this.snackBar.open('Disponibilidad actualizada correctamente', 'Cerrar', { duration: 3000 });
        // Recargar para verificar disponibilidad real
        this.cargarHabitaciones();
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
      width: '500px',
      data: {
        titulo: 'Confirmar eliminación',
        mensaje: `¿Está seguro de que desea eliminar la habitación ${habitacion.numero}?`,
        colorBotonConfirmar: 'warn',
        textoBotonConfirmar: 'Eliminar',
        textoBotonCancelar: 'Cancelar',
        tipo: 'warn',
        advertencia: 'Esta acción marcará la habitación como inactiva. Si tiene reservas activas, no se podrá eliminar.'
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
      next: (response) => {
        this.snackBar.open('Habitación eliminada correctamente', 'Cerrar', { duration: 3000 });
        this.cargarHabitaciones();
      },
      error: (error: any) => {
        console.error('Error al eliminar la habitación', error);

        // CORREGIDO: Manejar error específico de reservas activas
        if (error.status === 400 && error.error?.reservasActivas > 0) {
          const detalles = error.error.detalles || [];
          const mensaje = `No se puede eliminar la habitación porque tiene ${error.error.reservasActivas} reserva(s) activa(s). ` +
            `Reservas: ${detalles.map((r: any) => `${r.estado} (${r.fechaEntrada} - ${r.fechaSalida})`).join(', ')}`;

          this.snackBar.open(mensaje, 'Cerrar', {
            duration: 8000,
            panelClass: ['error-snackbar']
          });
        } else {
          this.snackBar.open(
            'Error al eliminar la habitación. Por favor, intente nuevamente.',
            'Cerrar',
            { duration: 5000, panelClass: ['error-snackbar'] }
          );
        }
      }
    });
  }

  constructor(
    private habitacionService: HabitacionService,
    private reservaService: ReservaService, // Inyectar ReservaService
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
   * Obtiene el número de habitaciones activas
   */
  getHabitacionesDisponibles(): number {
    return this.dataSource.data.filter(h => h.activa).length;
  }

  /**
   * Obtiene el número de habitaciones inactivas
   */
  getHabitacionesOcupadas(): number {
    return this.dataSource.data.filter(h => !h.activa).length;
  }

  /**
   * Obtiene el número de habitaciones inactivas
   */
  getHabitacionesInactivas(): number {
    return this.dataSource.data.filter(h => !h.activa).length;
  }

  /**
   * Cargar las habitaciones desde el servidor con los filtros actuales
   * Y cruzar con información de reservas activas para el día de hoy
   */
  cargarHabitaciones(): void {
    console.log('Iniciando carga de habitaciones...');
    this.loading = true;

    // Calcular fechas para hoy (para buscar reservas activas)
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0];
    // Para asegurar que cubrimos todo el día, pedimos reservas que solapen hoy/mañana
    // (Ajustar lógica según backend, generalmente fechaInicio=HOY fechaFin=HOY+1 funciona para ver actividad)
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    const mananaStr = manana.toISOString().split('T')[0];

    const filtrosReservas = {
      fechaInicio: hoyStr,
      fechaFin: mananaStr,
      limit: 100 // Traer suficientes para cubrir todas las habitaciones
    };

    forkJoin({
      habitacionesResp: this.habitacionService.getHabitaciones(
        this.pageIndex + 1,
        this.pageSize,
        undefined,
        this.filtros.tipo as TipoHabitacion,
        this.filtros.busqueda
      ),
      reservasResp: this.reservaService.getReservasAll(filtrosReservas, 100, true).pipe(
        map(r => r.reservas || []),
        catchError(() => of([] as Reserva[]))
      )
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ habitacionesResp, reservasResp }) => {
          let habitaciones = habitacionesResp.habitaciones || [];
          this.totalHabitaciones = habitacionesResp.total || 0;

          // --- LÓGICA DE ACTUALIZACIÓN DE ESTADO BASADA EN RESERVAS ---
          const habitacionesOcupadasSet = new Set<string>();

          reservasResp.forEach(r => {
            if (r.estado === 'Cancelada' || r.estado === 'No Show') return;

            const entrada = r.fechaEntrada.split('T')[0];
            const salida = r.fechaSalida.split('T')[0];

            // Si hoy está dentro del rango inclusivo [entrada, salida]
            if (entrada <= hoyStr && salida >= hoyStr) {
              const hid = typeof r.habitacion === 'string' ? r.habitacion : (r.habitacion as any)?._id || (r.habitacion as any)?.id;
              if (hid) habitacionesOcupadasSet.add(hid);
            }
          });

          // Actualizar el estado de la habitación localmente para la vista
          habitaciones = habitaciones.map(h => {
            if (habitacionesOcupadasSet.has(h._id)) {
              // Si tiene reserva activa hoy, forzar estado a 'Ocupada' para la visualización
              // (A menos que esté en Mantenimiento, que quizás tenga prioridad? 
              //  Asumimos Ocupada gana porque hay gente o reservado activamente)
              return { ...h, estado: 'Ocupada' };
            }
            // Si estaba 'Ocupada' en DB pero no tiene reserva hoy, quizás debería ser 'Disponible'?
            // Depende de la lógica de negocio. Por seguridad, si el usuario explícitamente la puso ocupada manual,
            // la dejamos, pero la solicitud pide "Ocupada (realmente ocupada)".
            // Ajuste: Si en DB dice Ocupada pero no está en el Set, ¿la liberamos visualmente? 
            // Conservadoramente: Solo forzamos a Ocupada si hay reserva. Si no hay reserva, dejamos el estado original.
            return h;
          });
          // ------------------------------------------------------------

          this.dataSource.data = habitaciones;
          this.loading = false;
          this.dataSource._updateChangeSubscription();
        },
        error: (error) => {
          console.error('Error al cargar datos', error);
          this.snackBar.open('Error al cargar datos.', 'Cerrar', { duration: 5000, panelClass: ['error-snackbar'] });
          this.loading = false;
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
