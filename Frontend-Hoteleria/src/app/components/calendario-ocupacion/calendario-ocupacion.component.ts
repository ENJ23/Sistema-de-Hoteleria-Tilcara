import { Component, OnInit } from '@angular/core';
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
  estado: string;
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
  esDiaEntrada?: boolean; // Nuevo
  esDiaSalida?: boolean; // Nuevo
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
export class CalendarioOcupacionComponent implements OnInit {
  fechaActual = new Date();
  mesActual = new Date();
  diasCalendario: DiaCalendario[] = [];
  habitaciones: Habitacion[] = [];
  ocupacionCalendario: OcupacionCalendario = {};
  cargando = false;
  cargandoOcupacion = false; // Nueva variable para evitar llamadas múltiples
  
  constructor(
    private habitacionService: HabitacionService,
    private reservaService: ReservaService
  ) {}
  
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
  }

  inicializarCalendario(): void {
    this.generarDiasCalendario();
  }

  generarDiasCalendario(): void {
    const año = this.mesActual.getFullYear();
    const mes = this.mesActual.getMonth();
    
    // Primer día del mes
    const primerDia = new Date(año, mes, 1);
    // Último día del mes
    const ultimoDia = new Date(año, mes + 1, 0);
    
    // Día de la semana del primer día (0 = domingo, 1 = lunes, etc.)
    const diaSemanaPrimerDia = primerDia.getDay();
    
    // Ajustar para que la semana comience en lunes (1) en lugar de domingo (0)
    const inicioSemana = diaSemanaPrimerDia === 0 ? 6 : diaSemanaPrimerDia - 1;
    
    this.diasCalendario = [];
    
    // Agregar días del mes anterior para completar la primera semana
    const primerDiaCalendario = new Date(primerDia);
    primerDiaCalendario.setDate(primerDiaCalendario.getDate() - inicioSemana);
    
    // Generar 42 días (6 semanas x 7 días) para cubrir todo el mes
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
    this.habitacionService.getHabitaciones(1, 100).subscribe({
      next: (response) => {
        this.habitaciones = response.habitaciones.map(hab => ({
          _id: hab._id,
          numero: hab.numero,
          tipo: hab.tipo,
          capacidad: hab.capacidad,
          estado: hab.estado,
          precioActual: hab.precioActual
        }));
        this.cargando = false;
        this.generarOcupacion();
      },
      error: (error) => {
        console.error('Error al cargar habitaciones:', error);
        // Si hay error, crear habitaciones de ejemplo para mostrar el calendario
        this.habitaciones = [
          { _id: '1', numero: '101', tipo: 'Individual', capacidad: 1, estado: 'Disponible', precioActual: 50 },
          { _id: '2', numero: '102', tipo: 'Doble', capacidad: 2, estado: 'Disponible', precioActual: 75 },
          { _id: '3', numero: '103', tipo: 'Triple', capacidad: 3, estado: 'Disponible', precioActual: 100 },
          { _id: '4', numero: '201', tipo: 'Individual', capacidad: 1, estado: 'Disponible', precioActual: 50 },
          { _id: '5', numero: '202', tipo: 'Doble', capacidad: 2, estado: 'Disponible', precioActual: 75 }
        ];
        this.cargando = false;
        this.generarOcupacion();
      }
    });
  }

  generarOcupacion(): void {
    if (this.habitaciones.length === 0) return;
    if (this.cargandoOcupacion) return; // Evitar llamadas múltiples
    
    console.log('Generando ocupación para:', this.mesActual.getMonth() + 1, this.mesActual.getFullYear());
    console.log('Habitaciones disponibles:', this.habitaciones.length);
    
    this.cargandoOcupacion = true;
    this.cargando = true;
    const fechaInicio = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth(), 1);
    const fechaFin = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 0);
    
    console.log('Fechas de búsqueda:', fechaInicio.toISOString().split('T')[0], 'a', fechaFin.toISOString().split('T')[0]);
    
    // Obtener reservas para el mes actual
    this.reservaService.getReservas({
      fechaInicio: fechaInicio.toISOString().split('T')[0],
      fechaFin: fechaFin.toISOString().split('T')[0]
    }, 1, 1000).subscribe({
      next: (response) => {
        console.log('Respuesta del servidor:', response);
        console.log('Reservas encontradas:', response.reservas?.length || 0);
        
        this.ocupacionCalendario = {};
        
        this.diasCalendario.forEach(dia => {
          if (dia.esMesActual) {
            const fechaStr = this.formatearFecha(dia.fecha);
            this.ocupacionCalendario[fechaStr] = [];
            
            this.habitaciones.forEach(habitacion => {
              // Buscar reservas para esta habitación en esta fecha
              const reservasHabitacion = response.reservas.filter(reserva => {
                const habitacionReserva = typeof reserva.habitacion === 'string' ? null : reserva.habitacion;
                const coincideHabitacion = habitacionReserva && habitacionReserva.numero === habitacion.numero;
                const coincideFecha = this.fechaEnRango(dia.fecha, reserva.fechaEntrada, reserva.fechaSalida);
                
                if (coincideHabitacion && coincideFecha) {
                  console.log('Reserva encontrada para habitación', habitacion.numero, 'en fecha', fechaStr);
                }
                
                return coincideHabitacion && coincideFecha;
              });
              
                             if (reservasHabitacion.length > 0) {
                 const reserva = reservasHabitacion[0];
                 const estado = this.mapearEstadoReserva(reserva.estado);
                 const esDiaEntrada = this.esDiaEntrada(dia.fecha, reserva.fechaEntrada);
                 const esDiaSalida = this.esDiaSalida(dia.fecha, reserva.fechaSalida);
                 
                 console.log(`Habitación ${habitacion.numero}, Fecha ${fechaStr}:`, {
                   esDiaEntrada,
                   esDiaSalida,
                   fechaEntrada: reserva.fechaEntrada,
                   fechaSalida: reserva.fechaSalida,
                   fechaActual: dia.fecha.toDateString()
                 });
                 
                 const ocupacion: OcupacionDia = {
                  habitacionId: habitacion._id,
                  habitacionNumero: habitacion.numero,
                  estado: estado,
                  reservaId: reserva._id,
                  clienteNombre: this.obtenerNombreCliente(reserva.cliente),
                  checkIn: esDiaEntrada,
                  checkOut: esDiaSalida,
                  esTransicion: esDiaEntrada && esDiaSalida,
                  esDiaEntrada: esDiaEntrada,
                  esDiaSalida: esDiaSalida
                };
                
                this.ocupacionCalendario[fechaStr].push(ocupacion);
              } else {
                // Si no hay reservas, usar el estado de la habitación
                const ocupacion: OcupacionDia = {
                  habitacionId: habitacion._id,
                  habitacionNumero: habitacion.numero,
                  estado: this.mapearEstadoHabitacion(habitacion.estado),
                  esTransicion: false,
                  esDiaEntrada: false, // Nuevo
                  esDiaSalida: false // Nuevo
                };
                
                this.ocupacionCalendario[fechaStr].push(ocupacion);
              }
            });
          }
        });
        
        this.cargando = false;
        this.cargandoOcupacion = false;
      },
      error: (error) => {
        console.error('Error al cargar ocupación:', error);
        // Si hay error, mostrar todas las habitaciones como disponibles
        this.ocupacionCalendario = {};
        
        this.diasCalendario.forEach(dia => {
          if (dia.esMesActual) {
            const fechaStr = this.formatearFecha(dia.fecha);
            this.ocupacionCalendario[fechaStr] = [];
            
            this.habitaciones.forEach(habitacion => {
              const ocupacion: OcupacionDia = {
                habitacionId: habitacion._id,
                habitacionNumero: habitacion.numero,
                estado: 'disponible',
                esTransicion: false,
                esDiaEntrada: false, // Nuevo
                esDiaSalida: false // Nuevo
              };
              
              this.ocupacionCalendario[fechaStr].push(ocupacion);
            });
          }
        });
        
        this.cargando = false;
        this.cargandoOcupacion = false;
      }
    });
  }

  formatearFecha(fecha: Date): string {
    return fecha.toISOString().split('T')[0];
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
  
  // Métodos auxiliares para el calendario
  fechaEnRango(fecha: Date, fechaInicio: string, fechaFin: string): boolean {
    const fechaInicioDate = new Date(fechaInicio);
    const fechaFinDate = new Date(fechaFin);
    const resultado = fecha >= fechaInicioDate && fecha <= fechaFinDate;
    
    // Log para debug
    if (resultado) {
      console.log('Fecha en rango:', fecha.toDateString(), 'entre', fechaInicioDate.toDateString(), 'y', fechaFinDate.toDateString());
    }
    
    return resultado;
  }
  
  esFechaCheckIn(fecha: Date, fechaCheckIn: string): boolean {
    const fechaCheckInDate = new Date(fechaCheckIn);
    return fecha.toDateString() === fechaCheckInDate.toDateString();
  }
  
  esFechaCheckOut(fecha: Date, fechaCheckOut: string): boolean {
    const fechaCheckOutDate = new Date(fechaCheckOut);
    return fecha.toDateString() === fechaCheckOutDate.toDateString();
  }

  // Nuevo método para determinar si es día de entrada
  esDiaEntrada(fecha: Date, fechaEntrada: string): boolean {
    const fechaEntradaDate = new Date(fechaEntrada);
    return fecha.toDateString() === fechaEntradaDate.toDateString();
  }

  // Nuevo método para determinar si es día de salida
  esDiaSalida(fecha: Date, fechaSalida: string): boolean {
    const fechaSalidaDate = new Date(fechaSalida);
    return fecha.toDateString() === fechaSalidaDate.toDateString();
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
      case 'completada':
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
}
