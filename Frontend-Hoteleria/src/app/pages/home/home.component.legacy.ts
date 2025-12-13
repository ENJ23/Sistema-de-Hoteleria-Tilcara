// Copia legacy literal de `home.component.ts` para referencia y porting
// -------------------------------------------------------------------
// Este archivo contiene el contenido original completo previo al uso de HomeComponentClean.
// No debe importarse ni usarse en rutas; es solo para consulta.

// Componente Home final limpio y completo
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, switchMap, catchError } from 'rxjs/operators';
import { HabitacionService } from '../../../core/services/habitacion.service';
import { ReservaService } from '../../../core/services/reserva.service';
import { DateTimeService } from '../../../core/services/datetime.service';
import { DetalleReservaModalComponent } from '../../../components/detalle-reserva-modal/detalle-reserva-modal.component';
import { SeleccionReservaSimpleComponent } from '../../../components/seleccion-reserva-simple/seleccion-reserva-simple.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

interface DiaCalendario { fecha: Date; dia: number; esHoy: boolean; }
interface ReservaResumen { id: string; estado: string; fechaEntrada: string; fechaSalida: string; huesped?: string; montoTotal?: number; montoPagado?: number; pagado?: boolean; notas?: string[]; }
// Componente Home limpio definitivo
import { Component as C2, OnInit as O2, OnDestroy as D2 } from '@angular/core';
import { Router as R2 } from '@angular/router';
import { Subject as S2, Subscription as Sb2, of as of2 } from 'rxjs';
import { debounceTime as dt2, switchMap as sm2, catchError as ce2 } from 'rxjs/operators';
import { HabitacionService as H2 } from '../../../core/services/habitacion.service';
import { ReservaService as RS2 } from '../../../core/services/reserva.service';
import { DateTimeService as T2 } from '../../../core/services/datetime.service';
import { DetalleReservaModalComponent as DM2 } from '../../../components/detalle-reserva-modal/detalle-reserva-modal.component';
import { SeleccionReservaSimpleComponent as SS2 } from '../../../components/seleccion-reserva-simple/seleccion-reserva-simple.component';
import { MatDialog as MD2 } from '@angular/material/dialog';
import { MatSnackBar as MS2 } from '@angular/material/snack-bar';

interface DiaCalendario { fecha: Date; dia: number; esHoy: boolean; }
interface ReservaResumen { id: string; estado: string; fechaEntrada: string; fechaSalida: string; huesped?: string; montoTotal?: number; montoPagado?: number; pagado?: boolean; notas?: string[]; }
interface HabitacionResumen { id: string; numero: string; tipo?: string; capacidad?: number; activa?: boolean; }
interface EstadoDiaReserva { reservaPrincipal?: ReservaResumen; reservasSecundarias?: ReservaResumen[]; estados?: string[]; }
interface OcupacionHabitacionMes { habitacion: HabitacionResumen; ocupacionPorDia: { [yyyyMMdd: string]: EstadoDiaReserva }; }
interface EstadisticasDia { total: number; activas: number; checkInsHoy: number; checkOutsHoy: number; canceladasHoy: number; completadasHoy: number; }

@Component({ selector: 'app-home', standalone: true, templateUrl: './home.component.html', styleUrls: ['./home.component.css'] })
export class HomeComponent implements OnInit, OnDestroy {
	fechaReferencia = new Date();
	diasCalendario: DiaCalendario[] = [];
	ocupacionHabitaciones: OcupacionHabitacionMes[] = [];
	private cacheOcupacion = new Map<string, { timestamp: number; data: OcupacionHabitacionMes[] }>();
	private readonly TTL_OCUPACION_MS = 8000;
	reservasHoy: ReservaResumen[] = [];
	estadisticasHoy: EstadisticasDia = { total: 0, activas: 0, checkInsHoy: 0, checkOutsHoy: 0, canceladasHoy: 0, completadasHoy: 0 };
	notasPorFecha: { [yyyyMMdd: string]: string[] } = {};
	private refrescarEventos$ = new Subject<void>();
	private subs: Subscription[] = [];
	cargandoOcupacion = false;
	cargandoReservas = false;

	constructor(
		private habitacionService: HabitacionService,
		private reservaService: ReservaService,
		private dateTime: DateTimeService,
		private router: Router,
		private dialog: MatDialog,
		private snack: MatSnackBar
	) {}

	ngOnInit(): void { this.generarCalendario(); this.suscribirEventos(); this.refrescarDatos(); }
	ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

	private suscribirEventos(): void {
		const sub = this.refrescarEventos$.pipe(debounceTime(300)).subscribe(() => {
			this.cargarOcupacion(false);
			this.cargarReservasHoy();
		});
		this.subs.push(sub);
	}

	refrescarDatos(): void { this.refrescarEventos$.next(); }
	mesAnterior(): void { this.fechaReferencia = this.dateTime.addMonths(this.fechaReferencia, -1); this.generarCalendario(); this.cargarOcupacion(true); }
	mesSiguiente(): void { this.fechaReferencia = this.dateTime.addMonths(this.fechaReferencia, 1); this.generarCalendario(); this.cargarOcupacion(true); }
	obtenerNombreMes(): string { return this.dateTime.nombreMes(this.fechaReferencia); }
	formatearFecha(f: Date): string { return this.dateTime.formatYMD(f); }
	esHoy(f: Date): boolean { return this.dateTime.esMismaFecha(new Date(), f); }

	private generarCalendario(): void {
		const inicio = this.dateTime.inicioMes(this.fechaReferencia);
		const fin = this.dateTime.finMes(this.fechaReferencia);
		const dias: DiaCalendario[] = [];
		let c = new Date(inicio);
		while (c <= fin) {
			dias.push({ fecha: new Date(c), dia: c.getDate(), esHoy: this.esHoy(c) });
			c = this.dateTime.addDays(c, 1);
		}
		this.diasCalendario = dias;
	}

	private cargarOcupacion(forceFresh: boolean): void {
		const clave = this.dateTime.claveMes(this.fechaReferencia);
		if (!forceFresh) {
			const cached = this.cacheOcupacion.get(clave);
			if (cached && Date.now() - cached.timestamp < this.TTL_OCUPACION_MS) {
				this.ocupacionHabitaciones = cached.data;
				return;
			}
		}
		this.cargandoOcupacion = true;
		const inicio = this.dateTime.inicioMes(this.fechaReferencia);
		const finExcl = this.dateTime.addDays(this.dateTime.finMes(this.fechaReferencia), 1); // exclusivo
		const sub = this.habitacionService.obtenerHabitacionesActivas().pipe(
			switchMap((habs: HabitacionResumen[]) => this.reservaService.obtenerReservasRango(
				this.dateTime.formatYMD(inicio),
				this.dateTime.formatYMD(finExcl)
			).pipe(
				catchError(() => { this.mostrarMensaje('Error reservas'); return of([] as ReservaResumen[]); }),
				switchMap((reservas: ReservaResumen[]) => of(this.procesarOcupacion(habs, reservas)))
			)),
			catchError(() => { this.mostrarMensaje('Error habitaciones'); return of([] as OcupacionHabitacionMes[]); })
		).subscribe(oc => {
			this.ocupacionHabitaciones = oc;
			this.cacheOcupacion.set(clave, { timestamp: Date.now(), data: oc });
			this.cargandoOcupacion = false;
		});
		this.subs.push(sub);
	}

	private procesarOcupacion(habitaciones: HabitacionResumen[], reservas: ReservaResumen[]): OcupacionHabitacionMes[] {
		const mapa: { [hid: string]: ReservaResumen[] } = {};
		reservas.forEach(r => {
			const hid = (r as any).habitacionId || r.id; // ajustar según modelo real
			(mapa[hid] ||= []).push(r);
		});
		return habitaciones.map(h => {
			const ocup: { [d: string]: EstadoDiaReserva } = {};
			this.diasCalendario.forEach(d => ocup[this.formatearFecha(d.fecha)] = { reservasSecundarias: [] });
			(mapa[h.id] || []).forEach(r => {
				let cur = this.dateTime.parseYMD(r.fechaEntrada);
				const fin = this.dateTime.parseYMD(r.fechaSalida); // exclusivo
				while (cur < fin) {
					const clave = this.formatearFecha(cur);
					const estado = ocup[clave];
					if (estado) {
						if (!estado.reservaPrincipal) estado.reservaPrincipal = r; else (estado.reservasSecundarias ||= []).push(r);
						(estado.estados ||= []).push(this.mapearEstadoReserva(r));
					}
					cur = this.dateTime.addDays(cur, 1);
				}
			});
			return { habitacion: h, ocupacionPorDia: ocup };
		});
	}

	private mapearEstadoReserva(r: ReservaResumen): string {
		switch (r.estado) {
			case 'activa': return 'activa';
			case 'completada': return 'completada';
			case 'cancelada': return 'cancelada';
			default: return 'creada';
		}
	}

	obtenerClaseOcupacion(estado: EstadoDiaReserva | undefined, _fecha: Date, _numero: string): string {
		if (!estado || !estado.reservaPrincipal) return 'libre';
		const r = estado.reservaPrincipal;
		const clases = ['ocupada', 'estado-' + this.mapearEstadoReserva(r)];
		if (r.pagado) clases.push('pagado');
		if (r.montoTotal && r.montoPagado && r.montoPagado > 0 && r.montoPagado < r.montoTotal) clases.push('pago-parcial');
		if (estado.reservasSecundarias?.length) clases.push('multiple');
		return clases.join(' ');
	}

	obtenerTooltipOcupacion(estado: EstadoDiaReserva | undefined, hab: HabitacionResumen, _dia: DiaCalendario): string {
		if (!estado || !estado.reservaPrincipal) return `Hab ${hab.numero}: Libre`;
		const r = estado.reservaPrincipal;
		const partes = [`Hab ${hab.numero}`, r.huesped || 'Reserva', this.mapearEstadoReserva(r)];
		if (estado.reservasSecundarias?.length) partes.push('+' + estado.reservasSecundarias.length + ' más');
		return partes.join(' | ');
	}

	obtenerIconoOcupacion(estado: EstadoDiaReserva | undefined): string {
		if (!estado || !estado.reservaPrincipal) return 'bed';
		switch (estado.reservaPrincipal.estado) {
			case 'activa': return 'login';
			case 'completada': return 'check';
			case 'cancelada': return 'close';
			default: return 'bed';
		}
	}

	seleccionarCelda(_h: HabitacionResumen, _d: DiaCalendario, estado: EstadoDiaReserva | undefined): void {
		if (!estado || !estado.reservaPrincipal) return;
		if (estado.reservasSecundarias?.length)
			this.mostrarOpcionesMultiplesReservas([estado.reservaPrincipal, ...estado.reservasSecundarias]);
		else
			this.verDetalleReserva(estado.reservaPrincipal);
	}

	esCheckOutHoy(fecha: Date, estado: EstadoDiaReserva | undefined): boolean {
		if (!estado?.reservaPrincipal) return false;
		const salidaExclusive = this.dateTime.parseYMD(estado.reservaPrincipal.fechaSalida);
		return this.dateTime.esMismaFecha(this.dateTime.addDays(salidaExclusive, -1), fecha);
	}

	private cargarReservasHoy(): void {
		this.cargandoReservas = true;
		const hoy = this.dateTime.formatYMD(new Date());
		const sub = this.reservaService.obtenerReservasDia(hoy).pipe(
			catchError(() => { this.mostrarMensaje('Error reservas día'); return of([] as ReservaResumen[]); })
		).subscribe(rs => {
			this.reservasHoy = rs;
			this.actualizarEstadisticas(rs);
			this.cargandoReservas = false;
		});
		this.subs.push(sub);
	}

	private actualizarEstadisticas(reservas: ReservaResumen[]): void {
		const hoy = this.dateTime.formatYMD(new Date());
		let activas = 0, ci = 0, co = 0, canc = 0, comp = 0;
		reservas.forEach(r => {
			if (r.estado === 'activa') activas++;
			if (r.estado === 'cancelada') canc++;
			if (r.estado === 'completada') comp++;
			if (r.fechaEntrada === hoy) ci++;
			if (r.fechaSalida === hoy) co++;
		});
		this.estadisticasHoy = { total: reservas.length, activas, checkInsHoy: ci, checkOutsHoy: co, canceladasHoy: canc, completadasHoy: comp };
	}

	verDetalleReserva(r: ReservaResumen): void { this.dialog.open(DetalleReservaModalComponent, { data: { reservaId: r.id } }); }
	editarReserva(r: ReservaResumen): void { this.router.navigate(['/reservas', r.id, 'editar']); }
	imprimirReserva(_r: ReservaResumen): void { this.mostrarMensaje('Impresión pendiente'); }
	mostrarOpcionesMultiplesReservas(reservas: ReservaResumen[]): void { this.dialog.open(SeleccionReservaSimpleComponent, { data: { reservas } }); }
	realizarCheckIn(r: ReservaResumen | undefined): void { if (!r) return; r.estado = 'activa'; this.mostrarMensaje('Check-In realizado'); this.refrescarDatos(); }
	realizarCheckOut(r: ReservaResumen | undefined): void { if (!r) return; r.estado = 'completada'; this.mostrarMensaje('Check-Out realizado'); this.refrescarDatos(); }
	gestionarLimpieza(): void { this.mostrarMensaje('Limpieza pendiente'); }
	gestionarPagos(): void { this.mostrarMensaje('Pagos pendiente'); }
	generarReportes(): void { this.mostrarMensaje('Reportes pendiente'); }
	gestionarMantenimiento(): void { this.mostrarMensaje('Mantenimiento pendiente'); }
	abrirNuevaReserva(): void { this.router.navigate(['/reservas/nueva']); }
	gestionarHabitaciones(): void { this.router.navigate(['/habitaciones']); }
	irACalendario(): void { this.router.navigate(['/calendario']); }

	agregarNota(texto: string): void { if (!texto) return; const hoy = this.formatearFecha(new Date()); (this.notasPorFecha[hoy] ||= []).push(texto); this.mostrarMensaje('Nota agregada'); }
	eliminarNota(i: number): void { const hoy = this.formatearFecha(new Date()); const notas = this.notasPorFecha[hoy]; if (!notas) return; notas.splice(i, 1); this.mostrarMensaje('Nota eliminada'); }
	obtenerColorReserva(r: ReservaResumen | undefined): string { if (!r) return 'transparent'; if (r.pagado) return '#2e7d32'; if (r.montoTotal && r.montoPagado && r.montoPagado > 0) return '#ffb300'; return '#b71c1c'; }
	private mostrarMensaje(msg: string): void { this.snack.open(msg, 'OK', { duration: 2500 }); }
}

// Fin de copia literal
