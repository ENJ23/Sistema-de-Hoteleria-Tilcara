import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';

import { ReservaService } from '../../services/reserva.service';
import { Reserva, ReservaResponse } from '../../models/reserva.model';

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

interface IngresosResumen {
  totalIngresos: number;
  ingresosCompletos: number;
  ingresosParciales: number;
  totalReservas: number;
  reservasCompletas: number;
  reservasParciales: number;
  reservasSinPago: number;
  promedioPorReserva: number;
  ingresosPorDia: { fecha: string, ingresos: number }[];
  reservasRecientes: Reserva[];
}

interface IngresosPorTipo {
  tipo: string;
  cantidad: number;
  ingresos: number;
  porcentaje: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  providers: [
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMAT },
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' }
  ]
})
export class DashboardComponent implements OnInit {
  // Datos del dashboard
  resumen: IngresosResumen = {
    totalIngresos: 0,
    ingresosCompletos: 0,
    ingresosParciales: 0,
    totalReservas: 0,
    reservasCompletas: 0,
    reservasParciales: 0,
    reservasSinPago: 0,
    promedioPorReserva: 0,
    ingresosPorDia: [],
    reservasRecientes: []
  };

  ingresosPorTipo: IngresosPorTipo[] = [];
  
  // Estados
  loading = false;
  fechaActual = new Date();
  mesActual = new Date();
  
  // Formulario para filtros
  filtrosForm: FormGroup;
  
  // Columnas para la tabla de reservas recientes
  displayedColumns: string[] = ['cliente', 'habitacion', 'fechas', 'estado', 'pago', 'ingresos'];

  constructor(
    private reservaService: ReservaService,
    private snackBar: MatSnackBar,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.filtrosForm = this.fb.group({
      fechaInicio: [this.obtenerPrimerDiaDelMes()],
      fechaFin: [this.obtenerUltimoDiaDelMes()]
    });
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  private obtenerPrimerDiaDelMes(): Date {
    // ✅ Usar mesActual en lugar de hoy para navegación correcta
    return new Date(this.mesActual.getFullYear(), this.mesActual.getMonth(), 1);
  }

  private obtenerUltimoDiaDelMes(): Date {
    // ✅ Usar mesActual en lugar de hoy para navegación correcta
    return new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 0);
  }

  private cargarDatos(): void {
    this.loading = true;
    const filtros = this.filtrosForm.value;
    
    // ✅ DEBUGGING: Log de fechas solicitadas
    console.log('📅 Dashboard - Cargando datos para:', {
      mesActual: this.mesActual.getMonth() + 1 + '/' + this.mesActual.getFullYear(),
      fechaInicio: filtros.fechaInicio.toISOString().split('T')[0],
      fechaFin: filtros.fechaFin.toISOString().split('T')[0]
    });
    
    this.reservaService.getReservas({
      fechaInicio: filtros.fechaInicio.toISOString().split('T')[0],
      fechaFin: filtros.fechaFin.toISOString().split('T')[0]
    }).subscribe({
      next: (response: ReservaResponse) => {
        // ✅ DEBUGGING: Log de reservas recibidas
        console.log('📊 Dashboard - Reservas recibidas:', response.reservas.length);
        console.log('📊 Dashboard - Detalle de reservas:', response.reservas.map(r => ({
          id: r._id,
          fechaEntrada: r.fechaEntrada,
          cliente: r.cliente?.nombre + ' ' + r.cliente?.apellido,
          montoPagado: r.montoPagado
        })));
        
        this.procesarDatos(response.reservas);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar datos del dashboard:', error);
        this.snackBar.open('❌ Error al cargar los datos del dashboard', 'Cerrar', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  private procesarDatos(reservas: Reserva[]): void {
    // ✅ El backend ya filtra por fecha, no necesitamos filtrar nuevamente
    // Las reservas ya vienen filtradas por el rango de fechas solicitado
    const reservasDelMes = reservas;

    // ✅ DEBUGGING: Log de procesamiento
    console.log('📊 Dashboard - Procesando datos:', {
      totalReservas: reservasDelMes.length,
      mesActual: this.mesActual.getMonth() + 1 + '/' + this.mesActual.getFullYear()
    });

    // Calcular ingresos
    let totalIngresos = 0;
    let ingresosCompletos = 0;
    let ingresosParciales = 0;
    let reservasCompletas = 0;
    let reservasParciales = 0;
    let reservasSinPago = 0;

    reservasDelMes.forEach(reserva => {
      const montoPagado = reserva.montoPagado || 0;
      const precioTotal = reserva.precioTotal || 0;
      
      totalIngresos += montoPagado;
      
      if (reserva.estaCompletamentePagado) {
        ingresosCompletos += montoPagado;
        reservasCompletas++;
      } else if (montoPagado > 0) {
        ingresosParciales += montoPagado;
        reservasParciales++;
      } else {
        reservasSinPago++;
      }
    });

    // Calcular ingresos por día
    const ingresosPorDia = this.calcularIngresosPorDia(reservasDelMes);
    
    // Calcular ingresos por tipo de habitación
    this.ingresosPorTipo = this.calcularIngresosPorTipo(reservasDelMes);

    // Obtener reservas recientes (últimas 5)
    const reservasRecientes = reservasDelMes
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    this.resumen = {
      totalIngresos,
      ingresosCompletos,
      ingresosParciales,
      totalReservas: reservasDelMes.length,
      reservasCompletas,
      reservasParciales,
      reservasSinPago,
      promedioPorReserva: reservasDelMes.length > 0 ? totalIngresos / reservasDelMes.length : 0,
      ingresosPorDia,
      reservasRecientes
    };

    // ✅ DEBUGGING: Log de resultados finales
    console.log('📊 Dashboard - Resumen calculado:', {
      totalIngresos,
      totalReservas: reservasDelMes.length,
      reservasCompletas,
      reservasParciales,
      reservasSinPago,
      promedioPorReserva: this.resumen.promedioPorReserva
    });
  }

  private calcularIngresosPorDia(reservas: Reserva[]): { fecha: string, ingresos: number }[] {
    const ingresosPorDia: { [key: string]: number } = {};
    
    reservas.forEach(reserva => {
      const fecha = new Date(reserva.fechaEntrada).toISOString().split('T')[0];
      const montoPagado = reserva.montoPagado || 0;
      
      if (ingresosPorDia[fecha]) {
        ingresosPorDia[fecha] += montoPagado;
      } else {
        ingresosPorDia[fecha] = montoPagado;
      }
    });

    return Object.entries(ingresosPorDia)
      .map(([fecha, ingresos]) => ({ fecha, ingresos }))
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }

  private calcularIngresosPorTipo(reservas: Reserva[]): IngresosPorTipo[] {
    const ingresosPorTipo: { [key: string]: { cantidad: number, ingresos: number } } = {};
    
    reservas.forEach(reserva => {
      const tipo = typeof reserva.habitacion === 'object' ? 
        (reserva.habitacion as any).tipo : 'Desconocido';
      const montoPagado = reserva.montoPagado || 0;
      
      if (ingresosPorTipo[tipo]) {
        ingresosPorTipo[tipo].cantidad++;
        ingresosPorTipo[tipo].ingresos += montoPagado;
      } else {
        ingresosPorTipo[tipo] = { cantidad: 1, ingresos: montoPagado };
      }
    });

    const totalIngresos = Object.values(ingresosPorTipo).reduce((sum, item) => sum + item.ingresos, 0);

    return Object.entries(ingresosPorTipo)
      .map(([tipo, datos]) => ({
        tipo,
        cantidad: datos.cantidad,
        ingresos: datos.ingresos,
        porcentaje: totalIngresos > 0 ? (datos.ingresos / totalIngresos) * 100 : 0
      }))
      .sort((a, b) => b.ingresos - a.ingresos);
  }

  // Métodos públicos
  actualizarDatos(): void {
    this.cargarDatos();
  }

  cambiarMes(direccion: 'anterior' | 'siguiente'): void {
    if (direccion === 'anterior') {
      this.mesActual.setMonth(this.mesActual.getMonth() - 1);
    } else {
      this.mesActual.setMonth(this.mesActual.getMonth() + 1);
    }
    
    this.filtrosForm.patchValue({
      fechaInicio: this.obtenerPrimerDiaDelMes(),
      fechaFin: this.obtenerUltimoDiaDelMes()
    });
    
    this.cargarDatos();
  }

  irAHoy(): void {
    // ✅ Actualizar mesActual antes de obtener fechas
    this.mesActual = new Date();
    this.filtrosForm.patchValue({
      fechaInicio: this.obtenerPrimerDiaDelMes(),
      fechaFin: this.obtenerUltimoDiaDelMes()
    });
    this.cargarDatos();
  }

  verReservas(): void {
    this.router.navigate(['/reservas']);
  }

  // Métodos de utilidad
  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(precio);
  }

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  obtenerNombreMes(mes: number): string {
    const nombresMeses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return nombresMeses[mes];
  }

  obtenerEstadoPago(reserva: Reserva): { texto: string, color: string, icon: string } {
    if (reserva.estaCompletamentePagado) {
      return { texto: 'Pagado', color: '#28a745', icon: 'check_circle' };
    } else if (reserva.montoPagado && reserva.montoPagado > 0) {
      return { texto: 'Parcial', color: '#ffc107', icon: 'schedule' };
    } else {
      return { texto: 'Sin pago', color: '#dc3545', icon: 'cancel' };
    }
  }

  getHabitacionNumero(reserva: Reserva): string {
    if (typeof reserva.habitacion === 'object' && reserva.habitacion !== null) {
      return (reserva.habitacion as any).numero || 'N/A';
    }
    return 'N/A';
  }

  getHabitacionTipo(reserva: Reserva): string {
    if (typeof reserva.habitacion === 'object' && reserva.habitacion !== null) {
      return (reserva.habitacion as any).tipo || 'N/A';
    }
    return 'N/A';
  }
}