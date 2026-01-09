import { Component, Inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ReservaService } from '../../services/reserva.service';
import { ClienteService } from '../../services/cliente.service';
import { HabitacionService } from '../../services/habitacion.service';
import { ReservaCreate, ReservaUpdate } from '../../models/reserva.model';
import { Cliente } from '../../models/cliente.model';
import { Habitacion } from '../../models/habitacion.model';
import { Reserva } from '../../models/reserva.model';

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
  selector: 'app-detalle-reserva',
  templateUrl: './detalle-reserva.component.html',
  styleUrls: ['./detalle-reserva.component.css'],
  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatIconModule,
    MatChipsModule,
    MatCheckboxModule,
    MatButtonModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    MatTabsModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    FormsModule,
    DatePipe
  ],
  standalone: true,
  providers: [
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMAT },
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' },
    DatePipe
  ]
})
export class DetalleReservaComponent implements OnInit {
  form: FormGroup;
  cliente: Cliente | null = null;
  habitacion: Habitacion | null = null;
  estados: string[] = ['Pendiente', 'Confirmada', 'En curso', 'Finalizada', 'Cancelada', 'No Show'];
  metodosPago: string[] = ['Efectivo', 'Tarjeta', 'Transferencia', 'Otro'];
  enEdicion = false;
  cargando = false;
  @Input() reserva: Reserva | null = null;

  // Split Reservation Properties
  modoDivision = false;
  fechaDivision: Date | null = null;
  habitacionDestinoId: string | null = null;
  habitacionesDisponiblesDivision: Habitacion[] = [];
  cargandoHabitaciones = false;

  get estadosReserva(): string[] {
    return this.estados;
  }

  get editando(): boolean {
    return this.enEdicion;
  }

  constructor(
    private fb: FormBuilder,
    private reservasService: ReservaService,
    private clienteService: ClienteService,
    private habitacionService: HabitacionService,
    private snackBar: MatSnackBar,
    private datePipe: DatePipe,
    @Inject(MAT_DIALOG_DATA) public data: { reserva?: Reserva; fechaSeleccionada?: Date; nuevaReserva?: boolean } = {},
    private dialogRef: MatDialogRef<DetalleReservaComponent>
  ) {
    if (data.reserva) {
      this.reserva = data.reserva;
    }

    this.form = this.fb.group({
      cliente: [null, Validators.required],
      habitacion: [null, Validators.required],
      fechaEntrada: [data.fechaSeleccionada || new Date(), Validators.required],
      fechaSalida: [new Date(new Date().setDate(new Date().getDate() + 1)), Validators.required],
      horaEntrada: ['14:00', Validators.required],
      horaSalida: ['11:00', Validators.required],
      precio: [0, [Validators.required, Validators.min(0)]],
      estado: ['Pendiente', Validators.required],
      metodoPago: ['Efectivo', Validators.required],
      pagado: [false],
      observaciones: ['']
    });

    if (data.nuevaReserva) {
      this.enEdicion = true;
    }
  }

  ngOnInit(): void {
    console.log('DetalleReservaComponent init - Version Split Button'); // Verify update
    if (this.reserva) {
      this.cargarDatosReserva();
    }
  }

  cargarDatosReserva() {
    if (!this.reserva) return;

    console.log('🔍 Cargando datos de reserva:', this.reserva);
    console.log('🛏️ Configuración de camas:', this.reserva.configuracionCamas);
    console.log('🚗 Información de transporte:', this.reserva.informacionTransporte);
    console.log('♿ Necesidades especiales:', this.reserva.necesidadesEspeciales);

    this.form.patchValue({
      cliente: this.reserva.cliente,
      habitacion: this.reserva.habitacion,
      fechaEntrada: this.reserva.fechaEntrada,
      fechaSalida: this.reserva.fechaSalida,
      horaEntrada: this.reserva.horaEntrada,
      horaSalida: this.reserva.horaSalida,
      precio: this.reserva.precioPorNoche,
      estado: this.reserva.estado,
      metodoPago: this.reserva.metodoPago,
      pagado: this.reserva.pagado,
      observaciones: this.reserva.observaciones
    });

    if (typeof this.reserva.cliente === 'string') {
      this.clienteService.getCliente(this.reserva.cliente).subscribe(c => this.cliente = c);
    } else {
      this.cliente = this.reserva.cliente as any;
    }

    if (typeof this.reserva.habitacion === 'string') {
      this.habitacionService.getHabitacion(this.reserva.habitacion).subscribe(h => this.habitacion = h);
    } else {
      this.habitacion = this.reserva.habitacion as any;
    }
  }

  getPrecioPorNoche(): string {
    const val = this.form.get('precio')?.value || 0;
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);
  }

  getPrecioTotal(): string {
    const precio = this.form.get('precio')?.value || 0;
    const entrada = this.form.get('fechaEntrada')?.value;
    const salida = this.form.get('fechaSalida')?.value;

    if (entrada && salida) {
      const diffTime = Math.abs(new Date(salida).getTime() - new Date(entrada).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const total = precio * (diffDays || 1);
      return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(total);
    }
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(0);
  }

  getTipoCamaLabel(tipo: string): string {
    const tipos: { [key: string]: string } = {
      matrimonial: 'Matrimonial',
      single: 'Single',
      doble: 'Doble',
      queen: 'Queen',
      king: 'King'
    };
    return tipos[tipo] || tipo;
  }

  getTransporteLabel(tipo?: string): string {
    const tipos: { [key: string]: string } = {
      vehiculo_propio: 'Vehículo propio',
      colectivo: 'Colectivo',
      taxi: 'Taxi',
      otro: 'Otro'
    };
    return tipo ? (tipos[tipo] || tipo) : 'No especificado';
  }

  mostrarExito(mensaje: string) {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      panelClass: ['snackbar-success']
    });
  }

  mostrarError(mensaje: string) {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      panelClass: ['snackbar-error']
    });
  }

  // ==========================================
  // Lógica para Dividir Reserva / Cambio de Habitación
  // ==========================================

  activarDivision() {
    this.modoDivision = true;
    this.enEdicion = false;
    if (this.reserva?.fechaEntrada) {
      const fecha = new Date(this.reserva.fechaEntrada);
      fecha.setDate(fecha.getDate() + 1);
      this.fechaDivision = fecha;
      this.buscarHabitacionesDivision();
    }
  }

  cancelarDivision() {
    this.modoDivision = false;
    this.fechaDivision = null;
    this.habitacionDestinoId = null;
    this.habitacionesDisponiblesDivision = [];
  }

  onFechaDivisionChange(event: any) {
    this.fechaDivision = event.value;
    this.buscarHabitacionesDivision();
  }

  buscarHabitacionesDivision() {
    if (!this.reserva || !this.fechaDivision) return;

    const fechaEntrada = new Date(this.reserva.fechaEntrada);
    const fechaSalida = new Date(this.reserva.fechaSalida);

    fechaEntrada.setHours(0, 0, 0, 0);
    fechaSalida.setHours(0, 0, 0, 0);
    const fechaDiv = new Date(this.fechaDivision);
    fechaDiv.setHours(0, 0, 0, 0);

    if (fechaDiv <= fechaEntrada || fechaDiv >= fechaSalida) {
      this.habitacionesDisponiblesDivision = [];
      this.snackBar.open('La fecha de cambio debe estar entre la entrada y la salida actual', 'Cerrar', { duration: 3000 });
      return;
    }

    this.cargandoHabitaciones = true;

    const year = fechaDiv.getFullYear();
    const month = ('0' + (fechaDiv.getMonth() + 1)).slice(-2);
    const day = ('0' + fechaDiv.getDate()).slice(-2);
    const startStr = `${year}-${month}-${day}`;

    const endYear = fechaSalida.getFullYear();
    const endMonth = ('0' + (fechaSalida.getMonth() + 1)).slice(-2);
    const endDay = ('0' + fechaSalida.getDate()).slice(-2);
    const endStr = `${endYear}-${endMonth}-${endDay}`;

    this.habitacionService.getHabitacionesDisponibles(startStr, endStr).subscribe({
      next: (disponibles) => {
        this.habitacionesDisponiblesDivision = disponibles;
        this.cargandoHabitaciones = false;
      },
      error: (err) => {
        console.error('Error cargando habitaciones', err);
        this.cargandoHabitaciones = false;
        this.snackBar.open('Error al buscar disponibilidad', 'Cerrar', { duration: 3000 });
      }
    });
  }

  confirmarDivision() {
    if (!this.reserva || !this.fechaDivision || !this.habitacionDestinoId) return;

    this.cargando = true;
    const year = this.fechaDivision.getFullYear();
    const month = ('0' + (this.fechaDivision.getMonth() + 1)).slice(-2);
    const day = ('0' + this.fechaDivision.getDate()).slice(-2);
    const fechaLocalStr = `${year}-${month}-${day}`;

    this.reservasService.dividirReserva(this.reserva._id!, fechaLocalStr, this.habitacionDestinoId).subscribe({
      next: (res) => {
        this.snackBar.open('Reserva dividida exitosamente', 'Cerrar', { duration: 3000 });
        this.cargando = false;
        this.modoDivision = false;
        if (this.dialogRef) {
          this.dialogRef.close(true);
        }
      },
      error: (err) => {
        console.error('Error dividiendo reserva', err);
        this.snackBar.open(err.error?.message || 'Error al dividir la reserva', 'Cerrar', { duration: 5000 });
        this.cargando = false;
      }
    });
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  toggleEdicion(): void {
    this.enEdicion = !this.enEdicion;
  }

  realizarCheckIn(): void {
    if (!this.reserva || this.cargando) return;
    this.cargando = true;
    this.reservasService.updateEstado(this.reserva._id, 'En curso').subscribe({
      next: (reservaActualizada) => {
        this.reserva = reservaActualizada;
        this.mostrarExito('Check-in realizado exitosamente');
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al realizar check-in:', error);
        this.mostrarError('Error al realizar check-in');
        this.cargando = false;
      }
    });
  }

  realizarCheckOut(): void {
    if (!this.reserva || this.cargando) return;
    this.cargando = true;
    this.reservasService.checkOut(this.reserva._id).subscribe({
      next: (reservaActualizada) => {
        this.reserva = reservaActualizada;
        this.mostrarExito('Check-out realizado exitosamente');
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al realizar check-out:', error);
        this.mostrarError('Error al realizar check-out');
        this.cargando = false;
      }
    });
  }

  cancelarReserva(): void {
    if (!this.reserva || this.cargando) return;
    this.cargando = true;
    this.reservasService.updateEstado(this.reserva._id, 'Cancelada').subscribe({
      next: (reservaActualizada) => {
        this.reserva = reservaActualizada;
        this.mostrarExito('Reserva cancelada exitosamente');
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cancelar reserva:', error);
        this.mostrarError('Error al cancelar la reserva');
        this.cargando = false;
      }
    });
  }

  guardar(): void {
    if (!this.form.valid) {
      this.mostrarError('Por favor, complete todos los campos requeridos');
      return;
    }

    this.cargando = true;
    const valores = this.form.value;

    const reservaData: ReservaCreate = {
      cliente: valores.cliente,
      habitacion: valores.habitacion,
      fechaEntrada: valores.fechaEntrada,
      fechaSalida: valores.fechaSalida,
      horaEntrada: valores.horaEntrada,
      horaSalida: valores.horaSalida,
      precioPorNoche: valores.precio,
      estado: valores.estado,
      metodoPago: valores.metodoPago,
      pagado: valores.pagado,
      observaciones: valores.observaciones
    };

    if (!this.reserva) {
      this.reservasService.createReserva(reservaData).subscribe({
        next: (nuevaReserva: Reserva) => {
          this.mostrarExito('Reserva creada exitosamente');
          this.dialogRef.close({ success: true, action: 'create', reserva: nuevaReserva });
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error al crear reserva:', error);
          this.mostrarError('Error al crear la reserva');
          this.cargando = false;
        }
      });
    } else {
      this.reservasService.updateReserva(this.reserva._id!, reservaData).subscribe({
        next: (reservaActualizada: Reserva) => {
          this.mostrarExito('Reserva actualizada exitosamente');
          this.dialogRef.close({ success: true, action: 'update', reserva: reservaActualizada });
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error al actualizar reserva:', error);
          this.mostrarError('Error al actualizar la reserva');
          this.cargando = false;
        }
      });
    }
  }

  imprimirReserva(): void {
    if (!this.reserva) return;

    const contenidoImpresion = `
      ========================================
      RESERVA DEL HOSTAL
      ========================================
      
      Cliente: ${this.cliente?.nombre} ${this.cliente?.apellido}
      Teléfono: ${this.cliente?.telefono}
      Documento: ${this.cliente?.documento}
      
      Habitación: ${this.habitacion?.numero} (${this.habitacion?.tipo})
      Capacidad: ${this.habitacion?.capacidad} personas
      
      Entrada: ${this.form.get('fechaEntrada')?.value ? this.datePipe.transform(this.form.get('fechaEntrada')?.value, 'dd/MM/yyyy') : 'N/A'} a las ${this.form.get('horaEntrada')?.value || '14:00'}
      Salida: ${this.form.get('fechaSalida')?.value ? this.datePipe.transform(this.form.get('fechaSalida')?.value, 'dd/MM/yyyy') : 'N/A'} a las ${this.form.get('horaSalida')?.value || '11:00'}
      
      Precio por noche: ${this.getPrecioPorNoche()}
      Total: ${this.getPrecioTotal()}
      
      Estado: ${this.reserva?.estado}
      Pagado: ${this.reserva?.pagado ? 'SÍ' : 'NO'}
      
      Fecha de impresión: ${this.formatDateDDMMYYYY(new Date())}
      ========================================
    `;

    const ventanaImpresion = window.open('', '_blank');
    if (ventanaImpresion) {
      ventanaImpresion.document.write(`
        <html>
          <head>
            <title>Reserva del Hostal</title>
            <style>
              body { font-family: monospace; font-size: 12px; margin: 20px; }
              .header { text-align: center; font-weight: bold; margin-bottom: 20px; }
              .info { margin: 10px 0; }
              .total { font-weight: bold; margin-top: 20px; }
            </style>
          </head>
          <body>
            <pre>${contenidoImpresion}</pre>
          </body>
        </html>
      `);
      ventanaImpresion.document.close();
      ventanaImpresion.print();
    }
  }

  private formatDateDDMMYYYY(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  getIconoAccion(accion: string): string {
    const iconos: { [key: string]: string } = {
      'Creación': 'add_circle',
      'Modificación': 'edit',
      'Cambio de Estado': 'swap_horiz',
      'Cancelación': 'cancel',
      'Check-in': 'login',
      'Check-out': 'logout'
    };
    return iconos[accion] || 'info';
  }
}