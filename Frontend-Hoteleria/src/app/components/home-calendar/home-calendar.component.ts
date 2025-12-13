import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DragDropModule, CdkDragDrop, CdkDragStart, CdkDragEnd } from '@angular/cdk/drag-drop';

// Interfaces (Duplicated for now, commonly should be in a model file)
export interface DiaCalendario { fecha: Date; dia: number; esHoy: boolean; numero?: number; esFinDeSemana?: boolean; }
export interface HabitacionResumen { id?: string; _id?: string; numero: string; tipo?: string; capacidad?: number; activa?: boolean; }
export interface ReservaResumen {
    _id?: string;
    fechaEntrada: string;
    fechaSalida: string;
    horaEntrada?: string;
    horaSalida?: string;
    estado?: string;
    cliente?: { nombre: string; apellido: string };
    habitacion?: string | HabitacionResumen;
    montoPagado?: number;
    precioTotal?: number;
}
export interface EstadoDiaReserva {
    reservaPrincipal?: ReservaResumen;
    reservasSecundarias?: ReservaResumen[];
    estados?: string[];
    tipo?: 'ocupada' | 'reservada' | 'finalizada' | 'disponible' | 'transicion';
    esDiaEntrada?: boolean;
    esDiaSalida?: boolean;
    esDiaTransicion?: boolean;
    estaCompletamentePagado?: boolean;
    montoPagado?: number;
    reservaEntrada?: ReservaResumen;
    reservaSalida?: ReservaResumen;
    claseDinamica?: string;
    colorEntrada?: string;
    colorSalida?: string;
}
export interface OcupacionHabitacionMes { habitacion: HabitacionResumen; ocupacionPorDia: { [yyyyMMdd: string]: EstadoDiaReserva }; }

@Component({
    selector: 'app-home-calendar',
    standalone: true,
    imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule, DragDropModule],
    templateUrl: './home-calendar.component.html',
    styleUrls: ['./home-calendar.component.css']
})
export class HomeCalendarComponent implements OnInit {
    @Input() diasCalendario: DiaCalendario[] = [];
    @Input() ocupacionHabitaciones: OcupacionHabitacionMes[] = [];
    @Input() fechaReferencia: Date = new Date();
    @Input() cargando: boolean = false;

    // Configuración de vista
    vista: 'grid' | 'lista' = 'grid';
    habitacionesFiltradas: OcupacionHabitacionMes[] = [];

    @Output() mesAnterior = new EventEmitter<void>();
    @Output() mesSiguiente = new EventEmitter<void>();
    @Output() celdaClick = new EventEmitter<{ habitacion: HabitacionResumen, dia: DiaCalendario, estado?: EstadoDiaReserva }>();
    @Output() moverReserva = new EventEmitter<{ reserva: ReservaResumen, nuevaFechaEntrada: string, nuevaFechaSalida: string, nuevaHabitacionId: string }>();

    dragState: { dragging: boolean } = { dragging: false };

    constructor() { }

    ngOnInit(): void {
        this.chequearResolucion();
        this.habitacionesFiltradas = this.ocupacionHabitaciones; // Inicialmente todas
    }

    ngOnChanges(): void {
        this.habitacionesFiltradas = this.ocupacionHabitaciones;
    }

    emitMesAnterior(): void { this.mesAnterior.emit(); }
    emitMesSiguiente(): void { this.mesSiguiente.emit(); }

    onCeldaClick(habitacion: HabitacionResumen, dia: DiaCalendario, estado?: EstadoDiaReserva): void {
        if (!this.dragState.dragging) {
            this.celdaClick.emit({ habitacion, dia, estado });
        }
    }

    cambiarVista(v: 'grid' | 'lista'): void {
        this.vista = v;
    }

    private chequearResolucion(): void {
        if (window.innerWidth < 768) {
            this.vista = 'lista';
        }
    }

    // Drag & Drop Handlers
    onDragStarted(): void {
        this.dragState.dragging = true;
    }

    onDragEnded(): void {
        // Small delay to prevent click event triggering immediately after drop
        setTimeout(() => this.dragState.dragging = false, 100);
    }

    onDrop(event: CdkDragDrop<any>): void {
        const data = event.item.data;
        const targetData = event.container.data;

        if (!data || !targetData) return;

        const reserva = data.reserva as ReservaResumen;
        const fechaOrigen = new Date(data.fecha); // Fecha d ela celda desde donde se arrastró (un día específico de la reserva)
        const fechaDestino = new Date(targetData.fecha); // Fecha de la celda donde se soltó

        // Calcular diferencia en días
        const diffTime = fechaDestino.getTime() - fechaOrigen.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0 && reserva.habitacion === targetData.habitacion.id) return; // No change

        // Calcular nuevas fechas
        const entradaOriginal = new Date(reserva.fechaEntrada);
        const salidaOriginal = new Date(reserva.fechaSalida);

        const nuevaEntrada = new Date(entradaOriginal);
        nuevaEntrada.setDate(nuevaEntrada.getDate() + diffDays);

        const nuevaSalida = new Date(salidaOriginal);
        nuevaSalida.setDate(nuevaSalida.getDate() + diffDays);

        // Formatear a string YYYY-MM-DD (suponiendo local dates para simplificar, idealmente usar servicio)
        const nuevaEntradaStr = this.formatearFechaISO(nuevaEntrada);
        const nuevaSalidaStr = this.formatearFechaISO(nuevaSalida);

        // Identificar ID de habitación
        // targetData.habitacion puede tener _id o id (según nuestra definición laxa)
        const nuevaHabitacionId = targetData.habitacion._id || targetData.habitacion.id;

        if (nuevaHabitacionId) {
            this.moverReserva.emit({
                reserva,
                nuevaFechaEntrada: nuevaEntradaStr,
                nuevaFechaSalida: nuevaSalidaStr,
                nuevaHabitacionId
            });
        }
    }

    private formatearFechaISO(date: Date): string {
        const y = date.getFullYear();
        const m = date.getMonth() + 1;
        const d = date.getDate();
        return `${y}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`;
    }

    // Helpers para vista de lista
    obtenerReservasDelDia(dia: DiaCalendario): { habitacion: HabitacionResumen, estado: EstadoDiaReserva }[] {
        const fechaStr = this.formatearFecha(dia.fecha);
        const reservas: { habitacion: HabitacionResumen, estado: EstadoDiaReserva }[] = [];

        this.ocupacionHabitaciones.forEach(oc => {
            const estado = oc.ocupacionPorDia[fechaStr];
            if (estado && (estado.tipo === 'ocupada' || estado.tipo === 'reservada' || estado.tipo === 'transicion')) {
                reservas.push({ habitacion: oc.habitacion, estado });
            }
        });
        return reservas;
    }

    // Helper methods ported from HomeComponent
    formatearFecha(f: Date): string {
        const y = f.getFullYear();
        const m = f.getMonth() + 1;
        const d = f.getDate();
        return `${y}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`;
    }

    esHoy(f: Date): boolean {
        const hoy = new Date();
        return f.getDate() === hoy.getDate() &&
            f.getMonth() === hoy.getMonth() &&
            f.getFullYear() === hoy.getFullYear();
    }

    obtenerClaseOcupacion(estado: EstadoDiaReserva | undefined, fecha?: Date, numero?: string): string {
        if (!estado || !estado.reservaPrincipal) return 'celda-ocupacion ocupacion-disponible';

        const clases: string[] = ['celda-ocupacion'];

        // Caso especial: día de transición
        if (estado.tipo === 'transicion' && estado.esDiaTransicion) {
            clases.push('ocupacion-transicion');
            // For now we rely on the parent (Home) or dynamic check to set styles
            // In the next phase we will optimize this to use CSS vars here directly
            if (estado.claseDinamica) {
                clases.push(estado.claseDinamica);
            }
            return clases.join(' ');
        }

        switch (estado.tipo) {
            case 'ocupada': clases.push('ocupacion-ocupada'); break;
            case 'reservada': clases.push('ocupacion-reservada'); break;
            case 'finalizada': clases.push('ocupacion-finalizada'); break;
            default: clases.push('ocupacion-disponible'); return clases.join(' ');
        }

        if (estado.estaCompletamentePagado) clases.push('completamente-pagado');
        else if ((estado.montoPagado || 0) > 0) clases.push('parcialmente-pagado');
        else clases.push('sin-pago');

        return clases.join(' ');
    }

    obtenerColorReserva(r: ReservaResumen | undefined): string {
        if (!r) return '#6c757d';
        const montoPagado = r.montoPagado || 0;
        const precioTotal = r.precioTotal || 0;
        const completamente = montoPagado >= precioTotal;
        const parcial = montoPagado > 0 && montoPagado < precioTotal;

        switch (r.estado) {
            case 'En curso': return completamente ? '#28a745' : (parcial ? '#ffc107' : '#dc3545');
            case 'Confirmada':
            case 'Pendiente': return completamente ? '#17a2b8' : (parcial ? '#fd7e14' : '#e83e8c');
            case 'Finalizada': return completamente ? '#007bff' : (parcial ? '#6f42c1' : '#6c757d');
            default: return '#d4edda';
        }
    }

    obtenerTooltipOcupacion(estado: EstadoDiaReserva | undefined, hab: HabitacionResumen, dia?: DiaCalendario): string {
        if (!estado || !estado.reservaPrincipal) return `Hab ${hab.numero}: Libre`;
        const r = estado.reservaPrincipal;
        const nombre = r.cliente ? `${r.cliente.nombre} ${r.cliente.apellido}` : 'Reserva';
        return [`Hab ${hab.numero}`, nombre, r.estado, estado.reservasSecundarias?.length ? '+' + estado.reservasSecundarias?.length + ' más' : ''].filter(Boolean).join(' | ');
    }

    obtenerIconoOcupacion(estado: EstadoDiaReserva | undefined): string {
        if (!estado || !estado.reservaPrincipal) return 'bed';
        switch (estado.reservaPrincipal.estado) {
            case 'Confirmada': return 'event_available';
            case 'Pendiente': return 'schedule';
            case 'En curso': return 'hotel';
            case 'Cancelada': return 'cancel';
            case 'Finalizada': return 'check_circle';
            case 'No Show': return 'person_off';
            default: return 'bed';
        }
    }

    esCheckOutHoy(fecha: Date, estado: EstadoDiaReserva | undefined): boolean {
        if (!estado?.reservaPrincipal) return false;
        // Simple check, assume we parse YMD correctly or date-time service is not critical here if we assume string format
        const salida = new Date(estado.reservaPrincipal.fechaSalida);
        // Adjust logic if needed, duplicating strict logic from service might be needed or passing logic in
        // For now, let's keep it simple: strict visual check
        // Actually, to avoid importing DateTimeService, we can just compare YYYY-MM-DD strings
        const fStr = this.formatearFecha(fecha);
        const salStr = estado.reservaPrincipal.fechaSalida.split('T')[0];
        return fStr === salStr;
    }
}
