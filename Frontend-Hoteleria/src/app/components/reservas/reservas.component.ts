import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';

import { ReservaService } from '../../services/reserva.service';
import { Reserva } from '../../models/reserva.model';
import { CalendarioComponent } from '../calendario/calendario.component';

@Component({
  selector: 'app-reservas',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDialogModule,
    MatSnackBarModule,
    CalendarioComponent
  ],
  templateUrl: './reservas.component.html',
  styleUrls: ['./reservas.component.scss']
})
export class ReservasComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  reservas: Reserva[] = [];
  cargando = false;
  vistaCalendario = true;
  
  formFiltros: FormGroup;
  
  estadosReserva = [
    'Confirmada', 'Pendiente', 'Cancelada', 'Completada', 'No Show'
  ];

  constructor(
    private reservaService: ReservaService,
    private formBuilder: FormBuilder,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.formFiltros = this.formBuilder.group({
      estado: [''],
      fechaInicio: [''],
      fechaFin: [''],
      cliente: [''],
      habitacion: ['']
    });
  }

  ngOnInit(): void {
    this.cargarReservas();
    this.configurarFiltros();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  configurarFiltros(): void {
    this.formFiltros.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.aplicarFiltros();
    });
  }

  cargarReservas(): void {
    this.cargando = true;
    
    this.reservaService.getReservas().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.reservas = response.reservas;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar reservas:', error);
        this.cargando = false;
        //this.mostrarMensaje('Error al cargar las reservas');
      }
    });
  }

  aplicarFiltros(): void {
    const filtros = this.formFiltros.value;
    let reservasFiltradas = [...this.reservas];

    // Filtro por estado
    if (filtros.estado) {
      reservasFiltradas = reservasFiltradas.filter(
        reserva => reserva.estado === filtros.estado
      );
    }

    // Filtro por fecha de inicio
    if (filtros.fechaInicio) {
      const fechaInicio = new Date(filtros.fechaInicio);
      reservasFiltradas = reservasFiltradas.filter(
        reserva => new Date(reserva.fechaEntrada) >= fechaInicio
      );
    }

    // Filtro por fecha de fin
    if (filtros.fechaFin) {
      const fechaFin = new Date(filtros.fechaFin);
      reservasFiltradas = reservasFiltradas.filter(
        reserva => new Date(reserva.fechaSalida) <= fechaFin
      );
    }

    // Filtro por cliente (búsqueda en nombre)
    if (filtros.cliente) {
      const terminoCliente = filtros.cliente.toLowerCase();
      reservasFiltradas = reservasFiltradas.filter(reserva => {
        const cliente = reserva.cliente as any;
        return cliente?.nombre?.toLowerCase().includes(terminoCliente) ||
               cliente?.apellido?.toLowerCase().includes(terminoCliente);
      });
    }

    // Filtro por habitación
    if (filtros.habitacion) {
      const numeroHabitacion = filtros.habitacion.toString();
      reservasFiltradas = reservasFiltradas.filter(reserva => {
        const habitacion = reserva.habitacion as any;
        return habitacion?.numero?.toString().includes(numeroHabitacion);
      });
    }

    this.reservas = reservasFiltradas;
  }

  limpiarFiltros(): void {
    this.formFiltros.reset();
    this.cargarReservas();
  }

  toggleVista(): void {
    this.vistaCalendario = !this.vistaCalendario;
  }

  nuevaReserva(): void {
    // TODO: Implementar creación de nueva reserva
    this.snackBar.open('Función de nueva reserva en desarrollo', 'Cerrar', {
      duration: 3000
    });
  }

  obtenerColorEstado(estado: string): string {
    switch (estado) {
      case 'Confirmada':
        return '#4caf50';
      case 'Pendiente':
        return '#ff9800';
      case 'Cancelada':
        return '#f44336';
      case 'Completada':
        return '#2196f3';
      case 'No Show':
        return '#9e9e9e';
      default:
        return '#757575';
    }
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES');
  }

  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(precio);
  }

  obtenerNombreCliente(reserva: Reserva): string {
    const cliente = reserva.cliente as any;
    return cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Cliente no disponible';
  }

  obtenerNumeroHabitacion(reserva: Reserva): string {
    const habitacion = reserva.habitacion as any;
    return habitacion ? `Habitación ${habitacion.numero}` : 'Habitación no disponible';
  }

  trackByReserva(index: number, reserva: Reserva): string {
    return reserva._id;
  }

  verDetalle(reserva: Reserva): void {
    // TODO: Implementar vista de detalle
    this.snackBar.open('Función de detalle en desarrollo', 'Cerrar', {
      duration: 3000
    });
  }
} 