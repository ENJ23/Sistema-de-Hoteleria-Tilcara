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
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';

import { ReservaService } from '../../services/reserva.service';
import { Reserva, ReservaResponse } from '../../models/reserva.model';

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
  styleUrl: './dashboard.component.css'
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
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  }

  private obtenerUltimoDiaDelMes(): Date {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  }

  private cargarDatos(): void {
    this.loading = true;
    const filtros = this.filtrosForm.value;
    
    this.reservaService.getReservas({
      fechaInicio: filtros.fechaInicio.toISOString().split('T')[0],
      fechaFin: filtros.fechaFin.toISOString().split('T')[0]
    }).subscribe({
      next: (response: ReservaResponse) => {
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
    // Filtrar reservas del mes actual
    const reservasDelMes = reservas.filter(reserva => {
      const fechaReserva = new Date(reserva.fechaEntrada);
      return fechaReserva.getMonth() === this.mesActual.getMonth() && 
             fechaReserva.getFullYear() === this.mesActual.getFullYear();
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
    return new Date(fecha).toLocaleDateString('es-ES');
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