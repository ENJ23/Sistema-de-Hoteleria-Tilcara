import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { Subject, takeUntil } from 'rxjs';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DateTimeService } from '../../services/date-time.service';

import { ReservaService } from '../../services/reserva.service';
import { HabitacionService } from '../../services/habitacion.service';
import { Reserva } from '../../models/reserva.model';
import { Habitacion } from '../../models/habitacion.model';
import { DetalleReservaComponent } from '../detalle-reserva/detalle-reserva.component';

interface DiaCalendario {
  fecha: Date;
  numero: number;
  nombreDia: string;
  esHoy: boolean;
  esMesActual: boolean;
}

interface CeldaCalendario {
  habitacion: Habitacion;
  dia: Date;
  reserva: Reserva | null;
  esHoy: boolean;
  esMesActual: boolean;
}

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDialogModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatTableModule
  ],
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.scss']
})
export class CalendarioComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  fechaActual: Date = new Date();
  mesActual: number;
  anioActual: number;
  
  // Datos para el calendario
  habitaciones: Habitacion[] = [];
  diasMes: DiaCalendario[] = [];
  celdasCalendario: CeldaCalendario[] = [];
  reservas: Reserva[] = [];
  
  // Columnas para la tabla (días del 1 al 31)
  columnasDias: string[] = ['habitacion'];
  totalDiasMes: number = 31; // Por defecto 31 días, se ajusta según el mes
  
  // Estados
  cargando: boolean = true;
  error: string | null = null;
  
  formFiltros: FormGroup;
  
  diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  constructor(
    private reservaService: ReservaService,
    private habitacionService: HabitacionService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private dateTimeService: DateTimeService
  ) {
    this.mesActual = this.fechaActual.getMonth();
    this.anioActual = this.fechaActual.getFullYear();
    
    this.formFiltros = this.fb.group({
      estado: [''],
      fechaInicio: [''],
      fechaFin: [''],
      cliente: [''],
      habitacion: ['']
    });
  }

  ngOnInit(): void {
    this.cargarHabitaciones();
    // Refrescar automáticamente ante cambios de reservas
    this.reservaService.reservaEvents$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.cargarReservas();
      });
  }

  private cargarHabitaciones(): void {
    this.cargando = true;
    this.habitacionService.getHabitaciones(1, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.habitaciones = response.habitaciones || [];
          this.cargarReservas();
        },
        error: (error) => {
          console.error('Error al cargar las habitaciones:', error);
          this.error = 'No se pudieron cargar las habitaciones';
          this.cargando = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private mostrarMensaje(mensaje: string, duration: number = 3000): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration,
      panelClass: ['success-snackbar'],
      verticalPosition: 'top',
      horizontalPosition: 'right'
    });
  }

  // Método para ir al mes anterior
  mesAnterior(): void {
    this.mesActual--;
    if (this.mesActual < 0) {
      this.mesActual = 11;
      this.anioActual--;
    }
    this.cargarReservas();
  }

  mesSiguiente(): void {
    this.mesActual++;
    if (this.mesActual > 11) {
      this.mesActual = 0;
      this.anioActual++;
    }
    this.cargarReservas();
  }

  irAHoy(): void {
    const hoy = new Date();
    this.mesActual = hoy.getMonth();
    this.anioActual = hoy.getFullYear();
    this.cargarReservas();
  }
  
  // Obtener las celdas de una habitación específica
  obtenerCeldasPorHabitacion(habitacionId: string): CeldaCalendario[] {
    return this.celdasCalendario.filter(celda => celda.habitacion._id === habitacionId);
  }
  
  // Obtener la clase CSS para una celda según su estado
  obtenerClaseCelda(celda: CeldaCalendario): string {
    const clases = [];
    
    if (celda.esHoy) {
      clases.push('hoy');
    }
    
    if (!celda.esMesActual) {
      clases.push('otro-mes');
    }
    
    if (celda.reserva) {
      clases.push('ocupada');
      
      // Agregar clase según el estado de la reserva
      if (celda.reserva.estado) {
        clases.push(`estado-${celda.reserva.estado.toLowerCase()}`);
      }
    } else {
      clases.push('disponible');
    }
    
    return clases.join(' ');
  }
  
  // Mostrar detalles de una reserva
  verDetalleReserva(reserva: Reserva): void {
    this.dialog.open(DetalleReservaComponent, {
      width: '600px',
      data: { reserva }
    });
  }

  // Método para abrir el diálogo de nueva reserva
  abrirNuevaReserva(fecha: Date): void {
    const dialogRef = this.dialog.open(DetalleReservaComponent, {
      width: '800px',
      data: { 
        fechaSeleccionada: fecha,
        nuevaReserva: true 
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.cargarReservas();
      }
    });
  }

  // Método para abrir el diálogo de detalle de reserva
  abrirDetalleReserva(reserva: Reserva): void {
    const dialogRef = this.dialog.open(DetalleReservaComponent, {
      width: '800px',
      data: { reserva }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.cargarReservas();
      }
    });
  }

  // Método para obtener el color de la reserva según su estado
  obtenerColorReserva(estado: string, pagado: boolean = false): string {
    switch (estado) {
      case 'Confirmada':
        return pagado ? '#4CAF50' : '#FF9800'; // Verde si está pagado, naranja si no
      case 'Pendiente':
        return '#FFC107'; // Amarillo
      case 'Cancelada':
        return '#F44336'; // Rojo
      case 'Finalizada':
        return '#2196F3'; // Azul
      case 'No Show':
        return '#9C27B0'; // Púrpura
      default:
        console.warn('Estado de reserva desconocido:', estado);
        return '#607D8B'; // Gris
    }
  }

  // Método para generar el tooltip de la reserva
  obtenerTooltipReserva(reserva: Reserva): string {
    const cliente = typeof reserva.cliente === 'string' 
      ? reserva.cliente 
      : `${reserva.cliente?.nombre || ''} ${reserva.cliente?.apellido || ''}`;

    const habitacion = typeof reserva.habitacion === 'string' 
      ? reserva.habitacion 
      : reserva.habitacion?.numero || '';

    const fechaEntrada = new Date(reserva.fechaEntrada);
    const fechaSalida = new Date(reserva.fechaSalida);
    const horaEntrada = reserva.horaEntrada || '';
    const horaSalida = reserva.horaSalida || '';

    return `Reserva: ${reserva._id}\n` +
           `Cliente: ${cliente}\n` +
           `Habitación: ${habitacion}\n` +
           `Estado: ${reserva.estado}\n` +
           `Fecha Entrada: ${this.formatDateDDMMYYYY(fechaEntrada)} ${horaEntrada}\n` +
           `Fecha Salida: ${this.formatDateDDMMYYYY(fechaSalida)} ${horaSalida}\n` +
           `Método de Pago: ${reserva.metodoPago || 'No especificado'}\n` +
           `Precio por Noche: $${reserva.precioPorNoche?.toFixed(2) || '0.00'}\n` +
           `Precio Total: $${reserva.precioTotal?.toFixed(2) || '0.00'}\n` +
           `Pagado: ${reserva.pagado ? 'Sí' : 'No'}\n` +
           `Observaciones: ${reserva.observaciones || 'Ninguna'}`;
  }

  // Método auxiliar para formatear fechas en DD/MM/YYYY
  private formatDateDDMMYYYY(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Método para cargar las reservas
  private generarEstructuraCalendario(): void {
    this.diasMes = [];
    this.celdasCalendario = [];
    this.columnasDias = ['habitacion'];
    
    // Obtener información del mes actual
    const primerDia = new Date(this.anioActual, this.mesActual, 1);
    const ultimoDia = new Date(this.anioActual, this.mesActual + 1, 0);
    const hoy = new Date();
    this.totalDiasMes = ultimoDia.getDate();
    
    // Generar columnas para los días del mes (1 al totalDiasMes)
    for (let dia = 1; dia <= this.totalDiasMes; dia++) {
      const fecha = new Date(this.anioActual, this.mesActual, dia);
      
      this.diasMes.push({
        fecha,
        numero: dia,
        nombreDia: this.diasSemana[fecha.getDay()],
        esHoy: this.esMismaFecha(fecha, hoy),
        esMesActual: true
      });
      
      // Agregar el día a las columnas de la tabla
      const columnaDia = `dia-${dia}`;
      if (!this.columnasDias.includes(columnaDia)) {
        this.columnasDias.push(columnaDia);
      }
    }
    
    // Generar celdas del calendario (habitaciones x días)
    this.habitaciones.forEach(habitacion => {
      this.diasMes.forEach(dia => {
        const reserva = this.obtenerReservaParaHabitacionYDia(habitacion, dia.fecha);
        
        this.celdasCalendario.push({
          habitacion,
          dia: dia.fecha,
          reserva,
          esHoy: dia.esHoy,
          esMesActual: dia.esMesActual
        });
      });
    });
    
    this.cargando = false;
  }
  
  obtenerReservaParaHabitacionYDia(habitacion: Habitacion, fecha: Date): Reserva | null {
    return this.reservas.find(reserva => {
      // Verificar si la reserva es para esta habitación
      const esMismaHabitacion = typeof reserva.habitacion === 'string' 
        ? reserva.habitacion === habitacion._id 
        : reserva.habitacion?._id === habitacion._id;
      
      if (!esMismaHabitacion) return false;
      
      // Verificar si la fecha está dentro del rango de la reserva
      const fechaInicio = new Date(reserva.fechaEntrada);
      const fechaFin = new Date(reserva.fechaSalida);
      
      // Ajustar fechas para comparar solo día (tratar fechaSalida como exclusiva)
      fechaInicio.setHours(0, 0, 0, 0);
      // Fecha fin se considera exclusiva: la habitación queda libre el día fechaSalida
      fechaFin.setHours(0, 0, 0, 0);
      const fechaComparar = new Date(fecha);
      fechaComparar.setHours(0, 0, 0, 0);

      // Rango inclusivo en fechaInicio y exclusivo en fechaFin: [fechaInicio, fechaFin)
      return fechaComparar >= fechaInicio && fechaComparar < fechaFin;
    }) || null;
  }
  
  cargarReservas(): void {
    this.cargando = true;
    
    // Configurar filtro para obtener reservas del mes actual
    const primerDia = new Date(this.anioActual, this.mesActual, 1);
    const ultimoDia = new Date(this.anioActual, this.mesActual + 1, 0);
    
    // Formatear fechas como YYYY-MM-DD usando DateTimeService para evitar problemas de zona horaria
    const formatoFecha = (fecha: Date) => this.dateTimeService.dateToString(fecha);
    
    const filtros = {
      fechaInicio: formatoFecha(primerDia),
      fechaFin: formatoFecha(ultimoDia)
    };
    
    this.reservaService.getReservasAll(filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.reservas = response.reservas || [];
          
          // Generar la estructura del calendario con las habitaciones y reservas cargadas
          this.generarEstructuraCalendario();
        },
        error: (error) => {
          console.error('Error al cargar las reservas:', error);
          this.error = 'Error al cargar las reservas';
          this.cargando = false;
        }
      });
  }

  private obtenerReservasDelDia(fecha: Date): Reserva[] {
    return this.reservas.filter(reserva => {
      const fechaEntrada = new Date(reserva.fechaEntrada);
      const fechaSalida = new Date(reserva.fechaSalida);

      // Normalizar horas y tratar fechaSalida como exclusiva
      fechaEntrada.setHours(0,0,0,0);
      fechaSalida.setHours(0,0,0,0);
      const fechaComparar = new Date(fecha);
      fechaComparar.setHours(0,0,0,0);

      return fechaComparar >= fechaEntrada && fechaComparar < fechaSalida;
    }).sort((a: Reserva, b: Reserva) => {
      // Ordenar por estado (Confirmadas al principio)
      if (a.estado === 'Confirmada' && b.estado !== 'Confirmada') return -1;
      if (a.estado !== 'Confirmada' && b.estado === 'Confirmada') return 1;
      // Luego por hora de entrada
      return a.horaEntrada.localeCompare(b.horaEntrada);
    });
  }

  // Verifica si dos fechas son iguales (mismo día, mes y año)
  private esMismaFecha(fecha1: Date, fecha2: Date): boolean {
    if (!(fecha1 instanceof Date) || !(fecha2 instanceof Date)) return false;
    return fecha1.getDate() === fecha2.getDate() &&
           fecha1.getMonth() === fecha2.getMonth() &&
           fecha1.getFullYear() === fecha2.getFullYear();
  }
  
  // Verifica si una fecha es hoy
  private esHoy(fecha: Date): boolean {
    if (!(fecha instanceof Date)) return false;
    return this.esMismaFecha(fecha, new Date());
  }

  // Función para trackBy en *ngFor de días
  trackByDia(index: number, dia: DiaCalendario): number {
    return dia?.numero ?? index;
  }

  // Función para trackBy en *ngFor de reservas
  trackByReserva(index: number, reserva: Reserva): string {
    return reserva?._id ?? `reserva-${index}`;
  }

  // Obtener el nombre del cliente de una reserva
  obtenerNombreCliente(reserva: Reserva): string {
    if (!reserva?.cliente) return 'Sin cliente';
    if (typeof reserva.cliente === 'string') return 'Cargando...';
    return `${reserva.cliente.nombre || ''} ${reserva.cliente.apellido || ''}`.trim() || 'Cliente sin nombre';
  }

  // Maneja la selección de una fecha en el calendario
  seleccionarFecha(fecha: Date): void {
    if (!fecha) return;
    
    const dialogRef = this.dialog.open(DetalleReservaComponent, {
      width: '600px',
      data: { 
        nuevaReserva: true, 
        fechaSeleccionada: new Date(fecha) // Aseguramos que sea una nueva instancia
      }
    });

    dialogRef.afterClosed().subscribe((result: { success?: boolean }) => {
      if (result?.success) {
        this.mostrarMensaje('Reserva creada exitosamente');
        this.cargarReservas();
      }
    });
  }

  // Muestra un mensaje de error usando el snackbar
  private mostrarError(mensaje: string): void {
    if (!mensaje) return;
    
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      panelClass: ['error-snackbar'],
      verticalPosition: 'top',
      horizontalPosition: 'right'
    });
  }

}
