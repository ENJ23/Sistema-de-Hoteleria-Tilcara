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
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';

import { ReservaService } from '../../services/reserva.service';
import { Reserva } from '../../models/reserva.model';
import { CalendarioComponent } from '../calendario/calendario.component';

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
  styleUrls: ['./reservas.component.scss'],
  providers: [
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMAT },
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' }
  ]
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
    
    console.log('🔍 Cargando todas las reservas...');
    
    // ✅ CARGAR TODAS LAS RESERVAS CON PAGINACIÓN ALTA
    this.reservaService.getReservas({}, 1, 1000).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        console.log('📊 Total reservas en BD:', response.total);
        console.log('📊 Reservas cargadas:', response.reservas.length);
        console.log('📊 Reservas recibidas:', response.reservas);
        
        this.reservas = response.reservas;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar reservas:', error);
        this.cargando = false;
        this.snackBar.open('❌ Error al cargar las reservas', 'Cerrar', { duration: 3000 });
      }
    });
  }

  aplicarFiltros(): void {
    const filtros = this.formFiltros.value;
    
    console.log('🔍 Aplicando filtros:', filtros);
    
    // ✅ RECARGAR DATOS CON FILTROS APLICADOS
    this.cargarReservasConFiltros(filtros);
  }

  private cargarReservasConFiltros(filtros: any): void {
    this.cargando = true;
    
    console.log('🔍 Cargando reservas con filtros:', filtros);
    
    // ✅ CARGAR RESERVAS CON FILTROS DEL SERVIDOR
    this.reservaService.getReservas(filtros, 1, 1000).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        console.log('📊 Total reservas filtradas en BD:', response.total);
        console.log('📊 Reservas filtradas cargadas:', response.reservas.length);
        console.log('📊 Reservas filtradas recibidas:', response.reservas);
        
        this.reservas = response.reservas;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar reservas filtradas:', error);
        this.cargando = false;
        this.snackBar.open('❌ Error al cargar las reservas filtradas', 'Cerrar', { duration: 3000 });
      }
    });
  }

  limpiarFiltros(): void {
    this.formFiltros.reset();
    // ✅ RECARGAR TODAS LAS RESERVAS AL LIMPIAR FILTROS
    this.cargarReservas();
  }

  // ✅ MÉTODO PARA CARGAR TODAS LAS RESERVAS SIN FILTROS
  cargarTodasLasReservas(): void {
    console.log('🔄 Cargando todas las reservas...');
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
    const date = new Date(fecha);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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