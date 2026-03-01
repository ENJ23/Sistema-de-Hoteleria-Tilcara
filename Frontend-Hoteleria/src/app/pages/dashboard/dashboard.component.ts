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
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';

import { ReservaService } from '../../services/reserva.service';
import { DateTimeService } from '../../services/date-time.service';
import { Reserva, ReservaResponse } from '../../models/reserva.model';

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

interface IngresosResumen {
  totalIngresos: number;
  ingresosCompletos: number;
  ingresosParciales: number;
  pendientePeriodo: number;
  totalReservas: number;
  reservasCompletas: number;
  reservasParciales: number;
  reservasSinPago: number;
  promedioPorReserva: number;
  ingresosPorDia: { fecha: string, ingresos: number }[];
  reservasRecientes: Reserva[];
  reservasPendientesPeriodo?: Reserva[];
}

interface IngresosPorTipo {
  tipo: string;
  cantidad: number;
  ingresos: number;
  porcentaje: number;
}

interface IngresosPorHabitacion {
  numero: string;
  cantidad: number;
  ingresos: number;
  porcentaje: number;
}

interface PagoNormalizado {
  monto: number;
  fechaPago: string;
  habitacionId?: string;
  habitacionNumero?: string;
  habitacionTipo?: string;
  // Datos adicionales de la reserva
  fechaReserva?: string;
  fechaEntrada?: string;
  fechaSalida?: string;
  clienteNombre?: string;
  clienteApellido?: string;
  estadoReserva?: string;
}

interface ResumenAnual {
  year: number;
  totalIngresos: number;
  totalReservas: number;
  promedioMensual: number;
  ingresosPorMes: { mes: string, ingresos: number, cantidad: number }[];
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
    MatExpansionModule,
    MatProgressBarModule,
    MatSlideToggleModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  providers: [
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMAT },
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' }
  ]
})
export class DashboardComponent implements OnInit {
  // Datos del dashboard
  resumen: IngresosResumen = {
    totalIngresos: 0,
    ingresosCompletos: 0,
    ingresosParciales: 0,
    pendientePeriodo: 0,
    totalReservas: 0,
    reservasCompletas: 0,
    reservasParciales: 0,
    reservasSinPago: 0,
    promedioPorReserva: 0,
    ingresosPorDia: [],
    reservasRecientes: [],
    reservasPendientesPeriodo: []
  };

  resumenAnual: ResumenAnual = {
    year: new Date().getFullYear(),
    totalIngresos: 0,
    totalReservas: 0,
    promedioMensual: 0,
    ingresosPorMes: []
  };

  ingresosPorTipo: IngresosPorTipo[] = [];
  ingresosPorHabitacion: IngresosPorHabitacion[] = []; // Mensual
  ingresosPorHabitacionAnual: IngresosPorHabitacion[] = []; // Anual
  pagosPeriodo: PagoNormalizado[] = [];
  searchPagosText: string = ''; // Texto de búsqueda para pagos

  // Estados
  ocultarCanceladasNoShow: boolean = true;
  loading = false;
  loadingAnual = false;
  fechaActual = new Date();
  mesActual = new Date();

  // Formulario para filtros
  filtrosForm: FormGroup;

  // Columnas para la tabla de reservas recientes
  displayedColumns: string[] = ['cliente', 'habitacion', 'fechas', 'estado', 'pago', 'ingresos'];

  // Getter para pagos filtrados
  get pagosFiltrados(): PagoNormalizado[] {
    if (!this.searchPagosText || this.searchPagosText.trim() === '') {
      return [...this.pagosPeriodo].sort((a, b) => {
        const fechaA = this.dateTimeService.stringToDate(a.fechaPago).getTime();
        const fechaB = this.dateTimeService.stringToDate(b.fechaPago).getTime();
        return fechaA - fechaB;
      });
    }

    const searchLower = this.searchPagosText.toLowerCase().trim();
    const filtrados = this.pagosPeriodo.filter(pago => {
      // Buscar por nombre del cliente
      const nombreCliente = `${pago.clienteNombre || ''} ${pago.clienteApellido || ''}`.toLowerCase();
      if (nombreCliente.includes(searchLower)) return true;

      // Buscar por monto (convertir monto a string y buscar coincidencia)
      const montoStr = pago.monto.toString();
      if (montoStr.includes(searchLower)) return true;

      return false;
    });
    return filtrados.sort((a, b) => {
      const fechaA = this.dateTimeService.stringToDate(a.fechaPago).getTime();
      const fechaB = this.dateTimeService.stringToDate(b.fechaPago).getTime();
      return fechaA - fechaB;
    });
  }

  constructor(
    private reservaService: ReservaService,
    private snackBar: MatSnackBar,
    private router: Router,
    private fb: FormBuilder,
    private dateTimeService: DateTimeService
  ) {
    this.filtrosForm = this.fb.group({
      fechaInicio: [this.obtenerPrimerDiaDelMes()],
      fechaFin: [this.obtenerUltimoDiaDelMes()]
    });
  }

  // Cotización Dólar
  valorDolar: number = 0; // Se inicializa en 0 o se carga del localStorage

  ngOnInit(): void {
    // Cargar valor del dólar guardado
    const dolarGuardado = localStorage.getItem('valorDolar');
    if (dolarGuardado) {
      this.valorDolar = parseFloat(dolarGuardado);
    }

    // Existing logic for queryParams if any, otherwise remove this block
    // this.router.queryParams.subscribe(params => {
    //   // ... existing logic
    // });

    this.cargarDatos();
    this.cargarDatosAnuales();
  }

  actualizarValorDolar(valor: string | number): void {
    const numVal = Number(valor);
    this.valorDolar = isNaN(numVal) ? 0 : numVal;
    localStorage.setItem('valorDolar', this.valorDolar.toString());
  }

  formatearDolar(montoPesos: number): string {
    if (!this.valorDolar || this.valorDolar <= 0) return '$0.00 USD';
    const montoUSD = montoPesos / this.valorDolar;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(montoUSD);
  }

  private obtenerPrimerDiaDelMes(): Date {
    // ✅ Usar mesActual en lugar de hoy para navegación correcta
    return new Date(this.mesActual.getFullYear(), this.mesActual.getMonth(), 1);
  }

  private obtenerUltimoDiaDelMes(): Date {
    // ✅ Usar mesActual en lugar de hoy para navegación correcta
    return new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 0);
  }

  private cargarDatos(): void {
    this.loading = true;
    const filtros = this.filtrosForm.value;

    // ✅ NUEVO: Usar endpoint específico para ingresos por mes (según fechas de pago)
    const fechaInicioStr = this.dateTimeService.dateToString(filtros.fechaInicio);
    const fechaFinStr = this.dateTimeService.dateToString(filtros.fechaFin);

    console.log('📅 Dashboard - Cargando ingresos por mes para:', {
      mesActual: this.mesActual.getMonth() + 1 + '/' + this.mesActual.getFullYear(),
      fechaInicio: fechaInicioStr,
      fechaFin: fechaFinStr
    });

    // 1. Obtener ingresos agrupados por mes (según historialPagos)
    this.reservaService.getIngresosPorMes(fechaInicioStr, fechaFinStr).subscribe({
      next: (ingresosPorMesResponse: any) => {
        console.log('✅ Ingresos por mes recibidos:', ingresosPorMesResponse);

        // 2. Obtener TODAS las reservas sin filtro de fecha (máx 100 por página)
        // Así incluimos todas las reservas que puedan tener pagos en el rango
        this.reservaService.getReservasAll(undefined, 100, true).subscribe({
          next: (response: ReservaResponse) => {
            const reservas = response.reservas || [];

            // Procesar datos combinados usando pagos del periodo
            this.procesarDatosConIngresos(reservas, ingresosPorMesResponse, fechaInicioStr, fechaFinStr);
            this.loading = false;
          },
          error: (error) => {
            console.error('Error al cargar reservas del mes:', error);
            this.snackBar.open('❌ Error al cargar las reservas', 'Cerrar', { duration: 3000 });
            this.loading = false;
          }
        });
      },
      error: (error) => {
        console.error('Error al cargar ingresos por mes:', error);
        this.snackBar.open('❌ Error al cargar los ingresos', 'Cerrar', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  private cargarDatosAnuales(): void {
    this.loadingAnual = true;
    const year = this.mesActual.getFullYear();

    console.log('📅 Dashboard - Cargando datos ANUALES para:', year);

    // ✅ NUEVO: Usar endpoint específico para resumen anual (según fechas de pago)
    this.reservaService.getIngresosAnuales(year).subscribe({
      next: (resumenAnualResponse: any) => {
        console.log('✅ Resumen anual recibido:', resumenAnualResponse);

        // Construir resumenAnual directamente del endpoint
        this.resumenAnual = {
          year: resumenAnualResponse.year || year,
          totalIngresos: resumenAnualResponse.totalIngresos || 0,
          totalReservas: resumenAnualResponse.totalReservas || 0,
          promedioMensual: resumenAnualResponse.promedioMensual || 0,
          ingresosPorMes: this.mapearIngresosPorMesANombres(resumenAnualResponse.ingresosPorMes || [])
        };

        // Calcular desglose por habitación ANUAL basado en pagos
        const fechaInicioStr = `${year}-01-01`;
        const fechaFinStr = `${year}-12-31`;

        this.reservaService.getReservasAll({
          fechaInicio: fechaInicioStr,
          fechaFin: fechaFinStr
        }, 100, true).subscribe({
          next: (response: ReservaResponse) => {
            const reservasRaw = response.reservas || [];
            const uniqueReservas = Array.from(new Map(reservasRaw.map(item => [item._id, item])).values());

            const pagosYear = this.extraerPagosEnRango(uniqueReservas, fechaInicioStr, fechaFinStr);
            this.pagosPeriodo = pagosYear;
            this.ingresosPorHabitacionAnual = this.calcularIngresosPorHabitacionDesdePagos(pagosYear);

            this.loadingAnual = false;
          },
          error: (error) => {
            console.error('Error al cargar reservas anuales:', error);
            this.ingresosPorHabitacionAnual = [];
            this.loadingAnual = false;
          }
        });
      },
      error: (error) => {
        console.error('Error al cargar resumen anual:', error);
        this.loadingAnual = false;
      }
    });
  }

  // Helper para mapear ingresos por mes a nombres de meses
  private mapearIngresosPorMesANombres(ingresosPorMes: any[]): { mes: string, ingresos: number, cantidad: number }[] {
    return ingresosPorMes.map(item => {
      // item._id está en formato '2025-01'
      if (item._id) {
        const [year, mes] = item._id.split('-');
        const mesIndex = parseInt(mes, 10) - 1;
        const nombrMes = this.obtenerNombreMes(mesIndex);
        return {
          mes: `${nombrMes} ${year}`,
          ingresos: item.totalIngresos,
          cantidad: item.cantidad
        };
      }
      return item;
    });
  }

  // Nuevo método para procesar datos combinados (ingresos por pago + reservas del mes)
  private procesarDatosConIngresos(reservas: Reserva[], ingresosPorMesResponse: any, fechaInicio: string, fechaFin: string): void {
    console.log('📊 Dashboard - Procesando datos con ingresos por pago');

    // Usar los ingresos del endpoint (agrupados por fecha de pago)
    const totalIngresos = ingresosPorMesResponse.totalIngresos || 0;
    const totalPagos = ingresosPorMesResponse.totalPagos || 0;

    // Pagos del periodo (para todos los desgloses)
    const pagosPeriodo = this.extraerPagosEnRango(reservas, fechaInicio, fechaFin);
    this.pagosPeriodo = pagosPeriodo;

    // Reservas del período (según fecha de inicio de reserva)
    const fechaInicioDate = this.dateTimeService.stringToDate(fechaInicio);
    const fechaFinDate = this.dateTimeService.stringToDate(fechaFin);
    const reservasPeriodo = reservas.filter(r => {
      if (!r.fechaEntrada) return false;
      const fechaReserva = this.dateTimeService.stringToDate(r.fechaEntrada);
      return fechaReserva >= fechaInicioDate && fechaReserva <= fechaFinDate;
    });

    // Para el resumen mensual, usamos los datos de ingresos del endpoint
    const ingresosPorMes = ingresosPorMesResponse.ingresosPorMes || [];

    // Calcular ingresos por tipo de habitación (pagos en el rango)
    this.ingresosPorTipo = this.calcularIngresosPorTipoDesdePagos(pagosPeriodo);

    // Calcular ingresos por habitación individual (pagos en el rango)
    this.ingresosPorHabitacion = this.calcularIngresosPorHabitacionDesdePagos(pagosPeriodo);

    // Calcular ingresos por día (pagos en el rango)
    this.resumen.ingresosPorDia = this.calcularIngresosPorDiaDesdePagos(pagosPeriodo);

    // Obtener reservas recientes (últimas 5)
    const reservasRecientes = [...reservasPeriodo]
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);

    // Construir resumen con ingresos basados en pagos
    this.resumen = {
      totalIngresos: totalIngresos,
      ingresosCompletos: 0, // Se calculará de reservas
      ingresosParciales: 0, // Se calculará de reservas
      pendientePeriodo: 0,
      totalReservas: reservasPeriodo.length,
      reservasCompletas: 0,
      reservasParciales: 0,
      reservasSinPago: 0,
      promedioPorReserva: reservasPeriodo.length > 0 ? totalIngresos / reservasPeriodo.length : 0,
      ingresosPorDia: [],
      reservasRecientes: reservasRecientes,
      reservasPendientesPeriodo: []
    };

    // Calcular estado de pagos de reservas
    let reservasCompletas = 0;
    let reservasParciales = 0;
    let reservasSinPago = 0;
    let ingresosCompletos = 0;
    let ingresosParciales = 0;
    let pendientePeriodo = 0;
    const reservasPendientesLista: Reserva[] = [];

    reservasPeriodo.forEach(r => {
      // Filtrar Canceladas o No Show si el switch está activado
      if (this.ocultarCanceladasNoShow && (r.estado === 'Cancelada' || r.estado === 'No Show')) {
        return; // Saltar esta reserva
      }

      const montoPagado = r.montoPagado || 0;
      const precioTotal = r.precioTotal || 0;

      const pendiente = Math.max(0, precioTotal - montoPagado);
      pendientePeriodo += pendiente;

      if (pendiente > 0) {
        reservasPendientesLista.push(r);
      }

      if (r.estaCompletamentePagado) {
        reservasCompletas++;
        ingresosCompletos += montoPagado;
      } else if (montoPagado > 0) {
        reservasParciales++;
        ingresosParciales += montoPagado;
      } else {
        reservasSinPago++;
      }
    });

    // Actualizar resumen con cálculos
    this.resumen = {
      ...this.resumen,
      ingresosCompletos,
      ingresosParciales,
      reservasCompletas,
      reservasParciales,
      reservasSinPago,
      pendientePeriodo,
      reservasPendientesPeriodo: reservasPendientesLista
    };

    console.log('✅ Resumen procesado:', this.resumen);
  }

  private procesarDatosAnuales(reservas: Reserva[], year: number): void {
    // ✅ DEPRECATED: Ahora se usa el endpoint /ingresos/anual
    // Este método se mantiene solo por compatibilidad
  }

  private procesarDatos(reservas: Reserva[]): void {
    // ✅ DEPRECATED: Ahora se usa procesarDatosConIngresos()
    // Este método se mantiene solo por compatibilidad
  }

  private calcularIngresosPorDiaDesdePagos(pagos: PagoNormalizado[]): { fecha: string, ingresos: number }[] {
    const ingresosPorDia: { [key: string]: number } = {};

    pagos.forEach(pago => {
      const fecha = pago.fechaPago.split('T')[0];
      if (ingresosPorDia[fecha]) {
        ingresosPorDia[fecha] += pago.monto;
      } else {
        ingresosPorDia[fecha] = pago.monto;
      }
    });

    return Object.entries(ingresosPorDia)
      .map(([fecha, ingresos]) => ({ fecha, ingresos }))
      .sort((a, b) => this.dateTimeService.stringToDate(a.fecha).getTime() - this.dateTimeService.stringToDate(b.fecha).getTime());
  }

  private calcularIngresosPorTipoDesdePagos(pagos: PagoNormalizado[]): IngresosPorTipo[] {
    const ingresosPorTipo: { [key: string]: { cantidad: number, ingresos: number } } = {};

    pagos.forEach(pago => {
      const tipo = pago.habitacionTipo || 'Desconocido';

      if (ingresosPorTipo[tipo]) {
        ingresosPorTipo[tipo].cantidad++;
        ingresosPorTipo[tipo].ingresos += pago.monto;
      } else {
        ingresosPorTipo[tipo] = { cantidad: 1, ingresos: pago.monto };
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

  private calcularIngresosPorHabitacionDesdePagos(pagos: PagoNormalizado[]): IngresosPorHabitacion[] {
    const ingresosMap: { [key: string]: { cantidad: number, ingresos: number } } = {};

    pagos.forEach(pago => {
      const numero = pago.habitacionNumero || 'N/A';

      if (ingresosMap[numero]) {
        ingresosMap[numero].cantidad++;
        ingresosMap[numero].ingresos += pago.monto;
      } else {
        ingresosMap[numero] = { cantidad: 1, ingresos: pago.monto };
      }
    });

    const totalIngresos = Object.values(ingresosMap).reduce((sum, item) => sum + item.ingresos, 0);

    return Object.entries(ingresosMap)
      .map(([numero, datos]) => ({
        numero,
        cantidad: datos.cantidad,
        ingresos: datos.ingresos,
        porcentaje: totalIngresos > 0 ? (datos.ingresos / totalIngresos) * 100 : 0
      }))
      .sort((a, b) => b.ingresos - a.ingresos);
  }

  // Normaliza pagos de reservas en un rango
  private extraerPagosEnRango(reservas: Reserva[], fechaInicio: string, fechaFin: string): PagoNormalizado[] {
    // Parsear fechas en UTC para coincidir con el backend
    const [añoInicio, mesInicio, diaInicio] = fechaInicio.split('-').map(Number);
    const [añoFin, mesFin, diaFin] = fechaFin.split('-').map(Number);
    
    // Usar Date.UTC para crear timestamps en UTC
    const inicio = Date.UTC(añoInicio, mesInicio - 1, diaInicio, 0, 0, 0, 0);
    const fin = Date.UTC(añoFin, mesFin - 1, diaFin, 23, 59, 59, 999);

    console.log('📅 Frontend - extraerPagosEnRango:', {
      fechaInicio,
      fechaFin,
      inicioUTC: new Date(inicio).toISOString(),
      finUTC: new Date(fin).toISOString(),
      totalReservas: reservas.length
    });

    const pagos: PagoNormalizado[] = [];

    reservas.forEach(reserva => {
      const habObj = typeof reserva.habitacion === 'object' ? reserva.habitacion as any : null;
      const habNumero = habObj?.numero || (typeof reserva.habitacion === 'string' ? reserva.habitacion : 'N/A');
      const habTipo = habObj?.tipo || 'Desconocido';

      (reserva as any).historialPagos?.forEach((pago: any) => {
        const fechaPagoStr = pago.fechaPago;
        const ts = fechaPagoStr ? new Date(fechaPagoStr).getTime() : 0;
        
        // Debug: mostrar cada pago y si está en rango
        if (ts >= inicio && ts <= fin) {
          pagos.push({
            monto: pago.monto || 0,
            fechaPago: pago.fechaPago,
            habitacionId: habObj?._id || undefined,
            habitacionNumero: habNumero,
            habitacionTipo: habTipo,
            // Campos extra para mostrar detalles en el panel
            fechaReserva: reserva.fechaEntrada,
            fechaEntrada: reserva.fechaEntrada,
            fechaSalida: reserva.fechaSalida,
            clienteNombre: (reserva as any).cliente?.nombre || undefined,
            clienteApellido: (reserva as any).cliente?.apellido || undefined,
            estadoReserva: (reserva as any).estado || undefined
          });
        }
      });
    });

    console.log('📅 Frontend - Pagos filtrados:', pagos.length, 'de', 
      reservas.reduce((sum, r) => sum + ((r as any).historialPagos?.length || 0), 0), 'totales');

    return pagos;
  }


  exportarExcel(): void {
    const wb = XLSX.utils.book_new();
    const fechaReporte = this.dateTimeService.dateToString(new Date());

    // 1. Hoja Resumen Mensual
    const resumenData = [
      ['Reporte de Ingresos Mensuales', `Mes: ${this.obtenerNombreMes(this.mesActual.getMonth())} ${this.mesActual.getFullYear()}`],
      [''],
      ['Concepto', 'Cantidad', 'Monto'],
      ['Total Ingresos', this.resumen.totalReservas, this.resumen.totalIngresos],
      ['Completamente Pagadas', this.resumen.reservasCompletas, this.resumen.ingresosCompletos],
      ['Parcialmente Pagadas', this.resumen.reservasParciales, this.resumen.ingresosParciales],
      ['Sin Pago', this.resumen.reservasSinPago, 0],
      ['Promedio por Reserva', '', this.resumen.promedioPorReserva]
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Mensual');

    // 2. Hoja Desglose por Habitación (Mensual)
    const desgloseHabData = [
      ['Desglose por Habitación (Mensual)'],
      ['Habitación', 'Reservas', 'Ingresos', '% del Total'],
      ...this.ingresosPorHabitacion.map(h => [h.numero, h.cantidad, h.ingresos, (h.porcentaje / 100).toFixed(4)])
    ];
    const wsHabitaciones = XLSX.utils.aoa_to_sheet(desgloseHabData);
    XLSX.utils.book_append_sheet(wb, wsHabitaciones, 'Por Habitación');

    // 3. Hoja Resumen Anual
    const anualData = [
      [`Resumen Anual ${this.resumenAnual.year}`],
      ['Concepto', 'Valor'],
      ['Total Ingresos Anuales', this.resumenAnual.totalIngresos],
      ['Total Reservas Anuales', this.resumenAnual.totalReservas],
      [''],
      ['Mes', 'Ingresos', 'Reservas'],
      ...this.resumenAnual.ingresosPorMes.map(m => [m.mes, m.ingresos, m.cantidad])
    ];
    const wsAnual = XLSX.utils.aoa_to_sheet(anualData);
    XLSX.utils.book_append_sheet(wb, wsAnual, 'Resumen Anual');

    // Guardar archivo
    XLSX.writeFile(wb, `Reporte_Ingresos_${fechaReporte}.xlsx`);
  }

  exportarPDF(): void {
    const doc = new jsPDF();
    const fechaReporte = this.dateTimeService.dateToString(new Date());
    const mesNombre = this.obtenerNombreMes(this.mesActual.getMonth());
    const year = this.mesActual.getFullYear();

    // Título
    doc.setFontSize(18);
    doc.setTextColor(26, 35, 126); // Primary dark color
    doc.text('Reporte de Gestión Hotelera', 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Fecha de emisión: ${fechaReporte}`, 14, 30);
    doc.text(`Período: ${mesNombre} ${year}`, 14, 36);

    // Resumen Principal
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Resumen del Mes', 14, 48);

    autoTable(doc, {
      startY: 52,
      head: [['Concepto', 'Cantidad', 'Ingresos']],
      body: [
        ['Total General', this.resumen.totalReservas, `$${this.resumen.totalIngresos.toLocaleString('es-AR')}`],
        ['Completamente Pagadas', this.resumen.reservasCompletas, `$${this.resumen.ingresosCompletos.toLocaleString('es-AR')}`],
        ['Parcialmente Pagadas', this.resumen.reservasParciales, `$${this.resumen.ingresosParciales.toLocaleString('es-AR')}`],
        ['Sin Pago', this.resumen.reservasSinPago, '$0.00'],
      ],
      theme: 'striped',
      headStyles: { fillColor: [26, 35, 126] }
    });

    // Desglose por Habitación
    let finalY = (doc as any).lastAutoTable.finalY + 14;
    doc.text('Ingresos por Habitación', 14, finalY);

    const bodyHab = this.ingresosPorHabitacion.map(h => [
      `Habitación ${h.numero}`,
      h.cantidad,
      `$${h.ingresos.toLocaleString('es-AR')}`,
      `${h.porcentaje.toFixed(1)}%`
    ]);

    autoTable(doc, {
      startY: finalY + 4,
      head: [['Habitación', 'Reservas', 'Ingresos', '% Total']],
      body: bodyHab,
      theme: 'grid',
      headStyles: { fillColor: [63, 81, 181] } // Primary color
    });

    // Resumen Anual
    doc.addPage();
    doc.setFontSize(16);
    doc.text(`Resumen Anual ${this.resumenAnual.year}`, 14, 20);

    const bodyAnual = this.resumenAnual.ingresosPorMes.map(m => [
      m.mes,
      m.cantidad,
      `$${m.ingresos.toLocaleString('es-AR')}`
    ]);

    // Agregar fila de total anual al final
    bodyAnual.push(['TOTAL', this.resumenAnual.totalReservas, `$${this.resumenAnual.totalIngresos.toLocaleString('es-AR')}`]);

    autoTable(doc, {
      startY: 25,
      head: [['Mes', 'Reservas', 'Ingresos']],
      body: bodyAnual,
      theme: 'striped',
      headStyles: { fillColor: [26, 35, 126] }
    });

    doc.save(`Reporte_Hotel_${mesNombre}_${year}.pdf`);
  }

  // Métodos públicos
  actualizarDatos(): void {
    this.cargarDatos();
    this.cargarDatosAnuales(); // Actualizar también anual
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

    // Si cambió el año, recargar datos anuales
    if (this.resumenAnual.year !== this.mesActual.getFullYear()) {
      this.cargarDatosAnuales();
    }
  }

  irAHoy(): void {
    // ✅ Actualizar mesActual antes de obtener fechas
    const changedYear = this.mesActual.getFullYear() !== new Date().getFullYear();
    this.mesActual = new Date();
    this.filtrosForm.patchValue({
      fechaInicio: this.obtenerPrimerDiaDelMes(),
      fechaFin: this.obtenerUltimoDiaDelMes()
    });
    this.cargarDatos();
    if (changedYear || this.resumenAnual.totalIngresos === 0) {
      this.cargarDatosAnuales();
    }
  }

  // Aplicar un rango personalizado de fechas (usa fecha de pago para ingresos)
  onAplicarRango(): void {
    const { fechaInicio, fechaFin } = this.filtrosForm.value;
    if (!fechaInicio || !fechaFin) {
      this.snackBar.open('Seleccione fecha inicio y fin', 'Cerrar', { duration: 2500 });
      return;
    }
    if (fechaInicio > fechaFin) {
      this.snackBar.open('La fecha inicial debe ser anterior a la final', 'Cerrar', { duration: 2500 });
      return;
    }

    // Ajustar mesActual al inicio del rango para mantener coherencia visual
    this.mesActual = new Date(fechaInicio);

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
    const date = new Date(fecha);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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

  obtenerNumeroHabitacion(habitacion: any): string {
    if (!habitacion) return 'N/A';
    if (typeof habitacion === 'string') return habitacion;
    return habitacion.numero || 'N/A';
  }

  getBadgeClass(estado: string | undefined): string {
    if (!estado) return '';
    const estadoMap: { [key: string]: string } = {
      'Confirmada': 'badge-confirmada',
      'Pendiente': 'badge-pendiente',
      'En curso': 'badge-encurso',
      'Cancelada': 'badge-cancelada',
      'No Show': 'badge-noshow',
      'Finalizada': 'badge-finalizada'
    };
    return estadoMap[estado] || '';
  }
}