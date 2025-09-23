import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { DetalleReservaComponent } from '../../components/detalle-reserva/detalle-reserva.component';
import { DetalleReservaModalComponent } from '../../components/detalle-reserva-modal/detalle-reserva-modal.component';
import { HabitacionService } from '../../services/habitacion.service';
import { ReservaService } from '../../services/reserva.service';
import { ClienteService } from '../../services/cliente.service';
import { DateTimeService } from '../../services/date-time.service';

interface Habitacion {
  _id: string;
  numero: string;
  tipo: string;
  capacidad: number;
  estado: 'disponible' | 'ocupada' | 'reservada' | 'mantenimiento' | 'limpieza';
}

interface DiaCalendario {
  fecha: Date;
  numero: number;
  esMesActual: boolean;
  esHoy: boolean;
  esFinDeSemana: boolean;
}

interface EstadoOcupacion {
  tipo: 'disponible' | 'ocupada' | 'reservada' | 'mantenimiento' | 'limpieza' | 'transicion' | 'finalizada';
  checkIn?: boolean;
  checkOut?: boolean;
  esTransicion?: boolean;
  esDiaEntrada?: boolean; // Nuevo
  esDiaSalida?: boolean; // Nuevo
  // Campos para estado de pago
  estaCompletamentePagado?: boolean;
  montoPagado?: number;
  precioTotal?: number;
  montoRestante?: number;
  // Campos para múltiples reservas
  reservas?: any[]; // Todas las reservas para este día
  reservaPrincipal?: any; // La reserva que determina el color principal
  esDiaTransicion?: boolean; // Si hay entrada y salida de diferentes reservas
  reservaEntrada?: any; // Reserva que está entrando
  reservaSalida?: any;   // Reserva que está saliendo
  claseDinamica?: string; // Clase CSS dinámica para transiciones
}

interface OcupacionHabitacion {
  habitacion: Habitacion;
  ocupacionPorDia: { [fecha: string]: EstadoOcupacion };
}

interface Nota {
  texto: string;
  tipo: 'info' | 'importante';
  fecha: Date;
}

interface Estadisticas {
  ocupacionActual: number;
  totalHabitaciones: number;
  porcentajeOcupacion: number;
  reservasHoy: number;
  checkinsHoy: number;
  checkoutsHoy: number;
  ingresosHoy: number;
  reservasPagadasHoy: number;
  reservasPendientes: number;
  pagosPendientes: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatDialogModule
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  fechaActual!: Date;
  mesActual!: Date;
  diasCalendario: DiaCalendario[] = [];
  habitaciones: Habitacion[] = [];
  ocupacionHabitaciones: OcupacionHabitacion[] = [];
  cargando = false;
  cargandoOcupacion = false; // Nueva variable para evitar llamadas múltiples
  cargandoReservas = false; // Nueva variable para evitar llamadas múltiples
  
  // Sistema de debounce y cache
  private destroy$ = new Subject<void>();
  private refreshSubject = new Subject<void>();
  private cacheReservas: { [key: string]: any } = {};
  private lastRefreshTime = 0;
  private readonly CACHE_DURATION = 30000; // 30 segundos
  
  // Sistema de control de peticiones
  private isInitializing = false;
  private initializationPromise: Promise<void> | null = null;
  
  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private habitacionService: HabitacionService,
    private reservaService: ReservaService,
    private clienteService: ClienteService,
    private dateTimeService: DateTimeService
  ) {}
  
  estadisticas: Estadisticas = {
    ocupacionActual: 0,
    totalHabitaciones: 0,
    porcentajeOcupacion: 0,
    reservasHoy: 0,
    checkinsHoy: 0,
    checkoutsHoy: 0,
    ingresosHoy: 0,
    reservasPagadasHoy: 0,
    reservasPendientes: 0,
    pagosPendientes: 0
  };
  
  reservasHoy: any[] = [];
  
  notasDia: Nota[] = [];
  
  nuevaNota = '';

  ngOnInit(): void {
    console.log('🚀 Inicializando Dashboard...');
    this.fechaActual = this.dateTimeService.getCurrentDate();
    this.mesActual = this.dateTimeService.getCurrentDate();
    
    // Configurar debounce para refrescar datos
    this.refreshSubject.pipe(
      debounceTime(500), // Esperar 500ms después de la última llamada
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.generarOcupacion();
    });
    
    this.inicializarHabitaciones();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Sistema de inicialización controlada
  private async initializeSequentially(): Promise<void> {
    if (this.isInitializing && this.initializationPromise) {
      return this.initializationPromise;
    }

    this.isInitializing = true;
    this.initializationPromise = this.performInitialization();
    
    try {
      await this.initializationPromise;
    } finally {
      this.isInitializing = false;
      this.initializationPromise = null;
    }
  }

  private async performInitialization(): Promise<void> {
    console.log('🏨 Inicializando habitaciones...');
    this.cargando = true;
    
    try {
      // Paso 1: Cargar habitaciones
      await this.loadHabitaciones();
      
      // Esperar 1 segundo
      await this.delay(1000);
      
      // Paso 2: Generar calendario
      console.log('📅 Generando calendario...');
      this.generarCalendario();
      
      // Esperar 1 segundo
      await this.delay(1000);
      
      // Paso 3: Generar ocupación
      console.log('📊 Generando ocupación...');
      await this.loadOcupacion();
      
      // Esperar 1 segundo
      await this.delay(1000);
      
      // Paso 4: Cargar estadísticas
      console.log('📈 Cargando estadísticas...');
      this.cargarEstadisticas();
      
      // Esperar 1 segundo
      await this.delay(1000);
      
      // Paso 5: Cargar reservas del día
      console.log('📋 Cargando reservas del día...');
      this.cargarReservasHoy();
      
    } catch (error) {
      console.error('❌ Error durante la inicialización:', error);
      this.cargando = false;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async loadHabitaciones(): Promise<void> {
    return new Promise((resolve, reject) => {
    this.habitacionService.getHabitaciones(1, 100).subscribe({
      next: (response) => {
        console.log('✅ Habitaciones cargadas:', response.habitaciones.length);
        this.habitaciones = response.habitaciones.map(hab => ({
          _id: hab._id,
          numero: hab.numero,
          tipo: hab.tipo,
          capacidad: hab.capacidad,
          estado: hab.estado.toLowerCase() as any
        }));
        this.cargando = false;
          // Actualizar estadísticas después de cargar habitaciones
          this.actualizarEstadisticas();
          resolve();
      },
      error: (error) => {
        console.error('❌ Error al cargar habitaciones:', error);
        console.log('🔄 Usando habitaciones de ejemplo...');
        // Si hay error, crear habitaciones de ejemplo para mostrar el calendario
        this.habitaciones = [
          { _id: '1', numero: '101', tipo: 'Individual', capacidad: 1, estado: 'disponible' },
          { _id: '2', numero: '102', tipo: 'Doble', capacidad: 2, estado: 'disponible' },
          { _id: '3', numero: '103', tipo: 'Triple', capacidad: 3, estado: 'disponible' },
          { _id: '4', numero: '201', tipo: 'Individual', capacidad: 1, estado: 'disponible' },
          { _id: '5', numero: '202', tipo: 'Doble', capacidad: 2, estado: 'disponible' }
        ];
        this.cargando = false;
          // Actualizar estadísticas después de cargar habitaciones de ejemplo
          this.actualizarEstadisticas();
          resolve();
        }
      });
    });
  }

  private async loadOcupacion(): Promise<void> {
    return new Promise((resolve, reject) => {
        this.generarOcupacion();
      // Resolver después de un tiempo para permitir que la petición se complete
      setTimeout(resolve, 2000);
    });
  }

  inicializarHabitaciones(): void {
    // Usar el sistema de inicialización secuencial
    this.initializeSequentially().catch(error => {
      console.error('❌ Error en la inicialización:', error);
    });
  }

  generarCalendario(): void {
    const primerDia = this.dateTimeService.getFirstDayOfMonth(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1);
    const ultimoDia = this.dateTimeService.getLastDayOfMonth(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1);
    
    this.diasCalendario = [];
    
    // Generar todos los días del mes en horario argentino
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      // Crear fecha en horario argentino
      const fecha = this.dateTimeService.createArgentinaDate(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, dia);
      this.diasCalendario.push({
        fecha: fecha,
        numero: dia,
        esMesActual: true,
        esHoy: this.dateTimeService.isToday(fecha),
        esFinDeSemana: this.dateTimeService.isWeekend(fecha)
      });
    }
  }

  generarOcupacion(): void {
    if (this.habitaciones.length === 0) {
      console.log('❌ No hay habitaciones para generar ocupación');
      return;
    }
    
    if (this.cargandoOcupacion) {
      console.log('⏳ Ya se está cargando la ocupación, esperando...');
      return;
    }
    
    // Verificar cache
    const cacheKey = `${this.mesActual.getFullYear()}-${this.mesActual.getMonth() + 1}`;
    const now = Date.now();
    
    if (this.cacheReservas[cacheKey] && (now - this.lastRefreshTime) < this.CACHE_DURATION) {
      console.log('📋 Usando datos en cache para ocupación');
      this.procesarOcupacionConDatos(this.cacheReservas[cacheKey]);
      return;
    }
    
    console.log('📊 Generando ocupación...');
    console.log('🏨 Habitaciones disponibles:', this.habitaciones.length);
    console.log('📅 Días del calendario:', this.diasCalendario.length);
    
    this.cargandoOcupacion = true;
    this.cargando = true;
    const fechaInicio = this.dateTimeService.getFirstDayOfMonth(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1);
    const fechaFin = this.dateTimeService.getLastDayOfMonth(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1);
    
    // Obtener reservas para el mes actual
    this.reservaService.getReservas({
      fechaInicio: this.dateTimeService.formatDateToLocalString(fechaInicio),
      fechaFin: this.dateTimeService.formatDateToLocalString(fechaFin)
    }, 1, 1000).subscribe({
      next: (response) => {
        console.log('📋 Reservas cargadas:', response.reservas.length);
        
        // Guardar en cache
        this.cacheReservas[cacheKey] = response;
        this.lastRefreshTime = now;
        
        this.procesarOcupacionConDatos(response);
      },
      error: (error) => {
        console.error('Error al cargar ocupación:', error);
        
        // Si hay error 429, esperar un poco y reintentar
        if (error.status === 429) {
          console.log('⚠️ Demasiadas peticiones, esperando 2 segundos...');
          setTimeout(() => {
            this.cargandoOcupacion = false;
            this.cargando = false;
            this.refreshSubject.next(); // Reintentar con debounce
          }, 2000);
          return;
        }
        
        // Si hay error, mostrar todas las habitaciones como disponibles
        this.ocupacionHabitaciones = [];
        
        this.habitaciones.forEach(habitacion => {
          const ocupacion: OcupacionHabitacion = {
            habitacion: habitacion,
            ocupacionPorDia: {}
          };
          
          this.diasCalendario.forEach(dia => {
            if (dia.esMesActual) {
              const fechaStr = this.formatearFecha(dia.fecha);
              ocupacion.ocupacionPorDia[fechaStr] = { tipo: 'disponible' };
            }
          });
          
          this.ocupacionHabitaciones.push(ocupacion);
        });
        
        this.cargando = false;
        this.cargandoOcupacion = false;
      }
    });
  }

  private procesarOcupacionConDatos(response: any): void {
    console.log('📋 Detalle de reservas:', response.reservas.map((r: any) => ({
          habitacion: typeof r.habitacion === 'string' ? r.habitacion : r.habitacion.numero,
          fechaEntrada: r.fechaEntrada,
          fechaSalida: r.fechaSalida,
          estado: r.estado
        })));
        
        this.ocupacionHabitaciones = [];
        
        this.habitaciones.forEach(habitacion => {
          const ocupacion: OcupacionHabitacion = {
            habitacion: habitacion,
            ocupacionPorDia: {}
          };
          
          this.diasCalendario.forEach(dia => {
            if (dia.esMesActual) {
              const fechaStr = this.formatearFecha(dia.fecha);
              
              // Buscar reservas para esta habitación en esta fecha
          const reservasHabitacion = response.reservas.filter((reserva: any) => {
                const habitacionReserva = typeof reserva.habitacion === 'string' ? null : reserva.habitacion;
            
            if (!habitacionReserva || habitacionReserva.numero !== habitacion.numero) {
              return false;
            }
            
            const fechaStr = this.formatearFecha(dia.fecha);
            const fechaEntradaStr = reserva.fechaEntrada.split('T')[0];
            const fechaSalidaStr = reserva.fechaSalida.split('T')[0];
            
            // Verificar si está en el rango normal
            const enRango = this.fechaEnRango(dia.fecha, reserva.fechaEntrada, reserva.fechaSalida);
            
            // Verificar si es específicamente el día de entrada o salida
            const esDiaEntrada = fechaStr === fechaEntradaStr;
            const esDiaSalida = fechaStr === fechaSalidaStr;
            
            // CORRECCIÓN: Para reservas con problemas de zona horaria, también considerar
            // si la fecha está dentro del rango cuando se ajusta la zona horaria
            const fechaEntradaObj = new Date(reserva.fechaEntrada);
            const fechaSalidaObj = new Date(reserva.fechaSalida);
            
            // Ajustar fechas a zona horaria local para comparación
            const fechaEntradaLocal = new Date(fechaEntradaObj.getTime() - (fechaEntradaObj.getTimezoneOffset() * 60000));
            const fechaSalidaLocal = new Date(fechaSalidaObj.getTime() - (fechaSalidaObj.getTimezoneOffset() * 60000));
            
            const fechaEntradaLocalStr = fechaEntradaLocal.toISOString().split('T')[0];
            const fechaSalidaLocalStr = fechaSalidaLocal.toISOString().split('T')[0];
            
            const esDiaEntradaLocal = fechaStr === fechaEntradaLocalStr;
            const esDiaSalidaLocal = fechaStr === fechaSalidaLocalStr;
            
            // Para cualquier reserva, incluir si está en rango O si es día de entrada/salida específico
            // También incluir si hay problemas de zona horaria que hacen que las fechas se vean diferentes
            const incluir = enRango || esDiaEntrada || esDiaSalida || esDiaEntradaLocal || esDiaSalidaLocal;
            
            // CASO ESPECIAL: Si las fechas originales son iguales pero las locales son diferentes,
            // significa que hay un problema de zona horaria y debemos incluir ambos días
            if (fechaEntradaStr === fechaSalidaStr && fechaEntradaLocalStr !== fechaSalidaLocalStr) {
              const incluirPorZonaHoraria = fechaStr === fechaEntradaLocalStr || fechaStr === fechaSalidaLocalStr;
              if (incluirPorZonaHoraria) {
                return true;
              }
            }
            
            return incluir;
              });
              
              if (reservasHabitacion.length > 0) {
            // Verificar si es un día de transición (salida de una reserva + entrada de otra)
            const esDiaTransicion = this.detectarDiaTransicion(reservasHabitacion, dia.fecha);
            
            if (esDiaTransicion) {
              // Día de transición: obtener reservas específicas de entrada y salida
              const reservaQueTermina = reservasHabitacion.find((r: any) => {
                const fechaSalida = r.fechaSalida.split('T')[0];
                return fechaSalida === fechaStr;
              });
              
              const reservaQueComienza = reservasHabitacion.find((r: any) => {
                const fechaEntrada = r.fechaEntrada.split('T')[0];
                return fechaEntrada === fechaStr;
              });
              
                let estado: EstadoOcupacion = { 
                tipo: 'transicion',
                checkIn: true,
                checkOut: true,
                esTransicion: true,
                esDiaEntrada: true,
                esDiaSalida: true,
                esDiaTransicion: true,
                // Información de múltiples reservas
                reservas: reservasHabitacion,
                reservaPrincipal: reservasHabitacion[0], // Para compatibilidad
                // Información específica de transición
                reservaEntrada: reservaQueComienza,
                reservaSalida: reservaQueTermina
              };
                
                ocupacion.ocupacionPorDia[fechaStr] = estado;
            } else {
              // Día normal de reserva
              const reservaPrincipal = this.determinarReservaPrincipal(reservasHabitacion);
              
              // CORRECCIÓN: Usar la misma lógica de zona horaria que en el filtro
              const fechaStr = this.formatearFecha(dia.fecha);
              const fechaEntradaStr = reservaPrincipal.fechaEntrada.split('T')[0];
              const fechaSalidaStr = reservaPrincipal.fechaSalida.split('T')[0];
              
              // Verificar fechas locales para manejar problemas de zona horaria
              const fechaEntradaObj = new Date(reservaPrincipal.fechaEntrada);
              const fechaSalidaObj = new Date(reservaPrincipal.fechaSalida);
              
              const fechaEntradaLocal = new Date(fechaEntradaObj.getTime() - (fechaEntradaObj.getTimezoneOffset() * 60000));
              const fechaSalidaLocal = new Date(fechaSalidaObj.getTime() - (fechaSalidaObj.getTimezoneOffset() * 60000));
              
              const fechaEntradaLocalStr = fechaEntradaLocal.toISOString().split('T')[0];
              const fechaSalidaLocalStr = fechaSalidaLocal.toISOString().split('T')[0];
              
              // Detectar días de entrada y salida usando ambas comparaciones
              const esDiaEntrada = fechaStr === fechaEntradaStr || fechaStr === fechaEntradaLocalStr;
              const esDiaSalida = fechaStr === fechaSalidaStr || fechaStr === fechaSalidaLocalStr;
              
              let estado: EstadoOcupacion = { 
                tipo: this.mapearEstadoReserva(reservaPrincipal.estado),
                checkIn: esDiaEntrada,
                checkOut: esDiaSalida,
                esTransicion: esDiaEntrada && esDiaSalida,
                esDiaEntrada: esDiaEntrada,
                esDiaSalida: esDiaSalida,
                esDiaTransicion: false,
                // Agregar información del estado de pago de la reserva principal
                estaCompletamentePagado: reservaPrincipal.estaCompletamentePagado || reservaPrincipal.pagado || false,
                montoPagado: reservaPrincipal.montoPagado || 0,
                precioTotal: reservaPrincipal.precioTotal || 0,
                montoRestante: (reservaPrincipal.precioTotal || 0) - (reservaPrincipal.montoPagado || 0),
                // Información de múltiples reservas
                reservas: reservasHabitacion,
                reservaPrincipal: reservaPrincipal
              };
              
              ocupacion.ocupacionPorDia[fechaStr] = estado;
                }
              } else {
                // Si no hay reservas para este día específico, la habitación está disponible
                if (habitacion.estado === 'mantenimiento') {
                  ocupacion.ocupacionPorDia[fechaStr] = { tipo: 'mantenimiento' };
                } else {
                  ocupacion.ocupacionPorDia[fechaStr] = { tipo: 'disponible' };
                }
              }
            }
          });
          
          this.ocupacionHabitaciones.push(ocupacion);
        });
        
        this.cargando = false;
    this.cargandoOcupacion = false;
  }

  formatearFecha(fecha: Date): string {
    return this.dateTimeService.formatDateToLocalString(fecha);
  }

  // Función para determinar la prioridad de una reserva
  private obtenerPrioridadReserva(reserva: any): number {
    // Prioridad más alta = número más bajo
    const prioridades: { [key: string]: number } = {
      'En curso': 1,      // Máxima prioridad - ya está ocupada
      'Confirmada': 2,     // Alta prioridad - confirmada
      'Pendiente': 3,     // Media prioridad - pendiente
      'Completada': 4,    // Baja prioridad - ya terminó
      'Cancelada': 5,     // Muy baja prioridad - cancelada
      'No Show': 6        // Muy baja prioridad - no se presentó
    };
    
    return prioridades[reserva.estado] || 7;
  }

  // Función para determinar la reserva principal en un día con múltiples reservas
  private determinarReservaPrincipal(reservas: any[]): any {
    if (reservas.length === 1) {
      return reservas[0];
    }
    
    // Ordenar por prioridad (menor número = mayor prioridad)
    const reservasOrdenadas = reservas.sort((a, b) => {
      const prioridadA = this.obtenerPrioridadReserva(a);
      const prioridadB = this.obtenerPrioridadReserva(b);
      
      if (prioridadA !== prioridadB) {
        return prioridadA - prioridadB;
      }
      
      // Si tienen la misma prioridad, usar la más reciente
      return new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime();
    });
    
    return reservasOrdenadas[0];
  }

  // Función para detectar si un día es de transición (salida de una reserva + entrada de otra)
  private detectarDiaTransicion(reservas: any[], fecha: Date): boolean {
    if (reservas.length < 2) {
      return false;
    }
    
    const fechaStr = this.dateTimeService.formatDateToLocalString(fecha);
    
    // Verificar si hay una reserva que termina este día Y otra reserva diferente que comienza este día
    const reservaQueTermina = reservas.find(r => {
      const fechaSalida = r.fechaSalida.split('T')[0];
      return fechaSalida === fechaStr;
    });
    
    const reservaQueComienza = reservas.find(r => {
      const fechaEntrada = r.fechaEntrada.split('T')[0];
      return fechaEntrada === fechaStr;
    });
    
    // Solo es transición si hay dos reservas diferentes: una que termina y otra que comienza
    return reservaQueTermina && reservaQueComienza && reservaQueTermina._id !== reservaQueComienza._id;
  }

  // Método para obtener el color de una reserva según su estado y pago
  obtenerColorReserva(reserva: any): string {
    if (!reserva) return '#6c757d'; // Color por defecto
    
    // Determinar el estado de pago
    const montoPagado = reserva.montoPagado || 0;
    const precioTotal = reserva.precioTotal || reserva.precioPorNoche || 0;
    const estaCompletamentePagado = montoPagado >= precioTotal;
    const tienePagoParcial = montoPagado > 0 && montoPagado < precioTotal;
    
    // Mapear el estado de la reserva al tipo de ocupación
    const tipoOcupacion = this.mapearEstadoReserva(reserva.estado);
    
    // Determinar el color según el tipo de ocupación y pago
    if (tipoOcupacion === 'ocupada') {
      if (estaCompletamentePagado) {
        return '#28a745'; // Verde para completamente pagado
      } else if (tienePagoParcial) {
        return '#ffc107'; // Amarillo para parcialmente pagado
      } else {
        return '#dc3545'; // Rojo para sin pago
      }
    } else if (tipoOcupacion === 'reservada') {
      if (estaCompletamentePagado) {
        return '#17a2b8'; // Cyan para reservada y pagada
      } else if (tienePagoParcial) {
        return '#fd7e14'; // Naranja para reservada y parcialmente pagada
      } else {
        return '#6f42c1'; // Morado para reservada sin pago
      }
    } else if (tipoOcupacion === 'finalizada') {
      if (estaCompletamentePagado) {
        return '#007bff'; // Azul para finalizada y pagada
      } else if (tienePagoParcial) {
        return '#ffc107'; // Amarillo para finalizada y parcialmente pagada
      } else {
        return '#6c757d'; // Gris para finalizada sin pago
      }
    } else if (tipoOcupacion === 'disponible') {
      return '#d4edda'; // Verde claro para disponible
    }
    
    return '#6c757d'; // Color por defecto
  }

  // Método para verificar si es check-out hoy (para indicador de urgencia)
  esCheckOutHoy(fecha: Date, estado: EstadoOcupacion): boolean {
    if (!estado || !estado.reservaPrincipal) return false;
    
    const hoy = new Date();
    const fechaStr = this.formatearFecha(fecha);
    const hoyStr = this.formatearFecha(hoy);
    
    // Verificar si es día de salida y es hoy
    return (estado.esDiaSalida || false) && fechaStr === hoyStr;
  }

  // Método para generar estilos CSS dinámicos para días de transición
  private generarEstilosTransicionDinamica(estado: EstadoOcupacion): void {
    if (!estado.reservaEntrada || !estado.reservaSalida) return;
    
    const colorPrimeraReserva = this.obtenerColorReserva(estado.reservaEntrada);
    const colorSegundaReserva = this.obtenerColorReserva(estado.reservaSalida);
    
    // Crear un ID único para esta combinación de colores
    const idUnico = `transicion-${colorPrimeraReserva.replace('#', '')}-${colorSegundaReserva.replace('#', '')}`;
    
    // Verificar si ya existe este estilo
    if (document.getElementById(idUnico)) return;
    
    // Crear el elemento style
    const style = document.createElement('style');
    style.id = idUnico;
    style.textContent = `
      .${idUnico} {
        --color-primera-reserva: ${colorPrimeraReserva};
        --color-segunda-reserva: ${colorSegundaReserva};
        background: linear-gradient(180deg, ${colorPrimeraReserva} 0%, ${colorPrimeraReserva} 50%, ${colorSegundaReserva} 50%, ${colorSegundaReserva} 100%);
        color: white;
        font-weight: bold;
        animation: pulse-transition 2s infinite;
        position: relative;
        overflow: hidden;
      }
      .${idUnico}::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 2px;
        background: rgba(255, 255, 255, 0.8);
        transform: translateY(-50%);
        z-index: 10;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      }
    `;
    
    // Agregar al documento
    document.head.appendChild(style);
    
    // Agregar la clase dinámica al estado
    estado.claseDinamica = idUnico;
  }

  // Métodos para aplicar colores dinámicos usando CSS variables
  private aplicarColoresTransicionMultiple(estado: EstadoOcupacion): void {
    if (!estado.reservaEntrada || !estado.reservaSalida) return;
    
    const colorEntrada = this.obtenerColorReserva(estado.reservaEntrada);
    const colorSalida = this.obtenerColorReserva(estado.reservaSalida);
    
    // Aplicar CSS variables al elemento
    const elemento = document.querySelector(`[data-habitacion="${estado.reservaPrincipal?.habitacion?.numero}"][data-fecha="${this.formatearFecha(new Date())}"]`);
    if (elemento) {
      (elemento as HTMLElement).style.setProperty('--color-entrada', colorEntrada);
      (elemento as HTMLElement).style.setProperty('--color-salida', colorSalida);
    }
  }

  private aplicarColorTransicionEntrada(estado: EstadoOcupacion): void {
    if (!estado.reservaPrincipal) return;
    
    const colorEntrada = this.obtenerColorReserva(estado.reservaPrincipal);
    
    // Aplicar CSS variable al elemento
    const elemento = document.querySelector(`[data-habitacion="${estado.reservaPrincipal?.habitacion?.numero}"][data-fecha="${this.formatearFecha(new Date())}"]`);
    if (elemento) {
      (elemento as HTMLElement).style.setProperty('--color-entrada', colorEntrada);
    }
  }

  private aplicarColorTransicionSalida(estado: EstadoOcupacion): void {
    if (!estado.reservaPrincipal) return;
    
    const colorSalida = this.obtenerColorReserva(estado.reservaPrincipal);
    
    // Aplicar CSS variable al elemento
    const elemento = document.querySelector(`[data-habitacion="${estado.reservaPrincipal?.habitacion?.numero}"][data-fecha="${this.formatearFecha(new Date())}"]`);
    if (elemento) {
      (elemento as HTMLElement).style.setProperty('--color-salida', colorSalida);
    }
  }

  private aplicarColorTransicionMismaReserva(estado: EstadoOcupacion): void {
    if (!estado.reservaPrincipal) return;
    
    const colorReserva = this.obtenerColorReserva(estado.reservaPrincipal);
    
    // Aplicar CSS variables al elemento (mismo color para ambas mitades)
    const elemento = document.querySelector(`[data-habitacion="${estado.reservaPrincipal?.habitacion?.numero}"][data-fecha="${this.formatearFecha(new Date())}"]`);
    if (elemento) {
      (elemento as HTMLElement).style.setProperty('--color-entrada', colorReserva);
      (elemento as HTMLElement).style.setProperty('--color-salida', colorReserva);
    }
  }



  obtenerClaseOcupacion(estado: EstadoOcupacion): string {
    let clase = '';
    
    // Clase base según el tipo
    switch (estado.tipo) {
      case 'disponible': clase = 'ocupacion-disponible'; break;
      case 'ocupada': clase = 'ocupacion-ocupada'; break;
      case 'reservada': clase = 'ocupacion-reservada'; break;
      case 'limpieza': clase = 'ocupacion-limpieza'; break;
      case 'mantenimiento': clase = 'ocupacion-mantenimiento'; break;
      case 'finalizada': clase = 'ocupacion-finalizada'; break;
      case 'transicion': 
        clase = 'ocupacion-transicion';
        // Para días de transición, generar estilos dinámicos
        if (estado.esDiaTransicion && estado.reservaEntrada && estado.reservaSalida) {
          this.generarEstilosTransicionDinamica(estado);
        }
        break;
      default: clase = 'ocupacion-desconocida'; break;
    }
    
    // Agregar clases específicas para transiciones visuales
    if (estado.esDiaEntrada || estado.esDiaSalida) {
      if (estado.esDiaTransicion) {
        // Transición múltiple: entrada y salida de diferentes reservas
        clase += ' transicion-multiple-visual';
        // Aplicar colores dinámicos usando CSS variables
        this.aplicarColoresTransicionMultiple(estado);
      } else if (estado.esDiaEntrada && !estado.esDiaSalida) {
        // Solo entrada
        clase += ' transicion-entrada-unica';
        this.aplicarColorTransicionEntrada(estado);
      } else if (estado.esDiaSalida && !estado.esDiaEntrada) {
        // Solo salida
        clase += ' transicion-salida-unica';
        this.aplicarColorTransicionSalida(estado);
      } else if (estado.esDiaEntrada && estado.esDiaSalida) {
        // Entrada y salida de la misma reserva
        clase += ' transicion-multiple-visual';
        this.aplicarColorTransicionMismaReserva(estado);
      }
    }
    
    // Agregar clases específicas para entrada y salida (mantener compatibilidad)
    if (estado.esDiaTransicion) {
      // Día de transición: entrada y salida de diferentes reservas
      clase += ' transicion-multiple';
      // Si hay clase dinámica, agregarla
      if (estado.claseDinamica) {
        clase += ' ' + estado.claseDinamica;
      }
    } else if (estado.esDiaEntrada && estado.esDiaSalida) {
      // Entrada y salida de la misma reserva
      clase += ' entrada-salida';
    } else if (estado.esDiaEntrada) {
      clase += ' solo-entrada';
    } else if (estado.esDiaSalida) {
      clase += ' solo-salida';
    }
    
    // Agregar clases para transiciones (mantener compatibilidad)
    if (estado.esTransicion) {
      if (estado.checkIn && estado.checkOut) {
        clase += ' transicion-completa';
      } else if (estado.checkOut) {
        clase += ' transicion-checkout';
      } else if (estado.checkIn) {
        clase += ' transicion-checkin';
      }
    }
    
    // Agregar clases específicas para estado de pago (solo para reservas ocupadas)
    if (estado.tipo === 'ocupada' || estado.tipo === 'reservada') {
      if (estado.estaCompletamentePagado) {
        clase += ' completamente-pagado';
      } else if (estado.montoPagado && estado.montoPagado > 0) {
        clase += ' parcialmente-pagado';
      } else {
        clase += ' sin-pago';
      }
    }
    
    return clase;
  }

  obtenerIconoOcupacion(estado: EstadoOcupacion): string {
    if (estado.esTransicion) {
      if (estado.checkIn && estado.checkOut) {
        return 'swap_horiz';
      } else if (estado.checkOut) {
        return 'logout';
      } else if (estado.checkIn) {
        return 'login';
      }
    }
    
    switch (estado.tipo) {
      case 'disponible': return 'check_circle';
      case 'ocupada': return 'person';
      case 'reservada': return 'event';
      case 'limpieza': return 'cleaning_services';
      case 'mantenimiento': return 'handyman';
      case 'transicion': return 'swap_horiz';
      default: return 'help';
    }
  }
  
  // Métodos auxiliares para el calendario
  fechaEnRango(fecha: Date, fechaInicio: string, fechaFin: string): boolean {
    return this.dateTimeService.isDateInRange(fecha, fechaInicio, fechaFin);
  }
  
  esFechaCheckIn(fecha: Date, fechaCheckIn: string): boolean {
    return this.dateTimeService.isCheckInDate(fecha, fechaCheckIn);
  }
  
  esFechaCheckOut(fecha: Date, fechaCheckOut: string): boolean {
    return this.dateTimeService.isCheckOutDate(fecha, fechaCheckOut);
  }
  
  mapearEstadoReserva(estadoReserva: string): 'disponible' | 'ocupada' | 'reservada' | 'limpieza' | 'mantenimiento' | 'finalizada' {
    switch (estadoReserva.toLowerCase()) {
      case 'confirmada':
      case 'en curso':
        return 'ocupada';
      case 'pendiente':
        return 'reservada';
      case 'finalizada':
        return 'finalizada';
      case 'completada':
      case 'cancelada':
      case 'no show':
        return 'disponible';
      default:
        return 'disponible';
    }
  }
  
  mapearEstadoHabitacion(estadoHabitacion: string): 'disponible' | 'ocupada' | 'reservada' | 'limpieza' | 'mantenimiento' {
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
  
  cargarEstadisticas(): void {
    // Actualizar estadísticas de ocupación básicas
    this.actualizarEstadisticas();
  }
  
  cargarReservasHoy(): void {
    if (this.cargandoReservas) {
      console.log('⏳ Ya se están cargando las reservas del día, esperando...');
      return;
    }
    
    this.cargandoReservas = true;
    const hoy = this.dateTimeService.getCurrentDateString();
    
    this.reservaService.getReservas({
      fechaInicio: hoy,
      fechaFin: hoy
    }, 1, 100).subscribe({
      next: (response) => {
        this.reservasHoy = response.reservas.map(reserva => ({
          horaEntrada: reserva.horaEntrada,
          horaSalida: reserva.horaSalida,
          cliente: typeof reserva.cliente === 'string' ? { nombre: 'Cliente', apellido: '' } : reserva.cliente,
          habitacion: typeof reserva.habitacion === 'string' ? { numero: 'N/A', tipo: 'N/A' } : reserva.habitacion,
          estado: reserva.estado,
          pagado: reserva.pagado,
          precioTotal: reserva.precioTotal || 0,
          montoPagado: reserva.montoPagado || 0
        }));
        
        // Actualizar estadísticas del día
        this.actualizarEstadisticas();
        
        this.cargandoReservas = false;
      },
      error: (error) => {
        console.error('Error al cargar reservas del día:', error);
        this.cargandoReservas = false;
      }
    });
  }

  private actualizarEstadisticas(): void {
    // Estadísticas de ocupación
    if (this.habitaciones.length > 0) {
      const habitacionesOcupadas = this.habitaciones.filter(h => h.estado === 'ocupada').length;
      const habitacionesReservadas = this.habitaciones.filter(h => h.estado === 'reservada').length;
      
      this.estadisticas.ocupacionActual = habitacionesOcupadas + habitacionesReservadas;
      this.estadisticas.totalHabitaciones = this.habitaciones.length;
      this.estadisticas.porcentajeOcupacion = Math.round((this.estadisticas.ocupacionActual / this.estadisticas.totalHabitaciones) * 100);
    }

    // Estadísticas de reservas del día
        this.estadisticas.reservasHoy = this.reservasHoy.length;
        this.estadisticas.checkinsHoy = this.reservasHoy.filter(r => r.estado === 'En curso').length;
        this.estadisticas.checkoutsHoy = this.reservasHoy.filter(r => r.estado === 'Completada').length;
        this.estadisticas.reservasPagadasHoy = this.reservasHoy.filter(r => r.pagado).length;
    
    // Ingresos del día (solo reservas completamente pagadas)
        this.estadisticas.ingresosHoy = this.reservasHoy
          .filter(r => r.pagado)
      .reduce((total, r) => total + (r.precioTotal || 0), 0);

    // Calcular reservas y pagos pendientes
    this.calcularReservasPendientes();
  }

  private calcularReservasPendientes(): void {
    // Cargar todas las reservas activas para calcular pendientes
    this.reservaService.getReservas({
      estado: 'Pendiente,Confirmada,En curso'
    }, 1, 1000).subscribe({
      next: (response) => {
        const reservasActivas = response.reservas;
        
        // Reservas pendientes (estado 'Pendiente')
        this.estadisticas.reservasPendientes = reservasActivas.filter(r => r.estado === 'Pendiente').length;
        
        // Pagos pendientes (reservas que no están completamente pagadas)
        const reservasConPagoPendiente = reservasActivas.filter(r => {
          const montoPagado = r.montoPagado || 0;
          const precioTotal = r.precioTotal || 0;
          return montoPagado < precioTotal;
        });
        
        this.estadisticas.pagosPendientes = reservasConPagoPendiente.length;
      },
      error: (error) => {
        console.error('Error al cargar reservas para estadísticas pendientes:', error);
        this.estadisticas.reservasPendientes = 0;
        this.estadisticas.pagosPendientes = 0;
      }
    });
  }

  obtenerTooltipOcupacion(estado: EstadoOcupacion, habitacion: Habitacion, dia: DiaCalendario): string {
    let tooltip = `Habitación ${habitacion.numero} - ${this.dateTimeService.formatDateForDisplay(dia.fecha)}`;
    
    if (!estado) {
      return tooltip + ' - Disponible';
    }
    
    if (estado.esDiaEntrada && estado.esDiaSalida) {
      tooltip += ' - Entrada y Salida';
    } else if (estado.esDiaEntrada) {
      tooltip += ' - Entrada';
    } else if (estado.esDiaSalida) {
      tooltip += ' - Salida';
    } else {
      switch (estado.tipo) {
      case 'disponible': tooltip += ' - Disponible'; break;
      case 'ocupada': tooltip += ' - Ocupada'; break;
      case 'reservada': tooltip += ' - Reservada'; break;
      case 'limpieza': tooltip += ' - En limpieza'; break;
      case 'mantenimiento': tooltip += ' - En mantenimiento'; break;
      case 'finalizada': tooltip += ' - Finalizada'; break;
      case 'transicion': tooltip += ' - Día de Transición'; break;
      default: tooltip += ' - Estado desconocido'; break;
    }
    }
    
    // Agregar información del estado de pago para reservas ocupadas/reservadas/finalizadas
    if (estado.tipo === 'ocupada' || estado.tipo === 'reservada' || estado.tipo === 'finalizada') {
      if (estado.estaCompletamentePagado) {
        tooltip += ' - Completamente pagado';
      } else if (estado.montoPagado && estado.montoPagado > 0) {
        tooltip += ` - Parcialmente pagado ($${estado.montoPagado}/${estado.precioTotal})`;
      } else {
        tooltip += ' - Sin pago';
      }
    }
    
    // Agregar información de múltiples reservas
    if (estado.reservas && estado.reservas.length > 1) {
      tooltip += `\n\nMúltiples reservas (${estado.reservas.length}):`;
      estado.reservas.forEach((reserva, index) => {
        const cliente = `${reserva.cliente.nombre} ${reserva.cliente.apellido}`;
        const estadoReserva = reserva.estado;
        tooltip += `\n${index + 1}. ${cliente} (${estadoReserva})`;
      });
    }
    
    return tooltip;
  }

  obtenerNombreMes(): string {
    return `${this.dateTimeService.getMonthName(this.mesActual.getMonth())} ${this.mesActual.getFullYear()}`;
  }

  mesAnterior(): void {
    // Crear una nueva fecha para forzar la detección de cambios
    this.mesActual = this.dateTimeService.createArgentinaDate(this.mesActual.getFullYear(), this.mesActual.getMonth(), 1);
    console.log('📅 Mes anterior:', this.mesActual);
    this.generarCalendario();
    this.generarOcupacion();
  }

  mesSiguiente(): void {
    // Crear una nueva fecha para forzar la detección de cambios
    this.mesActual = this.dateTimeService.createArgentinaDate(this.mesActual.getFullYear(), this.mesActual.getMonth() + 2, 1);
    console.log('📅 Mes siguiente:', this.mesActual);
    this.generarCalendario();
    this.generarOcupacion();
  }

  seleccionarCelda(habitacion: Habitacion, dia: DiaCalendario): void {
    if (dia.esMesActual) {
      console.log(`Habitación ${habitacion.numero} - Día ${dia.numero}`);
      
      // Buscar si hay una reserva para esta habitación en esta fecha
      const fechaStr = this.formatearFecha(dia.fecha);
      const ocupacionHabitacion = this.ocupacionHabitaciones.find(oc => oc.habitacion._id === habitacion._id);
      
      if (ocupacionHabitacion && ocupacionHabitacion.ocupacionPorDia[fechaStr]) {
        const estadoOcupacion = ocupacionHabitacion.ocupacionPorDia[fechaStr];
        
        // Si hay una reserva (ocupada o reservada), mostrar el detalle
        if (estadoOcupacion.tipo === 'ocupada' || estadoOcupacion.tipo === 'reservada') {
          // Si hay múltiples reservas, mostrar opciones
          if (estadoOcupacion.reservas && estadoOcupacion.reservas.length > 1) {
            this.mostrarOpcionesMultiplesReservas(estadoOcupacion.reservas, habitacion, dia);
          } else {
            // Una sola reserva o usar la reserva principal
            const reserva = estadoOcupacion.reservaPrincipal || this.reservasHoy.find(r => {
            const reservaHabitacion = typeof r.habitacion === 'string' ? r.habitacion : r.habitacion._id;
            return reservaHabitacion === habitacion._id && 
                   this.fechaEnRango(dia.fecha, r.fechaEntrada, r.fechaSalida);
          });
          
          if (reserva) {
              // Si la reserva está confirmada o pendiente y es el día de entrada, ofrecer check-in simple
              if ((reserva.estado === 'Confirmada' || reserva.estado === 'Pendiente') && this.esFechaCheckIn(dia.fecha, reserva.fechaEntrada)) {
                this.mostrarOpcionesCheckIn(reserva);
              } else {
            this.verDetalleReserva(reserva);
              }
          } else {
            // Si no encontramos la reserva en reservasHoy, buscar en todas las reservas
            this.buscarYMostrarReserva(habitacion._id, fechaStr);
            }
          }
        } else {
          // Si la celda está disponible, preguntar si quiere crear una reserva
          if (confirm(`¿Desea crear una reserva para la habitación ${habitacion.numero} el ${this.dateTimeService.formatDateForDisplay(dia.fecha)}?`)) {
            this.abrirNuevaReservaDesdeFecha(dia.fecha, habitacion);
          }
        }
      } else {
        // Si no hay ocupación registrada, preguntar si quiere crear una reserva
        if (confirm(`¿Desea crear una reserva para la habitación ${habitacion.numero} el ${this.dateTimeService.formatDateForDisplay(dia.fecha)}?`)) {
          this.abrirNuevaReservaDesdeFecha(dia.fecha, habitacion);
        }
      }
    }
  }

  abrirNuevaReservaDesdeFecha(fecha: Date, habitacion?: Habitacion): void {
    const queryParams: any = {
      fecha: this.dateTimeService.formatDateToLocalString(fecha)
    };
    
    if (habitacion) {
      queryParams.habitacion = habitacion._id;
    }
    
    console.log('Navegando a nueva reserva con fecha:', this.dateTimeService.formatDateToLocalString(fecha));
    this.router.navigate(['/nueva-reserva'], { queryParams });
  }

  // Métodos de navegación
  abrirNuevaReserva(): void {
    const fechaFormateada = this.dateTimeService.getCurrentDateString();
    
    console.log('Navegando a nueva reserva con fecha actual:', fechaFormateada);
    this.router.navigate(['/nueva-reserva'], {
      queryParams: {
        fecha: fechaFormateada
      }
    });
  }

  gestionarHabitaciones(): void {
    this.router.navigate(['/habitaciones']);
  }

  irACalendario(): void {
    this.router.navigate(['/calendario']);
  }

  // Función simple para mostrar opciones de check-in
  mostrarOpcionesCheckIn(reserva: any): void {
    console.log('=== MOSTRANDO OPCIONES DE CHECK-IN ===');
    console.log('Reserva:', reserva);
    
    const habitacionNumero = this.obtenerNumeroHabitacion(reserva.habitacion);
    const estadoTexto = reserva.estado === 'Pendiente' ? ' (sin confirmar)' : '';
    const mensaje = `¿Realizar CHECK-IN para ${reserva.cliente.nombre} ${reserva.cliente.apellido} en habitación ${habitacionNumero}${estadoTexto}?`;
    
    if (confirm(mensaje)) {
      this.realizarCheckInSimple(reserva);
    }
  }

  // Función simple para realizar check-in
  realizarCheckInSimple(reserva: any): void {
    console.log('=== REALIZANDO CHECK-IN SIMPLE ===');
    console.log('Reserva ID:', reserva._id);
    
    this.reservaService.checkIn(reserva._id).subscribe({
      next: (reservaActualizada) => {
        console.log('✅ Check-in realizado exitosamente:', reservaActualizada);
        this.mostrarMensaje(`✅ Check-in realizado para ${reserva.cliente.nombre} ${reserva.cliente.apellido}${reserva.estado === 'Pendiente' ? ' (reserva sin confirmar)' : ''}`);
        
        // Recargar datos para reflejar los cambios
        this.cargarReservasHoy();
        this.generarOcupacion();
      },
      error: (error) => {
        console.error('❌ Error en check-in:', error);
        
        let mensajeError = 'Error al realizar check-in';
        
        if (error.status === 403) {
          mensajeError = 'No tienes permisos para realizar check-in';
        } else if (error.status === 401) {
          mensajeError = 'Sesión expirada. Por favor, inicia sesión nuevamente';
        } else if (error.status === 404) {
          mensajeError = 'Reserva no encontrada';
        } else if (error.status === 400) {
          mensajeError = error.error?.message || 'No se puede realizar check-in en este momento';
        }
        
        this.mostrarMensaje(mensajeError);
      }
    });
  }

  // Métodos de acciones rápidas
  realizarCheckIn(): void {
    console.log('=== INICIANDO CHECK-IN DESDE DASHBOARD ===');
    
    // Buscar reservas confirmadas para check-in hoy
    this.reservaService.getReservasCheckInHoy().subscribe({
      next: (reservas) => {
        console.log('Reservas para check-in hoy:', reservas);
        
        if (reservas.length === 0) {
          this.mostrarMensaje('No hay reservas confirmadas para check-in hoy');
          return;
        }

        // Si hay múltiples reservas, mostrar lista para seleccionar
        if (reservas.length > 1) {
          const opciones = reservas.map(r => 
            `${r.cliente.nombre} ${r.cliente.apellido} - Hab. ${this.obtenerNumeroHabitacion(r.habitacion)} (${r.horaEntrada})`
          );
          
          const seleccion = prompt(`Seleccione la reserva para check-in:\n${opciones.map((op, i) => `${i + 1}. ${op}`).join('\n')}`);
          
          if (!seleccion) return;
          
          const index = parseInt(seleccion) - 1;
          if (index >= 0 && index < reservas.length) {
            this.procesarCheckIn(reservas[index]);
          }
        } else {
          // Solo una reserva confirmada
          this.procesarCheckIn(reservas[0]);
        }
      },
      error: (error) => {
        console.error('Error al obtener reservas para check-in:', error);
        this.mostrarMensaje('Error al cargar reservas para check-in');
      }
    });
  }

  realizarCheckOut(): void {
    console.log('=== INICIANDO CHECK-OUT DESDE DASHBOARD ===');
    
    // Buscar reservas en curso para check-out hoy
    this.reservaService.getReservasCheckOutHoy().subscribe({
      next: (reservas) => {
        console.log('Reservas para check-out hoy:', reservas);
        
        if (reservas.length === 0) {
          this.mostrarMensaje('No hay reservas en curso para check-out hoy');
          return;
        }

        // Si hay múltiples reservas, mostrar lista para seleccionar
        if (reservas.length > 1) {
          const opciones = reservas.map(r => 
            `${r.cliente.nombre} ${r.cliente.apellido} - Hab. ${this.obtenerNumeroHabitacion(r.habitacion)} (${r.horaSalida})`
          );
          
          const seleccion = prompt(`Seleccione la reserva para check-out:\n${opciones.map((op, i) => `${i + 1}. ${op}`).join('\n')}`);
          
          if (!seleccion) return;
          
          const index = parseInt(seleccion) - 1;
          if (index >= 0 && index < reservas.length) {
            this.procesarCheckOut(reservas[index]);
          }
        } else {
          // Solo una reserva en curso
          this.procesarCheckOut(reservas[0]);
        }
      },
      error: (error) => {
        console.error('Error al obtener reservas para check-out:', error);
        this.mostrarMensaje('Error al cargar reservas para check-out');
      }
    });
  }

  gestionarLimpieza(): void {
    // Mostrar habitaciones que necesitan limpieza
    const habitacionesOcupadas = this.habitaciones.filter(h => h.estado === 'ocupada');
    const habitacionesLimpieza = this.habitaciones.filter(h => h.estado === 'limpieza');
    
    const mensaje = `
HABITACIONES PARA LIMPIEZA:
${habitacionesOcupadas.length > 0 ? 
  `\nOcupadas (check-out pendiente):\n${habitacionesOcupadas.map(h => `- Hab. ${h.numero}`).join('\n')}` : 
  '\nNo hay habitaciones ocupadas pendientes de limpieza'}

${habitacionesLimpieza.length > 0 ? 
  `\nEn limpieza:\n${habitacionesLimpieza.map(h => `- Hab. ${h.numero}`).join('\n')}` : 
  '\nNo hay habitaciones en limpieza'}

¿Qué acción desea realizar?
1. Marcar habitación como limpia
2. Ver detalles de limpieza
3. Cancelar`;

    const accion = prompt(mensaje);
    
    if (accion === '1') {
      this.marcarHabitacionLimpia();
    } else if (accion === '2') {
      this.verDetallesLimpieza();
    }
  }

  gestionarPagos(): void {
    console.log('=== INICIANDO GESTIÓN DE PAGOS DESDE DASHBOARD ===');
    
    // Buscar reservas no pagadas
    this.reservaService.getReservas({
      fechaInicio: this.dateTimeService.getCurrentDateString(),
      fechaFin: this.dateTimeService.getCurrentDateString()
    }, 1, 100).subscribe({
      next: (response) => {
        const reservasPendientesPago = response.reservas.filter(r => !r.pagado);
        
        if (reservasPendientesPago.length === 0) {
          this.mostrarMensaje('Todas las reservas de hoy están pagadas');
          return;
        }

        const mensaje = `RESERVAS PENDIENTES DE PAGO:\n${reservasPendientesPago.map(r => 
          `- ${r.cliente.nombre} ${r.cliente.apellido} - Hab. ${this.obtenerNumeroHabitacion(r.habitacion)} - $${r.precioTotal}`
        ).join('\n')}\n\n¿Qué acción desea realizar?\n1. Registrar pago\n2. Ver detalles de pago\n3. Cancelar`;

        const accion = prompt(mensaje);
        
        if (accion === '1') {
          this.registrarPago(reservasPendientesPago);
        } else if (accion === '2') {
          this.verDetallesPago(reservasPendientesPago);
        }
      },
      error: (error) => {
        console.error('Error al obtener reservas para pagos:', error);
        this.mostrarMensaje('Error al cargar reservas para pagos');
      }
    });
  }

  generarReportes(): void {
    const mensaje = `GENERAR REPORTE:\n\n¿Qué tipo de reporte desea generar?\n1. Ocupación diaria\n2. Ingresos del día\n3. Reservas pendientes\n4. Estado de habitaciones\n5. Cancelar`;

    const tipo = prompt(mensaje);
    
    switch (tipo) {
      case '1':
        this.generarReporteOcupacion();
        break;
      case '2':
        this.generarReporteIngresos();
        break;
      case '3':
        this.generarReporteReservasPendientes();
        break;
      case '4':
        this.generarReporteEstadoHabitaciones();
        break;
    }
  }

  gestionarMantenimiento(): void {
    // Mostrar habitaciones en mantenimiento
    const habitacionesMantenimiento = this.habitaciones.filter(h => h.estado === 'mantenimiento');
    
    const mensaje = `GESTIÓN DE MANTENIMIENTO:\n\n${habitacionesMantenimiento.length > 0 ? 
      `Habitaciones en mantenimiento:\n${habitacionesMantenimiento.map(h => `- Hab. ${h.numero}`).join('\n')}` : 
      'No hay habitaciones en mantenimiento'}\n\n¿Qué acción desea realizar?\n1. Marcar habitación como disponible\n2. Reportar problema\n3. Ver historial de mantenimiento\n4. Cancelar`;

    const accion = prompt(mensaje);
    
    if (accion === '1') {
      this.marcarHabitacionDisponible();
    } else if (accion === '2') {
      this.reportarProblema();
    } else if (accion === '3') {
      this.verHistorialMantenimiento();
    }
  }

  // Métodos de reservas
  verDetalleReserva(reserva: any): void {
    console.log('Ver detalle de reserva:', reserva);
    
    // Abrir el modal con el detalle de la reserva
    const dialogRef = this.dialog.open(DetalleReservaModalComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { reserva: reserva },
      disableClose: false
    });

    // Manejar el resultado del modal
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Acción realizada:', result.action);
        
        // Limpiar cache para forzar recarga de datos
        this.cacheReservas = {};
        this.lastRefreshTime = 0;
        
        // Usar debounce para recargar datos
        this.refreshSubject.next();
        
        // Recargar estadísticas inmediatamente
        this.cargarEstadisticas();
        this.cargarReservasHoy();
      }
    });
  }

  private buscarYMostrarReserva(habitacionId: string, fechaStr: string): void {
    // Buscar la reserva en todas las reservas del mes
    const fechaInicio = this.dateTimeService.getFirstDayOfMonth(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1);
    const fechaFin = this.dateTimeService.getLastDayOfMonth(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1);
    
    this.reservaService.getReservas({
      fechaInicio: this.dateTimeService.formatDateToLocalString(fechaInicio),
      fechaFin: this.dateTimeService.formatDateToLocalString(fechaFin)
    }, 1, 100).subscribe({
      next: (response) => {
        const reserva = response.reservas.find(r => {
          const reservaHabitacion = typeof r.habitacion === 'string' ? r.habitacion : r.habitacion._id;
          return reservaHabitacion === habitacionId && 
                 this.fechaEnRango(new Date(fechaStr), r.fechaEntrada, r.fechaSalida);
        });
        
        if (reserva) {
          this.verDetalleReserva(reserva);
        } else {
          this.mostrarMensaje('No se encontró información de la reserva');
        }
      },
      error: (error) => {
        console.error('Error al buscar reserva:', error);
        this.mostrarMensaje('Error al buscar la reserva');
      }
    });
  }

  // Métodos auxiliares para Check-in/Check-out
  private procesarCheckIn(reserva: any): void {
    console.log('=== PROCESANDO CHECK-IN ===');
    console.log('Reserva:', reserva);
    console.log('Estado actual:', reserva.estado);
    console.log('ID de reserva:', reserva._id);
    
    if (reserva.estado !== 'Confirmada') {
      this.mostrarMensaje('Solo se puede hacer check-in a reservas confirmadas');
      return;
    }

    const confirmacion = confirm(`¿Confirmar check-in para ${reserva.cliente.nombre} ${reserva.cliente.apellido} en habitación ${this.obtenerNumeroHabitacion(reserva.habitacion)}?`);
    
    if (confirmacion) {
      // Usar el servicio de check-in real
      this.reservaService.checkIn(reserva._id).subscribe({
        next: (reservaActualizada) => {
          console.log('✅ Check-in procesado exitosamente:', reservaActualizada);
          this.mostrarMensaje(`Check-in realizado para ${reserva.cliente.nombre} ${reserva.cliente.apellido}`);
          
          // Recargar datos para reflejar los cambios
          this.cargarReservasHoy();
          this.generarOcupacion();
        },
        error: (error) => {
          console.error('=== ERROR EN CHECK-IN ===');
          console.error('Error completo:', error);
          console.error('Status:', error.status);
          console.error('Message:', error.error?.message);
          
          let mensajeError = 'Error al realizar check-in';
          
          if (error.status === 403) {
            mensajeError = 'No tienes permisos para realizar check-in. Se requiere rol de encargado.';
          } else if (error.status === 401) {
            mensajeError = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
          } else if (error.status === 404) {
            mensajeError = 'Reserva no encontrada.';
          } else if (error.status === 400) {
            mensajeError = error.error?.message || 'Datos de check-in inválidos.';
          } else {
            mensajeError = error.error?.message || 'Error desconocido al realizar check-in';
          }
          
          this.mostrarMensaje(mensajeError);
        }
      });
    }
  }

  private procesarCheckOut(reserva: any): void {
    console.log('=== PROCESANDO CHECK-OUT ===');
    console.log('Reserva:', reserva);
    console.log('Estado actual:', reserva.estado);
    console.log('ID de reserva:', reserva._id);
    
    if (reserva.estado !== 'En curso') {
      this.mostrarMensaje('Solo se puede hacer check-out a reservas en curso');
      return;
    }

    const confirmacion = confirm(`¿Confirmar check-out para ${reserva.cliente.nombre} ${reserva.cliente.apellido} en habitación ${this.obtenerNumeroHabitacion(reserva.habitacion)}?`);
    
    if (confirmacion) {
      // Usar el servicio de check-out real
      this.reservaService.checkOut(reserva._id).subscribe({
        next: (reservaActualizada) => {
          console.log('✅ Check-out procesado exitosamente:', reservaActualizada);
          this.mostrarMensaje(`Check-out realizado para ${reserva.cliente.nombre} ${reserva.cliente.apellido}`);
          
          // Recargar datos para reflejar los cambios
          this.cargarReservasHoy();
          this.generarOcupacion();
        },
        error: (error) => {
          console.error('=== ERROR EN CHECK-OUT ===');
          console.error('Error completo:', error);
          console.error('Status:', error.status);
          console.error('Message:', error.error?.message);
          
          let mensajeError = 'Error al realizar check-out';
          
          if (error.status === 403) {
            mensajeError = 'No tienes permisos para realizar check-out. Se requiere rol de encargado.';
          } else if (error.status === 401) {
            mensajeError = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
          } else if (error.status === 404) {
            mensajeError = 'Reserva no encontrada.';
          } else if (error.status === 400) {
            mensajeError = error.error?.message || 'Datos de check-out inválidos.';
          } else {
            mensajeError = error.error?.message || 'Error desconocido al realizar check-out';
          }
          
          this.mostrarMensaje(mensajeError);
        }
      });
    }
  }

  // Métodos auxiliares para Limpieza
  private marcarHabitacionLimpia(): void {
    const habitacionesLimpieza = this.habitaciones.filter(h => h.estado === 'limpieza');
    
    if (habitacionesLimpieza.length === 0) {
      this.mostrarMensaje('No hay habitaciones en limpieza');
      return;
    }

    const opciones = habitacionesLimpieza.map(h => `Hab. ${h.numero}`);
    const seleccion = prompt(`Seleccione la habitación a marcar como limpia:\n${opciones.map((op, i) => `${i + 1}. ${op}`).join('\n')}`);
    
    if (seleccion) {
      const index = parseInt(seleccion) - 1;
      if (index >= 0 && index < habitacionesLimpieza.length) {
        const habitacion = habitacionesLimpieza[index];
        console.log('Marcando habitación como limpia:', habitacion);
        this.mostrarMensaje(`Habitación ${habitacion.numero} marcada como limpia`);
        
        // Recargar datos
        this.inicializarHabitaciones();
      }
    }
  }

  private verDetallesLimpieza(): void {
    const habitacionesLimpieza = this.habitaciones.filter(h => h.estado === 'limpieza');
    
    if (habitacionesLimpieza.length === 0) {
      this.mostrarMensaje('No hay habitaciones en limpieza');
      return;
    }

    const detalles = habitacionesLimpieza.map(h => 
      `Habitación ${h.numero}:\n- Tipo: ${h.tipo}\n- Capacidad: ${h.capacidad}`
    ).join('\n\n');

    alert(`DETALLES DE LIMPIEZA:\n\n${detalles}`);
  }

  // Métodos auxiliares para Pagos
  private registrarPago(reservasPendientesPago: any[]): void {
    if (reservasPendientesPago.length === 0) {
      this.mostrarMensaje('No hay reservas pendientes de pago');
      return;
    }

    const opciones = reservasPendientesPago.map(r => 
      `${r.cliente.nombre} ${r.cliente.apellido} - Hab. ${this.obtenerNumeroHabitacion(r.habitacion)} - $${r.precioTotal}`
    );
    
    const seleccion = prompt(`Seleccione la reserva para registrar pago:\n${opciones.map((op, i) => `${i + 1}. ${op}`).join('\n')}`);
    
    if (seleccion) {
      const index = parseInt(seleccion) - 1;
      if (index >= 0 && index < reservasPendientesPago.length) {
        const reserva = reservasPendientesPago[index];
        
        // Solicitar método de pago
        const metodosPago = ['Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia', 'PayPal'];
        const metodoPago = prompt(`Seleccione método de pago:\n${metodosPago.map((m, i) => `${i + 1}. ${m}`).join('\n')}`);
        
        if (metodoPago) {
          const metodoIndex = parseInt(metodoPago) - 1;
          if (metodoIndex >= 0 && metodoIndex < metodosPago.length) {
            const metodoSeleccionado = metodosPago[metodoIndex];
            
            // Registrar pago usando el servicio
            this.reservaService.registrarPago(reserva._id, metodoSeleccionado, reserva.precioTotal).subscribe({
              next: (reservaActualizada) => {
                console.log('✅ Pago registrado exitosamente:', reservaActualizada);
                this.mostrarMensaje(`Pago registrado para ${reserva.cliente.nombre} ${reserva.cliente.apellido}`);
                
                // Recargar datos para reflejar los cambios
                this.cargarReservasHoy();
                this.generarOcupacion();
              },
              error: (error) => {
                console.error('❌ Error al registrar pago:', error);
                this.mostrarMensaje('Error al registrar el pago. Intente nuevamente.');
              }
            });
          }
        }
      }
    }
  }

  private verDetallesPago(reservasPendientesPago: any[]): void {
    if (reservasPendientesPago.length === 0) {
      this.mostrarMensaje('No hay reservas pendientes de pago');
      return;
    }

    const detalles = reservasPendientesPago.map(r => 
      `${r.cliente.nombre} ${r.cliente.apellido}:\n- Habitación: ${this.obtenerNumeroHabitacion(r.habitacion)}\n- Precio total: $${r.precioTotal}\n- Método de pago: ${r.metodoPago || 'No especificado'}`
    ).join('\n\n');

    alert(`DETALLES DE PAGO:\n\n${detalles}`);
  }

  // Métodos auxiliares para Reportes
  private generarReporteOcupacion(): void {
    const habitacionesDisponibles = this.habitaciones.filter(h => h.estado === 'disponible').length;
    const habitacionesOcupadas = this.habitaciones.filter(h => h.estado === 'ocupada').length;
    const habitacionesReservadas = this.habitaciones.filter(h => h.estado === 'reservada').length;
    const habitacionesLimpieza = this.habitaciones.filter(h => h.estado === 'limpieza').length;
    const habitacionesMantenimiento = this.habitaciones.filter(h => h.estado === 'mantenimiento').length;
    
    const reporte = `REPORTE DE OCUPACIÓN - ${this.dateTimeService.formatDateForDisplay(this.fechaActual)}\n\n` +
      `Total de habitaciones: ${this.habitaciones.length}\n` +
      `Disponibles: ${habitacionesDisponibles}\n` +
      `Ocupadas: ${habitacionesOcupadas}\n` +
      `Reservadas: ${habitacionesReservadas}\n` +
      `En limpieza: ${habitacionesLimpieza}\n` +
      `En mantenimiento: ${habitacionesMantenimiento}\n` +
      `Porcentaje de ocupación: ${Math.round(((habitacionesOcupadas + habitacionesReservadas) / this.habitaciones.length) * 100)}%`;

    alert(reporte);
  }

  private generarReporteIngresos(): void {
    const reservasPagadas = this.reservasHoy.filter(r => r.pagado);
    
    const reporte = `REPORTE DE INGRESOS - ${this.dateTimeService.formatDateForDisplay(this.fechaActual)}\n\n` +
      `Reservas pagadas: ${reservasPagadas.length}\n` +
      `Total de reservas pagadas: ${reservasPagadas.length}`;

    alert(reporte);
  }

  private generarReporteReservasPendientes(): void {
    const reservasPendientes = this.reservasHoy.filter(r => r.estado === 'Pendiente');
    
    const reporte = `REPORTE DE RESERVAS PENDIENTES - ${this.dateTimeService.formatDateForDisplay(this.fechaActual)}\n\n` +
      `Total de reservas pendientes: ${reservasPendientes.length}\n\n` +
      (reservasPendientes.length > 0 ? 
        reservasPendientes.map(r => 
          `${r.cliente?.nombre} ${r.cliente?.apellido} - Hab. ${r.habitacion?.numero} - ${r.horaEntrada}`
        ).join('\n') : 
        'No hay reservas pendientes');

    alert(reporte);
  }

  private generarReporteEstadoHabitaciones(): void {
    const reporte = `REPORTE DE ESTADO DE HABITACIONES - ${this.dateTimeService.formatDateForDisplay(this.fechaActual)}\n\n` +
      this.habitaciones.map(h => 
        `Habitación ${h.numero}:\n- Tipo: ${h.tipo}\n- Estado: ${h.estado}\n- Capacidad: ${h.capacidad}`
      ).join('\n\n');

    alert(reporte);
  }

  // Métodos auxiliares para Mantenimiento
  private marcarHabitacionDisponible(): void {
    const habitacionesMantenimiento = this.habitaciones.filter(h => h.estado === 'mantenimiento');
    
    if (habitacionesMantenimiento.length === 0) {
      this.mostrarMensaje('No hay habitaciones en mantenimiento');
      return;
    }

    const opciones = habitacionesMantenimiento.map(h => `Hab. ${h.numero}`);
    const seleccion = prompt(`Seleccione la habitación a marcar como disponible:\n${opciones.map((op, i) => `${i + 1}. ${op}`).join('\n')}`);
    
    if (seleccion) {
      const index = parseInt(seleccion) - 1;
      if (index >= 0 && index < habitacionesMantenimiento.length) {
        const habitacion = habitacionesMantenimiento[index];
        console.log('Marcando habitación como disponible:', habitacion);
        this.mostrarMensaje(`Habitación ${habitacion.numero} marcada como disponible`);
        
        // Recargar datos
        this.inicializarHabitaciones();
      }
    }
  }

  private reportarProblema(): void {
    const habitacion = prompt('Ingrese el número de habitación con problema:');
    
    if (habitacion) {
      const descripcion = prompt('Describa el problema:');
      
      if (descripcion) {
        console.log('Problema reportado:', { habitacion, descripcion });
        this.mostrarMensaje(`Problema reportado para habitación ${habitacion}`);
        
        // Aquí se podría guardar en una base de datos de mantenimiento
      }
    }
  }

  private verHistorialMantenimiento(): void {
    // Por ahora mostrar un mensaje genérico
    this.mostrarMensaje('Historial de mantenimiento en desarrollo');
  }

  editarReserva(reserva: any): void {
    console.log('=== EDITAR RESERVA ===');
    console.log('Reserva:', reserva);
    
    // Por ahora mostrar un mensaje informativo
    this.mostrarMensaje('Funcionalidad de edición en desarrollo. Se implementará próximamente.');
    
    // Aquí se podría abrir un modal de edición o navegar a una página de edición
    // this.router.navigate(['/editar-reserva', reserva._id]);
  }

  imprimirReserva(reserva: any): void {
    console.log('=== IMPRIMIR RESERVA ===');
    console.log('Reserva:', reserva);
    
    // Generar PDF de la reserva
    this.reservaService.generarPDF(reserva._id).subscribe({
      next: (blob) => {
        // Crear URL del blob y descargar
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reserva-${reserva._id}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        
        this.mostrarMensaje('PDF de reserva generado exitosamente');
      },
      error: (error) => {
        console.error('Error al generar PDF:', error);
        this.mostrarMensaje('Error al generar PDF: ' + (error.error?.message || 'Error desconocido'));
      }
    });
  }

  // Métodos de notas
  agregarNota(): void {
    if (this.nuevaNota.trim()) {
      const nota: Nota = {
        texto: this.nuevaNota.trim(),
        tipo: 'info',
        fecha: this.dateTimeService.getCurrentDate()
      };
      this.notasDia.push(nota);
      this.nuevaNota = '';
      this.mostrarMensaje('Nota agregada exitosamente');
    }
  }

  eliminarNota(index: number): void {
    this.notasDia.splice(index, 1);
    this.mostrarMensaje('Nota eliminada');
  }

  // Utilidades
  private mostrarMensaje(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  // Función para mostrar opciones cuando hay múltiples reservas en el mismo día
  mostrarOpcionesMultiplesReservas(reservas: any[], habitacion: Habitacion, dia: DiaCalendario): void {
    const fechaStr = this.dateTimeService.formatDateForDisplay(dia.fecha);
    
    // Crear lista de opciones
    const opciones = reservas.map((reserva, index) => {
      const cliente = `${reserva.cliente.nombre} ${reserva.cliente.apellido}`;
      const estado = reserva.estado;
      const esEntrada = this.esFechaCheckIn(dia.fecha, reserva.fechaEntrada);
      const esSalida = this.esFechaCheckOut(dia.fecha, reserva.fechaSalida);
      
      let tipoDia = '';
      if (esEntrada && esSalida) {
        tipoDia = ' (Entrada y Salida)';
      } else if (esEntrada) {
        tipoDia = ' (Entrada)';
      } else if (esSalida) {
        tipoDia = ' (Salida)';
      }
      
      return `${index + 1}. ${cliente} - ${estado}${tipoDia}`;
    });
    
    const mensaje = `Múltiples reservas para habitación ${habitacion.numero} el ${fechaStr}:\n\n${opciones.join('\n')}\n\nSeleccione una opción (1-${reservas.length}):`;
    
    const seleccion = prompt(mensaje);
    
    if (seleccion) {
      const index = parseInt(seleccion) - 1;
      if (index >= 0 && index < reservas.length) {
        const reservaSeleccionada = reservas[index];
        
        // Verificar si es día de entrada para check-in
        if ((reservaSeleccionada.estado === 'Confirmada' || reservaSeleccionada.estado === 'Pendiente') && 
            this.esFechaCheckIn(dia.fecha, reservaSeleccionada.fechaEntrada)) {
          this.mostrarOpcionesCheckIn(reservaSeleccionada);
        } else {
          this.verDetalleReserva(reservaSeleccionada);
        }
      }
    }
  }

  // Obtener número de habitación
  private obtenerNumeroHabitacion(habitacion: string | any): string {
    if (typeof habitacion === 'string') {
      return habitacion;
    }
    return habitacion?.numero || 'N/A';
  }
}
