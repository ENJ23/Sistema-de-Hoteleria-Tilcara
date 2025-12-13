// Versión limpia del componente Home (copia de referencia)
import { Component, OnInit, OnDestroy, HostListener, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, switchMap, catchError, map } from 'rxjs/operators';

import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { TodoListComponent } from '../../components/todo-list/todo-list.component';
import { HomeCalendarComponent, DiaCalendario, HabitacionResumen, OcupacionHabitacionMes, ReservaResumen, EstadoDiaReserva } from '../../components/home-calendar/home-calendar.component';

import { HabitacionService } from '../../services/habitacion.service';
import { ReservaService } from '../../services/reserva.service';
import { DateTimeService } from '../../services/date-time.service';
import { DetalleReservaModalComponent } from '../../components/detalle-reserva-modal/detalle-reserva-modal.component';
import { SeleccionReservaSimpleComponent } from '../../components/seleccion-reserva-simple/seleccion-reserva-simple.component';
import { Reserva } from '../../models/reserva.model';
import { Habitacion } from '../../models/habitacion.model';

interface EstadisticasDia { total: number; activas: number; checkInsHoy: number; checkOutsHoy: number; canceladasHoy: number; completadasHoy: number; }

@Component({
  selector: 'app-home-clean',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatChipsModule, TodoListComponent, HomeCalendarComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HomeComponentClean implements OnInit, OnDestroy {
  fechaActual = new Date();
  fechaReferencia = new Date();
  diasCalendario: DiaCalendario[] = [];
  ocupacionHabitaciones: OcupacionHabitacionMes[] = [];
  private cacheOcupacion = new Map<string, { timestamp: number; data: OcupacionHabitacionMes[] }>();
  private readonly TTL_OCUPACION_MS = 8000;
  reservasHoy: ReservaResumen[] = [];
  estadisticasHoy: EstadisticasDia = { total: 0, activas: 0, checkInsHoy: 0, checkOutsHoy: 0, canceladasHoy: 0, completadasHoy: 0 };

  // Propiedad legacy usada por el template
  estadisticas: { ocupacionActual: number; totalHabitaciones: number; porcentajeOcupacion: number; reservasPendientes: number; pagosPendientes: number } = { ocupacionActual: 0, totalHabitaciones: 0, porcentajeOcupacion: 0, reservasPendientes: 0, pagosPendientes: 0 };
  notasPorFecha: { [yyyyMMdd: string]: string[] } = {};

  private refrescarEventos$ = new Subject<void>();
  private subs: Subscription[] = [];
  cargandoOcupacion = false;
  cargandoReservas = false;

  // Sistema de gestión de estilos dinámicos (Delegado ahora al hijo o mantenido aquí para la inyección si se prefiere, por ahora lo dejamos limpio en el padre)
  private estilosDinamicos = new Set<string>();
  private cacheEstilos = new Map<string, string>();

  constructor(
    private habitacionService: HabitacionService,
    private reservaService: ReservaService,
    private dateTime: DateTimeService,
    private router: Router,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) { }

  ngOnInit(): void { this.generarCalendario(); this.suscribirEventos(); this.refrescarDatos(); }

  ngOnDestroy(): void {
    this.limpiarEstilosDinamicos();
    this.subs.forEach(s => s.unsubscribe());
  }

  // Se mantiene para limpiar estilos por si quedaron
  private limpiarEstilosDinamicos(): void {
    this.estilosDinamicos.forEach(id => {
      const elemento = document.getElementById(id);
      if (elemento) elemento.remove();
    });
    this.estilosDinamicos.clear();
    this.cacheEstilos.clear();
  }

  private suscribirEventos(): void {
    const sub = this.refrescarEventos$.pipe(debounceTime(300)).subscribe(() => {
      this.cargarOcupacion(false);
      this.cargarReservasHoy();
    });
    this.subs.push(sub);
    const evSub = this.reservaService.reservaEvents$.pipe(debounceTime(300)).subscribe(() => this.refrescarDatos());
    this.subs.push(evSub);
  }

  refrescarDatos(): void { this.refrescarEventos$.next(); }

  // Métodos delegados al hijo via Inputs/Outputs
  onMesAnterior(): void {
    this.fechaReferencia = this.dateTime.addMonths(this.fechaReferencia, -1);
    this.generarCalendario();
    this.cargarOcupacion(true);
  }

  onMesSiguiente(): void {
    this.fechaReferencia = this.dateTime.addMonths(this.fechaReferencia, 1);
    this.generarCalendario();
    this.cargarOcupacion(true);
  }

  onCeldaClick(event: { habitacion: HabitacionResumen, dia: DiaCalendario, estado?: EstadoDiaReserva }): void {
    this.seleccionarCelda(event.habitacion as Habitacion, event.dia);
  }

  onMoverReserva(event: { reserva: ReservaResumen, nuevaFechaEntrada: string, nuevaFechaSalida: string, nuevaHabitacionId: string }): void {
    if (!event.reserva._id) return;

    this.cargandoOcupacion = true;

    // 1. Obtener la reserva completa primero para tener todos los datos requeridos por el backend (precio, horas, clientes, etc.)
    this.reservaService.getReserva(event.reserva._id).pipe(
      switchMap(reservaCompleta => {
        // 2. Construir payload con datos originales + cambios
        // El backend valida presencia de precioPorNoche, horas, etc.
        const updateData: any = {
          fechaEntrada: event.nuevaFechaEntrada,
          fechaSalida: event.nuevaFechaSalida,
          habitacion: event.nuevaHabitacionId,
          // Mantener datos originales requeridos
          precioPorNoche: reservaCompleta.precioPorNoche,
          horaEntrada: reservaCompleta.horaEntrada,
          horaSalida: reservaCompleta.horaSalida,
          estado: reservaCompleta.estado,
          cliente: reservaCompleta.cliente, // Por si acaso el backend lo valida anidado, aunque suele ser el ID o objeto
          configuracionCamas: reservaCompleta.configuracionCamas,
          informacionTransporte: reservaCompleta.informacionTransporte,
          necesidadesEspeciales: reservaCompleta.necesidadesEspeciales
        };

        // Asegurar que fechaEntrada/Salida tengan formato YYYY-MM-DD si el backend lo requiere estricto
        // (Ya vienen así del evento, pero por seguridad)

        return this.reservaService.updateReserva(event.reserva._id!, updateData);
      })
    ).subscribe({
      next: () => {
        this.snack.open('Reserva movida exitosamente', 'Cerrar', { duration: 3000 });
        this.cargarOcupacion(true);
      },
      error: (err: any) => {
        this.cargandoOcupacion = false;
        console.error('Error al mover reserva', err);
        const msg = err.error?.message || 'Error al mover la reserva.';
        this.snack.open(`${msg} Verifique disponibilidad.`, 'Cerrar', { duration: 5000 });
      }
    });
  }

  // Helpers de fecha
  obtenerNombreMes(): string { return this.dateTime.nombreMes(this.fechaReferencia); }
  formatearFecha(f: Date): string { return this.dateTime.formatYMD(f); }
  esHoy(f: Date): boolean { return this.dateTime.esMismaFecha(new Date(), f); }

  // Lógica de Negocio (Selectores de celda, acciones)
  seleccionarCelda(h: HabitacionResumen, d: DiaCalendario, estado?: EstadoDiaReserva): void {
    // Si estado no se pasa, lo buscamos desde ocupacionPorDia
    const estadoReal = estado || this.ocupacionHabitaciones.find(oc => oc.habitacion.id === h.id)?.ocupacionPorDia?.[this.formatearFecha(d.fecha)];

    if (!estadoReal || !estadoReal.reservaPrincipal) {
      const fechaFormateada = d.fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const mensaje = `¿Desea realizar una reserva en la Habitación ${h.numero} en la fecha ${fechaFormateada}?`;
      if (confirm(mensaje)) {
        this.abrirNuevaReservaDesdeFecha(d.fecha, h.id);
      }
      return;
    }

    if (estadoReal.esDiaTransicion && estadoReal.reservaEntrada && estadoReal.reservaSalida) {
      const reservas = [estadoReal.reservaSalida, estadoReal.reservaEntrada];
      this.mostrarOpcionesMultiplesReservas(reservas, h, d.fecha);
      return;
    }

    if (estadoReal.reservasSecundarias?.length) {
      this.mostrarOpcionesMultiplesReservas([estadoReal.reservaPrincipal, ...estadoReal.reservasSecundarias], h, d.fecha);
    } else {
      const r = estadoReal.reservaPrincipal;
      const esEntradaHoy = this.esFechaCheckIn(d.fecha, r.fechaEntrada);
      if ((r.estado === 'Confirmada' || r.estado === 'Pendiente') && esEntradaHoy) {
        this.mostrarOpcionesCheckIn(r);
      } else {
        this.verDetalleReserva(r);
      }
    }
  }

  // ... (Rest of data loading logic remains mostly same but using defined interfaces) ...
  private generarCalendario(): void {
    const inicio = this.dateTime.inicioMes(this.fechaReferencia);
    const fin = this.dateTime.finMes(this.fechaReferencia);
    const dias: DiaCalendario[] = [];
    let c = new Date(inicio);
    while (c <= fin) {
      const esFinde = c.getDay() === 0 || c.getDay() === 6;
      dias.push({ fecha: new Date(c), dia: c.getDate(), esHoy: this.esHoy(c), numero: c.getDate(), esFinDeSemana: esFinde });
      c = this.dateTime.addDays(c, 1);
    }
    this.diasCalendario = dias;
  }

  private cargarOcupacion(forceFresh: boolean): void {
    // (Esta logica es critica y se mantiene aqui para proveer datos al hijo)
    const clave = this.dateTime.claveMes(this.fechaReferencia);
    if (!forceFresh) {
      const cached = this.cacheOcupacion.get(clave);
      if (cached && Date.now() - cached.timestamp < this.TTL_OCUPACION_MS) {
        this.ocupacionHabitaciones = cached.data;
        this.generarEstilosParaTransiciones(this.ocupacionHabitaciones); // Re-aplicar estilos si es necesario
        return;
      }
    }
    this.cargandoOcupacion = true;
    const inicio = this.dateTime.inicioMes(this.fechaReferencia);
    const finExcl = this.dateTime.addDays(this.dateTime.finMes(this.fechaReferencia), 1);
    const filtros = { fechaInicio: this.dateTime.formatYMD(inicio), fechaFin: this.dateTime.formatYMD(finExcl) };

    // Usamos getHabitaciones general para maximizar compatibilidad por ahora
    this.habitacionService.getHabitaciones(1, 100).pipe(
      switchMap(resp => {
        const habs: HabitacionResumen[] = (resp.habitaciones || []).map((h: Habitacion) => ({ id: (h as any)._id, numero: h.numero, tipo: h.tipo, capacidad: h.capacidad, activa: h.activa }));
        return this.reservaService.getReservasAll(filtros, 100, true).pipe(
          map(rResp => (rResp.reservas || []) as Reserva[]),
          catchError(() => { this.mostrarMensaje('Error reservas'); return of([] as Reserva[]); }),
          map((reservas: Reserva[]) => {
            const reservasNormalizadas: ReservaResumen[] = reservas.map(r => {
              if (typeof r.habitacion === 'string') {
                return { ...r, habitacion: { numero: r.habitacion, _id: r.habitacion } as Habitacion } as ReservaResumen;
              }
              return r as ReservaResumen;
            });
            return this.procesarOcupacion(habs, reservasNormalizadas);
          })
        );
      }),
      catchError(() => { this.mostrarMensaje('Error habitaciones'); return of([] as OcupacionHabitacionMes[]); })
    ).subscribe((oc: OcupacionHabitacionMes[]) => {
      this.ocupacionHabitaciones = oc;
      this.generarEstilosParaTransiciones(oc); // Generar estilos dinámicos aqui
      this.cacheOcupacion.set(clave, { timestamp: Date.now(), data: oc });
      this.cargandoOcupacion = false;

      // Actualizar estadísticas también aquí para corregir la condición de carrera
      // si reservasHoy ya cargó pero ocupacionHabitaciones (que define totalHabs) no.
      if (this.reservasHoy.length > 0 || oc.length > 0) {
        this.actualizarEstadisticas(this.reservasHoy);
      }
    });
  }

  // --- Lógica de procesamiento de ocupación (Refactorizada ligeramente para usar tipos exportados) ---
  private procesarOcupacion(habitaciones: HabitacionResumen[], reservas: ReservaResumen[]): OcupacionHabitacionMes[] {
    // (Misma logica de antes)
    const mapa: { [hid: string]: ReservaResumen[] } = {};
    reservas.filter(r => r.estado !== 'Cancelada' && r.estado !== 'No Show').forEach(r => { const hid = typeof r.habitacion === 'string' ? r.habitacion : (r.habitacion as any)?._id; if (hid) (mapa[hid] ||= []).push(r); });

    return habitaciones.map(h => {
      const ocup: { [d: string]: EstadoDiaReserva } = {};
      this.diasCalendario.forEach(d => ocup[this.formatearFecha(d.fecha)] = { reservasSecundarias: [] });
      const reservasHabitacion = mapa[h.id!] || []; // Usar ! porque sabemos que creamos el ID en la carga

      reservasHabitacion.forEach((r: ReservaResumen) => {
        let cur = this.dateTime.parseYMD(r.fechaEntrada);
        const fin = this.dateTime.parseYMD(r.fechaSalida);

        while (cur <= fin) {
          const clave = this.formatearFecha(cur);
          const estado = ocup[clave];
          if (estado) {
            if (!estado.reservaPrincipal) estado.reservaPrincipal = r; else (estado.reservasSecundarias ||= []).push(r);
            (estado.estados ||= []).push(this.mapearEstadoReserva(r));

            // Detección de transiciones
            // Una reserva termina SI su fecha de salida es este día
            const reservaQueTermina = reservasHabitacion.find((res: ReservaResumen) => {
              const fechaSalidaRes = this.formatearFecha(this.dateTime.parseYMD(res.fechaSalida));
              return fechaSalidaRes === clave;
            });

            // Una reserva comienza SI su fecha de entrada es este día
            const reservaQueComienza = reservasHabitacion.find((res: ReservaResumen) => {
              const fechaEntradaRes = this.formatearFecha(this.dateTime.parseYMD(res.fechaEntrada));
              return fechaEntradaRes === clave;
            });

            const esDiaTransicionMultiple = !!(reservaQueTermina && reservaQueComienza && (reservaQueTermina as any)._id !== (reservaQueComienza as any)._id);

            if (esDiaTransicionMultiple) {
              estado.tipo = 'transicion';
              estado.reservaEntrada = reservaQueComienza;
              estado.reservaSalida = reservaQueTermina;
              estado.esDiaTransicion = true;
            } else {
              const estadoReserva = r.estado;
              if (estadoReserva === 'En curso') estado.tipo = 'ocupada';
              else if (estadoReserva === 'Confirmada' || estadoReserva === 'Pendiente') estado.tipo = 'reservada';
              else if (estadoReserva === 'Finalizada') estado.tipo = 'finalizada';
              else estado.tipo = 'disponible';
            }

            estado.esDiaEntrada = clave === this.formatearFecha(this.dateTime.parseYMD(r.fechaEntrada));
            estado.esDiaSalida = clave === this.formatearFecha(this.dateTime.parseYMD(r.fechaSalida));
            estado.estaCompletamentePagado = (r.montoPagado || 0) >= (r.precioTotal || 0);
            estado.montoPagado = r.montoPagado || 0;
          }
          cur = this.dateTime.addDays(cur, 1);
        }
      });
      return { habitacion: h, ocupacionPorDia: ocup };
    });
  }

  // --- Helpers de estilos y mapeos (Mantenemos generación de estilos aqui por ahora hasta refactorizar a CSS vars) ---
  private mapearEstadoReserva(r: ReservaResumen): string {
    switch (r.estado) {
      case 'Confirmada': return 'confirmada';
      case 'Pendiente': return 'pendiente';
      case 'En curso': return 'en-curso';
      case 'Cancelada': return 'cancelada';
      case 'No Show': return 'no-show';
      case 'Finalizada': return 'finalizada';
      default: return 'desconocida';
    }
  }

  // Re-implemenación simplificada de la generación de estilos para asegurar compatibilidad
  private generarEstilosParaTransiciones(ocupacion: OcupacionHabitacionMes[]): void {
    ocupacion.forEach(oc => {
      Object.values(oc.ocupacionPorDia).forEach(estado => {
        if (estado.tipo === 'transicion' && estado.esDiaTransicion && estado.reservaEntrada && estado.reservaSalida) {
          this.generarEstilosTransicionDinamica(estado);
        }
      });
    });
  }

  private generarEstilosTransicionDinamica(estado: EstadoDiaReserva): void {
    // REFACTORIZADO: En lugar de inyectar estilos globales, asignamos variables al estado
    // que serán aplicadas como CSS Variables en el template del hijo.
    if (!estado.reservaEntrada || !estado.reservaSalida) return;

    const colorSalida = this.obtenerColorReserva(estado.reservaSalida);
    const colorEntrada = this.obtenerColorReserva(estado.reservaEntrada);

    estado.colorSalida = colorSalida;
    estado.colorEntrada = colorEntrada;
    // Mantenemos claseDinamica vacío o con un marcador fijo si es necesario
    estado.claseDinamica = 'transicion-dinamica';
  }

  // Helpers duplicados que se usan aqui y en el hijo (se podrian mover a un servicio utilitario)
  obtenerColorReserva(r: ReservaResumen | undefined): string {
    if (!r) return '#6c757d';
    const montoPagado = r.montoPagado || 0;
    const precioTotal = r.precioTotal || 0;
    const estaCompletamentePagado = montoPagado >= precioTotal;
    const tienePagoParcial = montoPagado > 0 && montoPagado < precioTotal;

    switch (r.estado) {
      case 'En curso': return estaCompletamentePagado ? '#28a745' : (tienePagoParcial ? '#ffc107' : '#dc3545');
      case 'Confirmada':
      case 'Pendiente': return estaCompletamentePagado ? '#17a2b8' : (tienePagoParcial ? '#fd7e14' : '#e83e8c');
      case 'Finalizada': return estaCompletamentePagado ? '#007bff' : (tienePagoParcial ? '#6f42c1' : '#6c757d');
      default: return '#d4edda';
    }
  }

  // Métodos de acción (CRUD) - Se mantienen igual
  private cargarReservasHoy(): void {
    this.cargandoReservas = true;
    const hoy = this.dateTime.formatYMD(new Date());
    const manana = this.dateTime.formatYMD(this.dateTime.addDays(new Date(), 1));
    const filtros = { fechaInicio: hoy, fechaFin: manana };
    this.reservaService.getReservasAll(filtros, 50, true).pipe(
      map(resp => resp.reservas || []),
      catchError(() => { this.mostrarMensaje('Error reservas día'); return of([] as Reserva[]); })
    ).subscribe((rs: Reserva[]) => {
      this.reservasHoy = (rs || []).map(r => {
        const h = r.habitacion;
        if (typeof h === 'string') {
          return { ...r, habitacion: { numero: h, _id: h } as Habitacion } as ReservaResumen;
        }
        return r as ReservaResumen;
      });
      this.actualizarEstadisticas(this.reservasHoy);
      this.cargandoReservas = false;
    });
  }

  mostrarOpcionesCheckIn(reserva: ReservaResumen): void {
    const habitacionNumero = this.obtenerNumeroHabitacion(reserva.habitacion);
    const estadoTexto = reserva.estado === 'Pendiente' ? ' (sin confirmar)' : '';
    const mensaje = `¿Realizar CHECK-IN para ${reserva.cliente?.nombre} ${reserva.cliente?.apellido} en habitación ${habitacionNumero}${estadoTexto}?`;
    if (confirm(mensaje)) this.realizarCheckInReserva(reserva);
  }

  abrirNuevaReservaDesdeFecha(fecha: Date, habitacionId?: string): void {
    const fechaStr = this.dateTime.formatYMD(fecha);
    const queryParams: any = { fecha: fechaStr };
    if (habitacionId) queryParams.habitacion = habitacionId;
    this.router.navigate(['/nueva-reserva'], { queryParams });
  }

  obtenerNumeroHabitacion(habitacion: string | Habitacion | HabitacionResumen | undefined): string {
    if (!habitacion) return 'N/A';
    if (typeof habitacion === 'string') return habitacion;
    return habitacion.numero || 'N/A';
  }

  obtenerTipoHabitacion(habitacion: string | Habitacion | HabitacionResumen | undefined): string {
    if (!habitacion || typeof habitacion === 'string') return 'N/A';
    return (habitacion as any).tipo || 'std';
  }

  esFechaCheckIn(fecha: Date, fechaCheckIn: string): boolean {
    return this.dateTime.isCheckInDate ? this.dateTime.isCheckInDate(fecha, fechaCheckIn) : this.dateTime.esMismaFecha(fecha, this.dateTime.parseYMD(fechaCheckIn.split('T')[0]));
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    this.refrescarDatos();
  }

  private actualizarEstadisticas(reservas: ReservaResumen[]): void {
    const hoy = this.dateTime.formatYMD(new Date());
    let enCurso = 0, ci = 0, co = 0, canc = 0, fin = 0;
    reservas.forEach(r => {
      if (r.estado === 'En curso') enCurso++;
      if (r.estado === 'Cancelada') canc++;
      if (r.estado === 'Finalizada') fin++;
      if (r.fechaEntrada.split('T')[0] === hoy) ci++;
      if (r.fechaSalida.split('T')[0] === hoy) co++;
    });

    this.estadisticasHoy = { total: reservas.length, activas: enCurso, checkInsHoy: ci, checkOutsHoy: co, canceladasHoy: canc, completadasHoy: fin };

    // Actualizar estadísticas legacy para el template
    const totalHabs = this.ocupacionHabitaciones.length;
    // const hoyStr = this.formatearFecha(new Date());

    // Calculamos habitaciones ocupadas reales: Reservas activas hoy (Start <= Hoy <= End)
    const habitacionesOcupadasSet = new Set<string>();
    reservas.forEach(r => {
      if (r.estado === 'Cancelada' || r.estado === 'No Show') return;

      const entrada = r.fechaEntrada.split('T')[0];
      const salida = r.fechaSalida.split('T')[0];

      // Si hoy está dentro del rango inclusivo [entrada, salida]
      if (entrada <= hoy && salida >= hoy) {
        const hid = typeof r.habitacion === 'string' ? r.habitacion : (r.habitacion as any)?._id || (r.habitacion as any)?.id;
        if (hid) habitacionesOcupadasSet.add(hid);
      }
    });

    const ocupadasHoy = habitacionesOcupadasSet.size;

    const reservasPend = reservas.filter(r => r.estado === 'Pendiente').length;
    const pagosPend = reservas.filter(r => (r.montoPagado || 0) < (r.precioTotal || 0)).length;

    (this as any).estadisticas = {
      ocupacionActual: ocupadasHoy,
      totalHabitaciones: totalHabs,
      porcentajeOcupacion: totalHabs ? Math.round((ocupadasHoy / totalHabs) * 100) : 0,
      reservasPendientes: reservasPend,
      pagosPendientes: pagosPend
    };
  }

  verDetalleReserva(r: ReservaResumen): void {
    // Need to cast to any because DetalleReservaModal expects full Reserva, but we have Resumen
    // Usually Resumen has enough data for display or we fetch full details inside modal
    this.dialog.open(DetalleReservaModalComponent, { data: { reserva: r } });
  }

  editarReserva(r: ReservaResumen): void { this.router.navigate(['/reservas', (r as any)._id, 'editar']); }
  realizarCheckInReserva(r: ReservaResumen | undefined): void { if (r) this.reservaService.checkIn((r as any)._id).subscribe(() => { this.mostrarMensaje('Check-In realizado'); this.refrescarDatos(); }); }
  realizarCheckOutReserva(r: ReservaResumen | undefined): void { if (r) this.reservaService.checkOut((r as any)._id).subscribe(() => { this.mostrarMensaje('Check-Out realizado'); this.refrescarDatos(); }); }
  gestionarPagos(reserva?: ReservaResumen): void { if (reserva) this.router.navigate(['/reservas', (reserva as any)._id, 'pagos']); else this.snack.open('Seleccione una reserva', 'OK'); }
  registrarPago(reserva?: ReservaResumen): void { if (reserva) this.router.navigate(['/reservas', (reserva as any)._id, 'pagos', 'nuevo']); else this.snack.open('Seleccione una reserva', 'OK'); }
  verDetallesPago(reserva?: ReservaResumen): void { if (reserva) this.router.navigate(['/reservas', (reserva as any)._id, 'pagos', 'detalle']); else this.snack.open('Seleccione una reserva', 'OK'); }
  abrirNuevaReserva(): void { this.router.navigate(['/reservas/nueva']); }
  gestionarHabitaciones(): void { this.router.navigate(['/habitaciones']); }
  irACalendario(): void { this.router.navigate(['/calendario']); }

  // Acciones UI
  agregarNota(texto: string): void { if (!texto) return; const hoy = this.formatearFecha(new Date()); (this.notasPorFecha[hoy] ||= []).push(texto); this.mostrarMensaje('Nota agregada'); }
  eliminarNota(i: number): void { const hoy = this.formatearFecha(new Date()); const notas = this.notasPorFecha[hoy]; if (!notas) return; notas.splice(i, 1); this.mostrarMensaje('Nota eliminada'); }
  mostrarMensaje(msg: string): void { this.snack.open(msg, 'OK', { duration: 2500 }); }

  // Legacy stubs
  realizarCheckIn(): void { this.snack.open('Use la lista o calendario', 'OK'); }
  realizarCheckOut(): void { this.snack.open('Use la lista o calendario', 'OK'); }
  gestionarLimpieza(): void { this.mostrarMensaje('Pendiente'); }
  gestionarMantenimiento(): void { this.mostrarMensaje('Pendiente'); }
  imprimirReserva(_r: ReservaResumen): void { this.mostrarMensaje('Pendiente'); }
  generarReportes(): void { this.snack.open('Seleccione reporte', 'OK'); }
  generarReporteOcupacion(): void { this.router.navigate(['/reportes', 'ocupacion']); }
  generarReporteIngresos(): void { this.router.navigate(['/reportes', 'ingresos']); }
  generarReportePendientes(): void { this.router.navigate(['/reportes', 'pendientes']); }
  generarReporteEstadoHabitaciones(): void { this.router.navigate(['/reportes', 'habitaciones']); }

  mostrarOpcionesMultiplesReservas(reservas: ReservaResumen[], hab?: HabitacionResumen, dia?: Date): void {
    const dialogRef = this.dialog.open(SeleccionReservaSimpleComponent, { data: { reservas, habitacion: hab, dia }, width: '600px' });
    dialogRef.afterClosed().subscribe(res => { if (res?.accion === 'verDetalle') this.verDetalleReserva(res.reserva); });
  }
}

