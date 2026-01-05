import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FilterByHabitacionPipe } from '../../pipes/filter-by-habitacion.pipe';
import { HabitacionService } from '../../services/habitacion.service';
import { ReservaService } from '../../services/reserva.service';
import { DateTimeService } from '../../services/date-time.service';
import { Subject, takeUntil, debounceTime } from 'rxjs';

interface DiaCalendario {
  fecha: Date;
  numero: number;
  esHoy: boolean;
  esMesActual: boolean;
  esFinDeSemana: boolean;
  esPrimerDia: boolean;
}

interface Habitacion {
  _id: string;
  numero: string;
  tipo: string;
  capacidad: number;
  activa: boolean;
  precioActual: number;
}

interface OcupacionDia {
  habitacionId: string;
  habitacionNumero: string;
  estado: string;
  reservaId?: string;
  clienteNombre?: string;
  checkIn?: boolean;
  checkOut?: boolean;
  esTransicion?: boolean;
  esDiaEntrada?: boolean;
  esDiaSalida?: boolean;
  estadoEntradaTransicion?: string; // Estado de la reserva que entra
  estadoSalidaTransicion?: string;  // Estado de la reserva que sale
}

interface OcupacionCalendario {
  [fecha: string]: OcupacionDia[];
}

@Component({
  selector: 'app-calendario-ocupacion',
  templateUrl: './calendario-ocupacion.component.html',
  styleUrls: ['./calendario-ocupacion.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    FilterByHabitacionPipe
  ]
})
export class CalendarioOcupacionComponent implements OnInit, OnDestroy {
  fechaActual = new Date();
  mesActual = new Date();
  diasCalendario: DiaCalendario[] = [];
  habitaciones: Habitacion[] = [];
  ocupacionCalendario: OcupacionCalendario = {};
  cargando = false;
  cargandoOcupacion = false;
  private destroy$ = new Subject<void>();

  constructor(
    private habitacionService: HabitacionService,
    private reservaService: ReservaService,
    private dateTimeService: DateTimeService
  ) { }

  // Estados de ocupación
  estadosOcupacion = {
    disponible: { color: '#4CAF50', icon: 'hotel', label: 'Disponible' },
    ocupada: { color: '#F44336', icon: 'person', label: 'Ocupada' },
    reservada: { color: '#FF9800', icon: 'event', label: 'Reservada' },
    limpieza: { color: '#2196F3', icon: 'cleaning_services', label: 'Limpieza' },
    mantenimiento: { color: '#9C27B0', icon: 'handyman', label: 'Mantenimiento' },
    fueraServicio: { color: '#607D8B', icon: 'block', label: 'Fuera de Servicio' }
  };

  ngOnInit(): void {
    this.inicializarCalendario();
    this.cargarHabitaciones();
    this.reservaService.reservaEvents$
      .pipe(takeUntil(this.destroy$), debounceTime(300))
      .subscribe(() => {
        this.ocupacionCalendario = {};
        this.generarOcupacion();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  inicializarCalendario(): void {
    this.generarDiasCalendario();
  }

  generarDiasCalendario(): void {
    const año = this.mesActual.getFullYear();
    const mes = this.mesActual.getMonth();
    const primerDia = new Date(año, mes, 1);
    const diaSemanaPrimerDia = primerDia.getDay();
    const inicioSemana = diaSemanaPrimerDia === 0 ? 6 : diaSemanaPrimerDia - 1;

    this.diasCalendario = [];
    const primerDiaCalendario = new Date(primerDia);
    primerDiaCalendario.setDate(primerDiaCalendario.getDate() - inicioSemana);

    for (let i = 0; i < 42; i++) {
      const fecha = new Date(primerDiaCalendario);
      fecha.setDate(fecha.getDate() + i);

      const dia: DiaCalendario = {
        fecha: fecha,
        numero: fecha.getDate(),
        esHoy: this.esHoy(fecha),
        esMesActual: fecha.getMonth() === mes,
        esFinDeSemana: fecha.getDay() === 0 || fecha.getDay() === 6,
        esPrimerDia: fecha.getDate() === 1
      };

      this.diasCalendario.push(dia);
    }
  }

  esHoy(fecha: Date): boolean {
    const hoy = new Date();
    return fecha.toDateString() === hoy.toDateString();
  }

  cargarHabitaciones(): void {
    this.cargando = true;
    this.habitacionService.getHabitacionesActivas().subscribe({
      next: (response) => {
        this.habitaciones = response.habitaciones.map(hab => ({
          _id: hab._id,
          numero: hab.numero,
          tipo: hab.tipo,
          capacidad: hab.capacidad,
          activa: hab.activa || true,
          precioActual: hab.precioActual
        }));
        this.cargando = false;
        this.generarOcupacion();
      },
      error: (error) => {
        console.error('Error al cargar habitaciones:', error);
        this.habitaciones = [
          { _id: '1', numero: '101', tipo: 'Individual', capacidad: 1, activa: true, precioActual: 50 },
          { _id: '2', numero: '102', tipo: 'Doble', capacidad: 2, activa: true, precioActual: 75 }
        ];
        this.cargando = false;
        this.generarOcupacion();
      }
    });
  }

  generarOcupacion(): void {
    if (this.habitaciones.length === 0) return;
    if (this.cargandoOcupacion) return;

    this.cargandoOcupacion = true;
    this.cargando = true;

    const mesAnterior = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, 1);
    const mesSiguiente = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 1);

    const fechaInicio = this.dateTimeService.getFirstDayOfMonth(mesAnterior.getFullYear(), mesAnterior.getMonth() + 1);
    const fechaFin = this.dateTimeService.getLastDayOfMonth(mesSiguiente.getFullYear(), mesSiguiente.getMonth() + 1);

    this.reservaService.getReservasAll({
      fechaInicio: this.dateTimeService.dateToString(fechaInicio),
      fechaFin: this.dateTimeService.dateToString(fechaFin)
    }, 100, true).subscribe({
      next: (response) => {
        this.ocupacionCalendario = {};

        this.diasCalendario.forEach(dia => {
          if (dia.esMesActual) {
            const fechaStr = this.formatearFecha(dia.fecha);
            this.ocupacionCalendario[fechaStr] = [];

            this.habitaciones.forEach(habitacion => {
              // Buscar TODAS las reservas que coincidan con esta habitación y fecha
              const reservasCoincidentes = response.reservas.filter(reserva => {
                let coincideHabitacion = false;
                if (typeof reserva.habitacion === 'string') {
                  coincideHabitacion = reserva.habitacion === habitacion._id;
                } else if (reserva.habitacion) {
                  coincideHabitacion = reserva.habitacion._id === habitacion._id || reserva.habitacion.numero === habitacion.numero;
                }

                const coincideFecha = this.dateTimeService.isDateInRange(dia.fecha, reserva.fechaEntrada, reserva.fechaSalida);
                return coincideHabitacion && coincideFecha;
              });

              let ocupacion: OcupacionDia;

              if (reservasCoincidentes.length > 0) {
                // Analizar si hay una transición (una sale, otra entra)
                const reservaSalida = reservasCoincidentes.find(r => this.dateTimeService.isCheckOutDate(dia.fecha, r.fechaSalida));
                const reservaEntrada = reservasCoincidentes.find(r => this.dateTimeService.isCheckInDate(dia.fecha, r.fechaEntrada));

                if (reservaSalida && reservaEntrada && reservaSalida._id !== reservaEntrada._id) {
                  // Caso de TRANSICIÓN: Mostrar color dividido
                  ocupacion = {
                    habitacionId: habitacion._id,
                    habitacionNumero: habitacion.numero,
                    estado: 'transicion', // Estado especial
                    reservaId: reservaEntrada._id, // Priorizamos la info de la que entra para click
                    clienteNombre: `${this.obtenerNombreCliente(reservaSalida.cliente)} / ${this.obtenerNombreCliente(reservaEntrada.cliente)}`,
                    checkIn: true,
                    checkOut: true,
                    esTransicion: true,
                    esDiaEntrada: true,
                    esDiaSalida: true,
                    estadoSalidaTransicion: this.mapearEstadoReserva(reservaSalida.estado), // Color izquierda (Triangulo sup/izq)
                    estadoEntradaTransicion: this.mapearEstadoReserva(reservaEntrada.estado) // Color derecha (Triangulo inf/der)
                  };
                } else {
                  // Caso Normal (Tomamos la primera reserva válida, priorizando la que no sea solo checkout si hay conflicto raro)
                  const reserva = reservasCoincidentes[0];
                  const estado = this.mapearEstadoReserva(reserva.estado);
                  const esDiaEntrada = this.dateTimeService.isCheckInDate(dia.fecha, reserva.fechaEntrada);
                  const esDiaSalida = this.dateTimeService.isCheckOutDate(dia.fecha, reserva.fechaSalida);

                  ocupacion = {
                    habitacionId: habitacion._id,
                    habitacionNumero: habitacion.numero,
                    estado: estado,
                    reservaId: reserva._id,
                    clienteNombre: this.obtenerNombreCliente(reserva.cliente),
                    checkIn: esDiaEntrada,
                    checkOut: esDiaSalida,
                    esTransicion: false,
                    esDiaEntrada: esDiaEntrada,
                    esDiaSalida: esDiaSalida
                  };
                }
              } else {
                // Sin reservas
                ocupacion = {
                  habitacionId: habitacion._id,
                  habitacionNumero: habitacion.numero,
                  estado: 'disponible',
                  esTransicion: false,
                  esDiaEntrada: false,
                  esDiaSalida: false
                };
              }

              this.ocupacionCalendario[fechaStr].push(ocupacion);
            });
          }
        });

        this.cargando = false;
        this.cargandoOcupacion = false;
      },
      error: (error) => {
        console.error('Error al cargar ocupación:', error);
        this.ocupacionCalendario = {}; // Limpiar en error
        this.cargando = false;
        this.cargandoOcupacion = false;
      }
    });
  }

  formatearFecha(fecha: Date): string {
    // CORREGIDO: Usar DateTimeService para formateo consistente
    return this.dateTimeService.dateToString(fecha);
  }

  mesAnterior(): void {
    this.mesActual.setMonth(this.mesActual.getMonth() - 1);
    this.generarDiasCalendario();
    this.generarOcupacion();
  }

  mesSiguiente(): void {
    this.mesActual.setMonth(this.mesActual.getMonth() + 1);
    this.generarDiasCalendario();
    this.generarOcupacion();
  }

  irAHoy(): void {
    this.mesActual = new Date();
    this.generarDiasCalendario();
    this.generarOcupacion();
  }

  obtenerClaseOcupacion(ocupacion: OcupacionDia): string {
    if (!ocupacion) {
      console.log('obtenerClaseOcupacion: ocupacion es null/undefined');
      return 'ocupacion-disponible';
    }

    let result: string;
    switch (ocupacion.estado) {
      case 'ocupada': result = 'ocupacion-ocupada'; break;
      case 'reservada': result = 'ocupacion-reservada'; break;
      case 'finalizada': result = 'ocupacion-finalizada'; break; // CORREGIDO: Agregar estado finalizada
      case 'limpieza': result = 'ocupacion-limpieza'; break;
      case 'mantenimiento': result = 'ocupacion-mantenimiento'; break;
      case 'fueraServicio': result = 'ocupacion-fuera-servicio'; break;
      default: result = 'ocupacion-disponible'; break;
    }

    console.log('obtenerClaseOcupacion result:', result, 'type:', typeof result);
    return result;
  }

  obtenerIconoOcupacion(ocupacion: OcupacionDia): string {
    if (!ocupacion) return 'hotel';

    switch (ocupacion.estado) {
      case 'ocupada': return 'person';
      case 'reservada': return 'event';
      case 'finalizada': return 'check_circle'; // CORREGIDO: Agregar icono para finalizada
      case 'limpieza': return 'cleaning_services';
      case 'mantenimiento': return 'handyman';
      case 'fueraServicio': return 'block';
      default: return 'hotel';
    }
  }

  obtenerTooltipOcupacion(ocupacion: OcupacionDia): string {
    if (!ocupacion) return 'Disponible';

    let tooltip = `Habitación ${ocupacion.habitacionNumero}: ${ocupacion.estado}`;

    if (ocupacion.clienteNombre) {
      tooltip += ` - ${ocupacion.clienteNombre}`;
    }

    if (ocupacion.checkIn && ocupacion.checkOut) {
      tooltip += ' (Entrada y Salida)';
    } else if (ocupacion.checkIn) {
      tooltip += ' (Entrada)';
    } else if (ocupacion.checkOut) {
      tooltip += ' (Salida)';
    }

    return tooltip;
  }

  seleccionarDia(dia: DiaCalendario): void {
    if (dia.esMesActual) {
      console.log('Día seleccionado:', dia.fecha);
      // Aquí se podría abrir un modal para ver detalles del día
    }
  }

  seleccionarHabitacion(habitacion: Habitacion): void {
    console.log('Habitación seleccionada:', habitacion);
    // Aquí se podría abrir un modal para ver detalles de la habitación
  }

  obtenerNombreMes(mes: number): string {
    const nombresMeses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return nombresMeses[mes];
  }

  obtenerNombreDia(dia: number): string {
    const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return nombresDias[dia];
  }

  // CORREGIDO: Métodos auxiliares ahora usan DateTimeService para consistencia
  // Estos métodos se mantienen para compatibilidad pero ahora usan DateTimeService internamente
  fechaEnRango(fecha: Date, fechaInicio: string, fechaFin: string): boolean {
    return this.dateTimeService.isDateInRange(fecha, fechaInicio, fechaFin);
  }

  esFechaCheckIn(fecha: Date, fechaCheckIn: string): boolean {
    return this.dateTimeService.isCheckInDate(fecha, fechaCheckIn);
  }

  esFechaCheckOut(fecha: Date, fechaCheckOut: string): boolean {
    return this.dateTimeService.isCheckOutDate(fecha, fechaCheckOut);
  }

  // Método para determinar si es día de entrada (usando DateTimeService)
  esDiaEntrada(fecha: Date, fechaEntrada: string): boolean {
    return this.dateTimeService.isCheckInDate(fecha, fechaEntrada);
  }

  // Método para determinar si es día de salida (usando DateTimeService)
  esDiaSalida(fecha: Date, fechaSalida: string): boolean {
    return this.dateTimeService.isCheckOutDate(fecha, fechaSalida);
  }

  // Nuevo método para obtener la clase CSS según el tipo de día
  obtenerClaseDiaReserva(ocupacion: OcupacionDia): string {
    if (!ocupacion) {
      console.log('obtenerClaseDiaReserva: ocupacion es null/undefined');
      return 'ocupacion-disponible';
    }

    const baseClass = this.obtenerClaseOcupacion(ocupacion);
    let result: string;

    // Agregar clases específicas para entrada y salida
    if (ocupacion.esDiaEntrada && ocupacion.esDiaSalida) {
      result = `${baseClass} entrada-salida`;
    } else if (ocupacion.esDiaEntrada) {
      result = `${baseClass} solo-entrada`;
    } else if (ocupacion.esDiaSalida) {
      result = `${baseClass} solo-salida`;
    } else {
      result = baseClass;
    }

    console.log('obtenerClaseDiaReserva result:', result, 'type:', typeof result);
    return result;
  }

  // Método para ngClass que devuelve un objeto
  getClaseOcupacion(ocupacion: OcupacionDia): { [key: string]: boolean } {
    if (!ocupacion) {
      return { 'ocupacion-disponible': true };
    }

    const baseClass = this.obtenerClaseOcupacion(ocupacion);
    const clases: { [key: string]: boolean } = {};

    // Agregar la clase base
    clases[baseClass] = true;

    // Agregar clases específicas para entrada y salida
    if (ocupacion.esDiaEntrada && ocupacion.esDiaSalida) {
      clases['entrada-salida'] = true;
    } else if (ocupacion.esDiaEntrada) {
      clases['solo-entrada'] = true;
    } else if (ocupacion.esDiaSalida) {
      clases['solo-salida'] = true;
    }

    console.log('getClaseOcupacion result:', clases);
    return clases;
  }

  mapearEstadoReserva(estadoReserva: string): string {
    switch (estadoReserva.toLowerCase()) {
      case 'confirmada':
      case 'en curso':
        return 'ocupada';
      case 'pendiente':
        return 'reservada';
      case 'finalizada':
        return 'finalizada';
      case 'cancelada':
      case 'no show':
        return 'disponible';
      default:
        return 'disponible';
    }
  }

  mapearEstadoHabitacion(estadoHabitacion: string): string {
    switch (estadoHabitacion.toLowerCase()) {
      case 'disponible':
        return 'disponible';
      case 'ocupada':
        return 'ocupada';
      case 'reservada':
        return 'reservada';
      case 'limpieza':
        return 'limpieza';
      case 'mantenimiento':
      case 'fuera de servicio':
        return 'mantenimiento';
      default:
        return 'disponible';
    }
  }

  obtenerNombreCliente(cliente: any): string {
    if (typeof cliente === 'string') return 'Cliente';
    return `${cliente.nombre} ${cliente.apellido}`;
  }

  obtenerColorEstado(estado: string): string {
    const estadoKey = estado as keyof typeof this.estadosOcupacion;
    return this.estadosOcupacion[estadoKey]?.color || '#4CAF50'; // Default to disponible green
  }
}
