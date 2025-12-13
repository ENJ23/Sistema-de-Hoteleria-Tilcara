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
import { MatExpansionModule } from '@angular/material/expansion'; // Nuevo importa
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
  totalReservas: number;
  reservasCompletas: number;
  reservasParciales: number;
  reservasSinPago: number;
  promedioPorReserva: number;
  ingresosPorDia: { fecha: string, ingresos: number }[];
  reservasRecientes: Reserva[];
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
    totalReservas: 0,
    reservasCompletas: 0,
    reservasParciales: 0,
    reservasSinPago: 0,
    promedioPorReserva: 0,
    ingresosPorDia: [],
    reservasRecientes: []
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

  // Estados
  loading = false;
  loadingAnual = false;
  fechaActual = new Date();
  mesActual = new Date();

  // Formulario para filtros
  filtrosForm: FormGroup;

  // Columnas para la tabla de reservas recientes
  displayedColumns: string[] = ['cliente', 'habitacion', 'fechas', 'estado', 'pago', 'ingresos'];

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

    // ✅ DEBUGGING: Log de fechas solicitadas
    const fechaInicioStr = this.dateTimeService.dateToString(filtros.fechaInicio);
    const fechaFinStr = this.dateTimeService.dateToString(filtros.fechaFin);

    console.log('📅 Dashboard - Cargando datos para:', {
      mesActual: this.mesActual.getMonth() + 1 + '/' + this.mesActual.getFullYear(),
      fechaInicio: fechaInicioStr,
      fechaFin: fechaFinStr
    });

    this.reservaService.getReservas({
      fechaInicio: fechaInicioStr,
      fechaFin: fechaFinStr
    }).subscribe({
      next: (response: ReservaResponse) => {
        this.procesarDatos(response.reservas);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar datos del dashboard:', error);
        this.snackBar.open('❌ Error al cargar los datos del dashboard', 'Cerrar', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  private cargarDatosAnuales(): void {
    this.loadingAnual = true;
    const year = this.mesActual.getFullYear();
    const fechaInicio = `${year}-01-01`;
    const fechaFin = `${year}-12-31`;

    console.log('📅 Dashboard - Cargando datos ANUALES para:', year);

    this.reservaService.getReservasAll({
      fechaInicio: fechaInicio,
      fechaFin: fechaFin
    }, 100, true).subscribe({ // Usar getReservasAll para traer todo paginado
      next: (response: ReservaResponse) => {
        const reservasRaw = response.reservas || [];
        console.log('📊 Dashboard - Reservas ANUALES recibidas:', reservasRaw.length);

        // CORRECCIÓN DUPLICADOS: Deduplicar explícitamente por _id
        const uniqueReservas = Array.from(new Map(reservasRaw.map(item => [item._id, item])).values());

        if (uniqueReservas.length !== reservasRaw.length) {
          console.warn(`⚠️ CORREGIDO: Se eliminaron ${reservasRaw.length - uniqueReservas.length} duplicados.`);
        }

        this.procesarDatosAnuales(uniqueReservas, year);
        this.loadingAnual = false;
      },
      error: (error) => {
        console.error('Error al cargar datos anuales:', error);
        this.loadingAnual = false;
      }
    });
  }

  private procesarDatosAnuales(reservas: Reserva[], year: number): void {
    let totalIngresos = 0;
    const ingresosPorMesMap = new Map<number, { ingresos: number, cantidad: number }>();

    // Inicializar meses
    for (let i = 0; i < 12; i++) {
      ingresosPorMesMap.set(i, { ingresos: 0, cantidad: 0 });
    }

    reservas.forEach(r => {
      if (r.estado === 'Cancelada' || r.estado === 'No Show') return; // Excluir No Show también si no pagan
      const monto = r.montoPagado || 0;
      totalIngresos += monto;

      // Determinar mes base (usamos fecha de entrada o fecha de pago si existe?)
      // Generalmente para "Ingresos" se debería usar la fecha de pago, pero si no hay historial detallado,
      // usamos la fecha de entrada como aproximación operativa o la fecha de creación.
      // Dado el modelo, usaremos fechaEntrada para agrupar operativamente.
      const fecha = new Date(r.fechaEntrada);
      const mes = fecha.getMonth();

      const current = ingresosPorMesMap.get(mes)!;
      current.ingresos += monto;
      current.cantidad++;
    });

    const ingresosPorMes = Array.from(ingresosPorMesMap.entries()).map(([mesIndex, data]) => ({
      mes: this.obtenerNombreMes(mesIndex),
      ingresos: data.ingresos,
      cantidad: data.cantidad
    }));

    this.resumenAnual = {
      year,
      totalIngresos,
      totalReservas: reservas.length,
      promedioMensual: totalIngresos / 12,
      ingresosPorMes
    };

    // Calcular desglose por habitación ANUAL
    this.ingresosPorHabitacionAnual = this.calcularIngresosPorHabitacion(reservas);
  }

  private procesarDatos(reservas: Reserva[]): void {
    // ✅ El backend ya filtra por fecha, no necesitamos filtrar nuevamente
    // Las reservas ya vienen filtradas por el rango de fechas solicitado
    const reservasDelMes = reservas;

    // ✅ DEBUGGING: Log de procesamiento
    console.log('📊 Dashboard - Procesando datos:', {
      totalReservas: reservasDelMes.length,
      mesActual: this.mesActual.getMonth() + 1 + '/' + this.mesActual.getFullYear()
    });

    // Calcular ingresos
    let totalIngresos = 0;
    let ingresosCompletos = 0;
    let ingresosParciales = 0;
    let reservasCompletas = 0;
    let reservasParciales = 0;
    let reservasSinPago = 0;

    reservasDelMes.forEach(reserva => {
      const montoPagado = reserva.montoPagado || 0;
      const precioTotal = reserva.precioTotal || 0;

      totalIngresos += montoPagado;

      if (reserva.estaCompletamentePagado) {
        ingresosCompletos += montoPagado;
        reservasCompletas++;
      } else if (montoPagado > 0) {
        ingresosParciales += montoPagado;
        reservasParciales++;
      } else {
        reservasSinPago++;
      }
    });

    // Calcular ingresos por día
    const ingresosPorDia = this.calcularIngresosPorDia(reservasDelMes);

    // Calcular ingresos por tipo de habitación
    this.ingresosPorTipo = this.calcularIngresosPorTipo(reservasDelMes);

    // Calcular ingresos por habitación individual (Nuevo reporte)
    this.ingresosPorHabitacion = this.calcularIngresosPorHabitacion(reservasDelMes);

    // Obtener reservas recientes (últimas 5)
    // Ordenar correctamente por fecha de creación descendente
    const reservasRecientes = [...reservasDelMes]
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);

    this.resumen = {
      totalIngresos,
      ingresosCompletos,
      ingresosParciales,
      totalReservas: reservasDelMes.length,
      reservasCompletas,
      reservasParciales,
      reservasSinPago,
      promedioPorReserva: reservasDelMes.length > 0 ? totalIngresos / reservasDelMes.length : 0,
      ingresosPorDia,
      reservasRecientes
    };
  }

  private calcularIngresosPorDia(reservas: Reserva[]): { fecha: string, ingresos: number }[] {
    const ingresosPorDia: { [key: string]: number } = {};

    reservas.forEach(reserva => {
      const fecha = reserva.fechaEntrada.split('T')[0];
      const montoPagado = reserva.montoPagado || 0;

      if (ingresosPorDia[fecha]) {
        ingresosPorDia[fecha] += montoPagado;
      } else {
        ingresosPorDia[fecha] = montoPagado;
      }
    });

    return Object.entries(ingresosPorDia)
      .map(([fecha, ingresos]) => ({ fecha, ingresos }))
      .sort((a, b) => this.dateTimeService.stringToDate(a.fecha).getTime() - this.dateTimeService.stringToDate(b.fecha).getTime());
  }

  private calcularIngresosPorTipo(reservas: Reserva[]): IngresosPorTipo[] {
    const ingresosPorTipo: { [key: string]: { cantidad: number, ingresos: number } } = {};

    reservas.forEach(reserva => {
      const tipo = typeof reserva.habitacion === 'object' ?
        (reserva.habitacion as any).tipo : 'Desconocido';
      const montoPagado = reserva.montoPagado || 0;

      if (ingresosPorTipo[tipo]) {
        ingresosPorTipo[tipo].cantidad++;
        ingresosPorTipo[tipo].ingresos += montoPagado;
      } else {
        ingresosPorTipo[tipo] = { cantidad: 1, ingresos: montoPagado };
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

  private calcularIngresosPorHabitacion(reservas: Reserva[]): IngresosPorHabitacion[] {
    const ingresosMap: { [key: string]: { cantidad: number, ingresos: number } } = {};

    reservas.forEach(reserva => {
      const numero = typeof reserva.habitacion === 'object' ?
        (reserva.habitacion as any).numero : 'N/A';
      const montoPagado = reserva.montoPagado || 0;

      if (ingresosMap[numero]) {
        ingresosMap[numero].cantidad++;
        ingresosMap[numero].ingresos += montoPagado;
      } else {
        ingresosMap[numero] = { cantidad: 1, ingresos: montoPagado };
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
      .sort((a, b) => b.ingresos - a.ingresos); // Ordenar por ingresos descendente
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
      ['Promedio Mensual', this.resumenAnual.promedioMensual],
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
}