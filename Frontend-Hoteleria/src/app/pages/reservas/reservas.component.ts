import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, finalize } from 'rxjs/operators';

import { ReservaService } from '../../services/reserva.service';
import { HabitacionService } from '../../services/habitacion.service';
import { CancelacionService } from '../../services/cancelacion.service';
import { Reserva, ReservaResponse } from '../../models/reserva.model';
import { Habitacion } from '../../models/habitacion.model';
import { DetalleReservaModalComponent } from '../../components/detalle-reserva-modal/detalle-reserva-modal.component';
import { CancelarReservaDialogComponent } from '../../components/cancelar-reserva-dialog/cancelar-reserva-dialog.component';

// Configuración de formato de fecha DD/MM/YYYY
export const DD_MM_YYYY_FORMAT = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

interface ReservaConDetalles extends Reserva {
  habitacionDetalle?: Habitacion;
  diasEstancia?: number;
  estadoColor?: string;
  estadoIcon?: string;
}

@Component({
  selector: 'app-reservas',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatBadgeModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './reservas.component.html',
  styleUrl: './reservas.component.css',
  providers: [
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMAT },
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' }
  ]
})
export class ReservasComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Datos de la tabla
  dataSource = new MatTableDataSource<ReservaConDetalles>([]);
  displayedColumns: string[] = [
    'cliente',
    'habitacion',
    'fechas',
    'dias',
    'estado',
    'pago',
    'precio',
    'acciones'
  ];

  // Filtros
  filtrosForm: FormGroup;
  estadosReserva = [
    { value: 'Pendiente', label: 'Pendiente', color: '#6f42c1' },
    { value: 'Confirmada', label: 'Confirmada', color: '#17a2b8' },
    { value: 'En curso', label: 'En curso', color: '#28a745' },
    { value: 'Finalizada', label: 'Finalizada', color: '#007bff' },
    { value: 'Cancelada', label: 'Cancelada', color: '#dc3545' },
    { value: 'No Show', label: 'No Show', color: '#6c757d' }
  ];

  // Estados
  loading = false;
  totalReservas = 0;
  reservasFuturas = 0;
  reservasHoy = 0;
  
  // Reembolsos pendientes
  reembolsosPendientes = 0;
  mostrarNotificacionReembolso = false;

  constructor(
    private reservaService: ReservaService,
    private habitacionService: HabitacionService,
    private cancelacionService: CancelacionService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.filtrosForm = this.fb.group({
      estado: [''],
      habitacion: [''],
      fechaInicio: [''],
      fechaFin: [''],
      cliente: ['']
    });
  }

  ngOnInit(): void {
    console.log('🎯 ngOnInit ejecutándose - llamando a cargarReservas()');
    this.cargarReservas();
    this.configurarFiltros();
    this.cargarReembolsosPendientes();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private configurarFiltros(): void {
    this.filtrosForm.valueChanges.subscribe(() => {
      this.aplicarFiltros();
    });
  }

  private cargarReservas(filtros?: any): void {
    console.log('🚀 INICIANDO cargarReservas con filtros:', filtros);
    this.loading = true;
    
    // ✅ CARGAR TODAS LAS RESERVAS SIN FILTRO DE FECHA INICIAL
    const filtrosReserva = filtros || {
      estado: '' // Cargar todos los estados
    };
    
    console.log('🔍 Cargando reservas con filtros:', filtrosReserva);
    
    this.reservaService.getReservas(filtrosReserva, 1, 1000).pipe(
      map((response: ReservaResponse) => {
        console.log('📊 Total reservas en BD:', response.total);
        console.log('📊 Reservas cargadas:', response.reservas.length);
        console.log('📊 Reservas recibidas:', response.reservas);
        
        // ✅ DEVOLVER TODAS LAS RESERVAS SIN FILTRO ADICIONAL
        return response.reservas;
      }),
      catchError(error => {
        console.error('Error al cargar reservas:', error);
        this.snackBar.open('❌ Error al cargar las reservas', 'Cerrar', { duration: 3000 });
        return of([]);
      }),
      finalize(() => this.loading = false)
    ).subscribe(reservas => {
      console.log('📊 Procesando reservas:', reservas.length);
      this.procesarReservas(reservas);
    });
  }

  private procesarReservas(reservas: Reserva[]): void {
    // Verificar si las reservas ya tienen habitaciones pobladas
    const reservasConHabitacionesPobladas = reservas.every(r => 
      typeof r.habitacion === 'object' && r.habitacion !== null
    );
    
    if (reservasConHabitacionesPobladas) {
      // Las habitaciones ya están pobladas, procesar directamente
      console.log('Las habitaciones ya están pobladas en las reservas');
      this.procesarReservasDirectamente(reservas);
    } else {
      // Cargar detalles de habitaciones
      const habitacionIds = [...new Set(reservas.map(r => r.habitacion as string))];
      
      if (habitacionIds.length === 0) {
        this.dataSource.data = [];
        return;
      }

      this.habitacionService.getHabitaciones(1, 1000).subscribe(habitacionResponse => {
        console.log('Habitaciones recibidas:', habitacionResponse);
        console.log('Total habitaciones:', habitacionResponse.habitaciones.length);
        
        const reservasConDetalles: ReservaConDetalles[] = reservas.map(reserva => {
          console.log('Buscando habitación para reserva:', reserva._id, 'habitacionId:', reserva.habitacion);
          
          // Si reserva.habitacion ya es un objeto, usarlo directamente
          // Si es un string, buscar en el array de habitaciones
          let habitacionDetalle: Habitacion | undefined;
          
          if (typeof reserva.habitacion === 'object' && reserva.habitacion !== null) {
            // Ya es un objeto habitación, usarlo directamente
            habitacionDetalle = reserva.habitacion as Habitacion;
            console.log('Habitación ya es objeto:', habitacionDetalle);
          } else {
            // Es un string ID, buscar en el array
            habitacionDetalle = habitacionResponse.habitaciones.find((h: Habitacion) => h._id === reserva.habitacion);
            console.log('Habitación encontrada por ID:', habitacionDetalle);
          }
          
          const diasEstancia = this.calcularDiasEstancia(reserva.fechaEntrada, reserva.fechaSalida);
          const estadoInfo = this.obtenerInfoEstado(reserva.estado);
          
          // ✅ CALCULAR PRECIO POR NOCHE
          const precioPorNoche = diasEstancia > 0 ? reserva.precioTotal / diasEstancia : 0;
          console.log(`💰 Precio por noche calculado: ${precioPorNoche} (precioTotal: ${reserva.precioTotal}, diasEstancia: ${diasEstancia})`);
          
          return {
            ...reserva,
            habitacionDetalle,
            diasEstancia,
            precioPorNoche, // ✅ AGREGAR PRECIO POR NOCHE
            estadoColor: estadoInfo.color,
            estadoIcon: estadoInfo.icon
          };
        });

        console.log('Reservas con detalles:', reservasConDetalles);
        this.dataSource.data = reservasConDetalles;
        this.calcularEstadisticas(reservasConDetalles);
      });
    }
  }

  private procesarReservasDirectamente(reservas: Reserva[]): void {
    const reservasConDetalles: ReservaConDetalles[] = reservas.map(reserva => {
      const habitacionDetalle = reserva.habitacion as Habitacion;
      const diasEstancia = this.calcularDiasEstancia(reserva.fechaEntrada, reserva.fechaSalida);
      const estadoInfo = this.obtenerInfoEstado(reserva.estado);
      
      // ✅ CALCULAR PRECIO POR NOCHE
      const precioPorNoche = diasEstancia > 0 ? reserva.precioTotal / diasEstancia : 0;
      console.log(`💰 Precio por noche calculado: ${precioPorNoche} (precioTotal: ${reserva.precioTotal}, diasEstancia: ${diasEstancia})`);
      
      return {
        ...reserva,
        habitacionDetalle,
        diasEstancia,
        precioPorNoche, // ✅ AGREGAR PRECIO POR NOCHE
        estadoColor: estadoInfo.color,
        estadoIcon: estadoInfo.icon
      };
    });

    console.log('Reservas procesadas directamente:', reservasConDetalles);
    this.dataSource.data = reservasConDetalles;
    this.calcularEstadisticas(reservasConDetalles);
  }

  private calcularDiasEstancia(fechaEntrada: string, fechaSalida: string): number {
    const entrada = new Date(fechaEntrada);
    const salida = new Date(fechaSalida);
    const diffTime = Math.abs(salida.getTime() - entrada.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private obtenerInfoEstado(estado: string): { color: string, icon: string } {
    const estadoMap: { [key: string]: { color: string, icon: string } } = {
      'Pendiente': { color: '#6f42c1', icon: 'schedule' },
      'Confirmada': { color: '#17a2b8', icon: 'check_circle' },
      'En curso': { color: '#28a745', icon: 'hotel' },
      'Finalizada': { color: '#007bff', icon: 'done_all' },
      'Cancelada': { color: '#dc3545', icon: 'cancel' },
      'No Show': { color: '#6c757d', icon: 'person_off' }
    };
    
    return estadoMap[estado] || { color: '#6c757d', icon: 'help' };
  }

  private calcularEstadisticas(reservas: ReservaConDetalles[]): void {
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0];
    
    this.totalReservas = reservas.length;
    this.reservasFuturas = reservas.filter(r => r.fechaEntrada > hoyStr).length;
    this.reservasHoy = reservas.filter(r => r.fechaEntrada === hoyStr).length;
  }

  private aplicarFiltros(): void {
    const filtros = this.filtrosForm.value;
    
    console.log('🔍 Aplicando filtros:', filtros);
    
    // ✅ RECARGAR DATOS CON FILTROS APLICADOS
    this.cargarReservas(filtros);
    
    // ✅ MANTENER FILTRO LOCAL PARA BÚSQUEDA RÁPIDA ADICIONAL
    this.dataSource.filterPredicate = (data: ReservaConDetalles, filter: string): boolean => {
      const matchEstado = !filtros.estado || data.estado === filtros.estado;
      const matchHabitacion = !filtros.habitacion || 
        (data.habitacionDetalle && data.habitacionDetalle.numero.includes(filtros.habitacion));
      const matchCliente = !filtros.cliente || 
        `${data.cliente.nombre} ${data.cliente.apellido}`.toLowerCase().includes(filtros.cliente.toLowerCase());
      
      return Boolean(matchEstado && matchHabitacion && matchCliente);
    };
    
    this.dataSource.filter = 'trigger';
  }

  // Métodos públicos
  verDetalle(reserva: ReservaConDetalles): void {
    const dialogRef = this.dialog.open(DetalleReservaModalComponent, {
      width: '90vw',
      maxWidth: '800px',
      data: { reserva }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.action === 'updated') {
        this.cargarReservas();
      }
    });
  }

  editarReserva(reserva: ReservaConDetalles): void {
    this.router.navigate(['/nueva-reserva'], {
      queryParams: { 
        modo: 'editar', 
        reservaId: reserva._id 
      }
    });
  }

  cancelarReserva(reserva: ReservaConDetalles): void {
    const dialogRef = this.dialog.open(CancelarReservaDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { reserva: reserva },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        console.log('✅ Reserva cancelada:', result);
        this.snackBar.open('Reserva cancelada correctamente', 'Cerrar', { 
          duration: 5000,
          panelClass: ['success-snackbar']
        });
        
        if (result.reembolsoProcesado) {
          this.snackBar.open('Reembolso procesado exitosamente', 'Cerrar', { 
            duration: 5000,
            panelClass: ['success-snackbar']
          });
        }
        
        // Si se solicita navegar a auditoría
        if (result.navegarAAuditoria) {
          this.router.navigate(['/auditoria-cancelaciones']);
        }
        
        this.cargarReservas();
        this.cargarReembolsosPendientes(); // Recargar reembolsos pendientes
      }
    });
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset();
    // ✅ RECARGAR TODAS LAS RESERVAS AL LIMPIAR FILTROS
    this.cargarReservas();
  }

  exportarReservas(): void {
    // TODO: Implementar exportación a Excel/PDF
    this.snackBar.open('📊 Función de exportación en desarrollo', 'Cerrar', { duration: 3000 });
  }

  nuevaReserva(): void {
    this.router.navigate(['/nueva-reserva']);
  }

  // ✅ MÉTODO PARA CARGAR TODAS LAS RESERVAS SIN FILTROS
  cargarTodasLasReservas(): void {
    console.log('🔄 Cargando todas las reservas...');
    this.cargarReservas();
  }

  // Métodos para la tabla
  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(precio);
  }

  obtenerEstadoPago(reserva: ReservaConDetalles): { texto: string, color: string, icon: string } {
    if (reserva.estaCompletamentePagado) {
      return { texto: 'Pagado', color: '#28a745', icon: 'check_circle' };
    } else if (reserva.montoPagado && reserva.montoPagado > 0) {
      return { texto: 'Parcial', color: '#ffc107', icon: 'schedule' };
    } else {
      return { texto: 'Sin pago', color: '#dc3545', icon: 'cancel' };
    }
  }

  esReservaHoy(fechaEntrada: string): boolean {
    const hoy = new Date();
    const fechaReserva = new Date(fechaEntrada);
    return fechaReserva.toDateString() === hoy.toDateString();
  }

  // Cargar reembolsos pendientes
  cargarReembolsosPendientes(): void {
    this.cancelacionService.getCancelaciones({ estadoReembolso: 'Pendiente' }).subscribe({
      next: (response) => {
        this.reembolsosPendientes = response.total;
        this.mostrarNotificacionReembolso = this.reembolsosPendientes > 0;
        
        if (this.mostrarNotificacionReembolso) {
          this.snackBar.open(
            `💰 Tienes ${this.reembolsosPendientes} reembolso(s) pendiente(s) por procesar`, 
            'Ver Auditoría', 
            {
              duration: 8000,
              panelClass: ['info-snackbar']
            }
          ).onAction().subscribe(() => {
            this.router.navigate(['/auditoria-cancelaciones']);
          });
        }
      },
      error: (error) => {
        console.error('Error al cargar reembolsos pendientes:', error);
      }
    });
  }

  // Ir a auditoría de cancelaciones
  irAAuditoria(): void {
    this.router.navigate(['/auditoria-cancelaciones']);
  }
}
