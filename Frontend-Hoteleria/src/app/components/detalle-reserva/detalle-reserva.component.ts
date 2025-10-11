import { Component, Inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
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
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ReservaService } from '../../services/reserva.service';
import { ClienteService } from '../../services/cliente.service';
import { HabitacionService } from '../../services/habitacion.service';
import { ReservaCreate, ReservaUpdate } from '../../models/reserva.model';
import { Cliente } from '../../models/cliente.model';
import { Habitacion } from '../../models/habitacion.model';
import { Reserva } from '../../models/reserva.model';

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
    DatePipe
  ],
  standalone: true,
  providers: [
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMAT },
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' }
  ]
})
export class DetalleReservaComponent implements OnInit {
  form: FormGroup;
  cliente: Cliente | null = null;
  habitacion: Habitacion | null = null;
  estados: string[] = ['Pendiente', 'Confirmada', 'En curso', 'Completada', 'Cancelada', 'No Show'];
  metodosPago: string[] = ['Efectivo', 'Tarjeta', 'Transferencia', 'Otro'];
  enEdicion = false;
  cargando = false;
  @Input() reserva: Reserva | null = null;
  
  // Alias para compatibilidad con el template
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
    public dialogRef: MatDialogRef<DetalleReservaComponent>
  ) {
    this.form = this.fb.group({
      cliente: ['', Validators.required],
      habitacion: ['', Validators.required],
      fechaEntrada: ['', [Validators.required, this.validarFecha]],
      fechaSalida: ['', [Validators.required]],
      horaEntrada: ['', Validators.required],
      horaSalida: ['', Validators.required],
      precio: ['', [Validators.required, Validators.min(0)]],
      estado: ['', [Validators.required]],
      metodoPago: ['', [Validators.required]],
      pagado: [false],
      observaciones: ['']
    });
  }

  mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 4000,
      panelClass: ['error-snackbar']
    });
  }

  cargarDatosRelacionados(): void {
    try {
      const habitacionCtrl = this.form.get('habitacion');
      const fechaEntradaCtrl = this.form.get('fechaEntrada');
      const fechaSalidaCtrl = this.form.get('fechaSalida');

      if (!habitacionCtrl || !fechaEntradaCtrl || !fechaSalidaCtrl) {
        this.mostrarError('Controles de formulario no encontrados');
        return;
      }

      const habitacionId = habitacionCtrl.value;
      const fechaEntrada = fechaEntradaCtrl.value;
      const fechaSalida = fechaSalidaCtrl.value;

      if (!habitacionId || !fechaEntrada || !fechaSalida) {
        this.mostrarError('Por favor, complete todos los campos necesarios');
        return;
      }

      this.reservasService.checkDisponibilidad(
        habitacionId,
        fechaEntrada,
        fechaSalida,
        this.reserva?._id
      ).subscribe({
        next: (disponible: boolean) => {
          if (disponible) {
            this.guardar();
          } else {
            this.mostrarError('La habitación no está disponible para las fechas seleccionadas');
          }
        },
        error: (error) => {
          console.error('Error al verificar disponibilidad:', error);
          this.mostrarError('Error al verificar disponibilidad de la habitación');
        }
      });
    } catch (error) {
      console.error('Error en cargarDatosRelacionados:', error);
      this.mostrarError('Error al cargar datos relacionados');
    }
  }

  ngOnInit(): void {
    try {
      // Inicializar valores por defecto
      this.cliente = null;
      this.habitacion = null;
      this.reserva = this.data.reserva || null;

      // Si es una nueva reserva, inicializar con la fecha seleccionada
      if (this.data.nuevaReserva && this.data.fechaSeleccionada) {
        const fechaFormateada = this.datePipe.transform(this.data.fechaSeleccionada, 'yyyy-MM-dd');
        if (fechaFormateada) {
          this.form.patchValue({
            fechaEntrada: fechaFormateada,
            fechaSalida: fechaFormateada,
            horaEntrada: '14:00',
            horaSalida: '12:00'
          });
        }
      }

      // Suscribirse a cambios en el formulario
      this.form.valueChanges.subscribe((valores) => {
        this.actualizarDatosRelacionados(valores);
      });

      // Si hay reserva inicial, cargar datos
      if (this.reserva) {
        this.cargarDatosRelacionados();
      }

      // Inicializar suscripciones
      this.inicializarSuscripciones();
    } catch (error: unknown) {
      console.error('Error en ngOnInit:', error);
      this.mostrarError('Error al inicializar el componente');
    }
  }

  inicializarSuscripciones(): void {
    // Suscribirse a cambios en fechaEntrada para validar fechas
    this.form.get('fechaEntrada')?.valueChanges.subscribe(() => {
      this.validarFechas();
    });

    // Suscribirse a cambios en habitación
    this.form.get('habitacion')?.valueChanges.subscribe((habitacionId: string | null) => {
      if (!habitacionId) return;
      
      this.habitacionService.getHabitacion(habitacionId).subscribe({
        next: (habitacion) => {
          if (habitacion) {
            this.habitacion = habitacion;
            this.form.patchValue({ habitacion: habitacion._id });
          }
        },
        error: (error) => {
          console.error('Error al obtener habitación:', error);
          this.mostrarError('Error al cargar la habitación');
        }
      });
    });

    // Suscribirse a cambios en cliente
    this.form.get('cliente')?.valueChanges.subscribe((clienteId: string | null) => {
      if (!clienteId) return;
      
      this.clienteService.getCliente(clienteId).subscribe({
        next: (cliente) => {
          if (cliente) {
            this.cliente = cliente;
            this.form.patchValue({ cliente: cliente });
          }
        },
        error: (error) => {
          console.error('Error al obtener cliente:', error);
          this.mostrarError('Error al cargar el cliente');
        }
      });
    });

    // Suscribirse a cambios en fechaEntrada para cargar datos relacionados
    this.form.get('fechaEntrada')?.valueChanges.subscribe(() => {
      this.cargarDatosRelacionados();
    });
  }

  validarFecha(control: AbstractControl): ValidationErrors | null {
    const fecha = control.value;
    if (!fecha) return null;

    try {
      const fechaActual = new Date();
      const fechaSeleccionada = new Date(fecha);

      if (isNaN(fechaSeleccionada.getTime())) {
        return { fechaInvalida: true };
      }

      if (fechaSeleccionada < fechaActual) {
        return { fechaPasada: true };
      }

      const fechaMaxima = new Date();
      fechaMaxima.setFullYear(fechaActual.getFullYear() + 1);
      if (fechaSeleccionada > fechaMaxima) {
        return { fechaFutura: true };
      }

      if (fechaSeleccionada.toDateString() === fechaActual.toDateString()) {
        return { fechaHoy: true };
      }

    } catch (error) {
      console.error('Error al validar fecha:', error);
      return { fechaInvalida: true };
    }

    return null;
  }

  validarEstado(control: AbstractControl): ValidationErrors | null {
    const estado = control.value;
    if (!estado) return null;

    if (!this.estados.includes(estado)) {
      return { estadoInvalido: true };
    }
    
    return null;
  }

  validarMetodoPago(control: AbstractControl): ValidationErrors | null {
    const metodo = control.value;
    if (!metodo) return null;

    if (!this.metodosPago.includes(metodo)) {
      return { metodoInvalido: true };
    }
    
    return null;
  }

  mostrarExito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      panelClass: ['success-snackbar']
    });
  }

  // Método auxiliar para obtener el precio por noche de manera segura
  getPrecioPorNoche(): string {
    if (!this.reserva || this.reserva.precioPorNoche == null) {
      return 'No especificado';
    }
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(this.reserva.precioPorNoche);
  }

  // Método auxiliar para obtener el precio total de manera segura
  getPrecioTotal(): string {
    if (!this.reserva || this.reserva.precioTotal == null) {
      return 'No especificado';
    }
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(this.reserva.precioTotal);
  }

  validarFechas(): ValidationErrors | null {
    const fechaEntradaCtrl = this.form.get('fechaEntrada');
    const fechaSalidaCtrl = this.form.get('fechaSalida');
    const horaEntradaCtrl = this.form.get('horaEntrada');
    const horaSalidaCtrl = this.form.get('horaSalida');

    if (!fechaEntradaCtrl || !fechaSalidaCtrl || !horaEntradaCtrl || !horaSalidaCtrl) {
      return null;
    }

    const fechaEntrada = fechaEntradaCtrl.value;
    const fechaSalida = fechaSalidaCtrl.value;
    const horaEntrada = horaEntradaCtrl.value;
    const horaSalida = horaSalidaCtrl.value;

    if (!fechaEntrada || !fechaSalida || !horaEntrada || !horaSalida) {
      return null;
    }

    const fechaEntradaCompleta = new Date(`${fechaEntrada}T${horaEntrada}`);
    const fechaSalidaCompleta = new Date(`${fechaSalida}T${horaSalida}`);

    if (fechaEntradaCompleta >= fechaSalidaCompleta) {
      return { fechaInvalida: true };
    }

    return null;
  }

  actualizarDatosRelacionados(valores: any): void {
    try {
      const habitacionCtrl = this.form.get('habitacion');
      const fechaEntradaCtrl = this.form.get('fechaEntrada');
      const fechaSalidaCtrl = this.form.get('fechaSalida');

      if (!habitacionCtrl || !fechaEntradaCtrl || !fechaSalidaCtrl) {
        this.mostrarError('Controles de formulario no encontrados');
        return;
      }

      const habitacionId = habitacionCtrl.value;
      const fechaEntrada = fechaEntradaCtrl.value;
      const fechaSalida = fechaSalidaCtrl.value;

      if (!habitacionId || !fechaEntrada || !fechaSalida) {
        this.mostrarError('Por favor, complete todos los campos necesarios');
        return;
      }

      this.habitacionService.getHabitacion(habitacionId).subscribe({
        next: (habitacion) => {
          if (habitacion) {
            this.habitacion = habitacion;
            this.form.patchValue({ habitacion: habitacion._id });
            this.form.patchValue({
              horaEntrada: '',
              horaSalida: ''
            });
            return;
          }

          // Si la habitación está disponible, cargar datos adicionales
          this.habitacionService.getHabitacion(habitacionId).subscribe({
            next: (habitacion: Habitacion) => {
              this.habitacion = habitacion;
              this.form.patchValue({ habitacion: habitacion._id });
              this.guardar();
            },
            error: (error: unknown) => {
              console.error('Error al obtener habitación:', error);
              this.mostrarError('Error al cargar la habitación');
            }
          });
        },
        error: (error: unknown) => {
          console.error('Error al validar disponibilidad:', error);
          this.mostrarError('Error al validar disponibilidad de la habitación');
        }
      });
    } catch (error: unknown) {
      console.error('Error en actualizarDatosRelacionados:', error);
      this.mostrarError('Error al actualizar datos relacionados');
    }
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  toggleEdicion(): void {
    this.enEdicion = !this.enEdicion;
  }

  actualizarEstado(nuevoEstado: string): void {
    if (!this.reserva || this.cargando) return;

    this.cargando = true;
    this.reservasService.updateEstado(this.reserva._id, nuevoEstado)
      .subscribe({
        next: (reservaActualizada) => {
          this.reserva = reservaActualizada;
          this.mostrarExito(`Estado actualizado a: ${nuevoEstado}`);
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error al actualizar estado:', error);
          this.mostrarError('Error al actualizar el estado de la reserva');
          this.cargando = false;
        }
      });
  }

  obtenerColorEstado(estado: string | undefined): string {
    if (!estado) return '#607D8B'; // Gris por defecto

    switch (estado) {
      case 'Confirmada':
        return this.reserva?.pagado ? '#4CAF50' : '#FF9800'; // Verde si está pagado, naranja si no
      case 'Pendiente':
        return '#FFC107'; // Amarillo
      case 'Cancelada':
        return '#F44336'; // Rojo
      case 'Completada':
        return '#2196F3'; // Azul
      case 'No Show':
        return '#9C27B0'; // Púrpura
      default:
        return '#607D8B'; // Gris
    }
  }

  guardar(): void {
    try {
      this.cargando = true;

      const valores = this.form.value;

      // Validar que todos los campos requeridos estén presentes
      if (!valores.cliente || !valores.habitacion || !valores.fechaEntrada || 
          !valores.fechaSalida || !valores.horaEntrada || !valores.horaSalida || 
          !valores.precio || !valores.estado || !valores.metodoPago) {
        this.mostrarError('Por favor, complete todos los campos requeridos');
        this.cargando = false;
        return;
      }

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

      // Si es una nueva reserva
      if (!this.reserva) {
        this.reservasService.createReserva(reservaData).subscribe({
          next: (nuevaReserva: Reserva) => {
            this.mostrarExito('Reserva creada exitosamente');
            this.dialogRef.close({ success: true, action: 'create', reserva: nuevaReserva });
          },
          error: (error) => {
            console.error('Error al crear reserva:', error);
            this.mostrarError('Error al crear la reserva');
          },
          complete: () => {
            this.cargando = false;
          }
        });
      } else {
        // Si es una actualización
        this.reservasService.updateReserva(this.reserva._id, reservaData).subscribe({
          next: (reservaActualizada: Reserva) => {
            this.mostrarExito('Reserva actualizada exitosamente');
            this.dialogRef.close({ success: true, action: 'update', reserva: reservaActualizada });
          },
          error: (error) => {
            console.error('Error al actualizar reserva:', error);
            this.mostrarError('Error al actualizar la reserva');
          },
          complete: () => {
            this.cargando = false;
          }
        });
      }
    } catch (error: unknown) {
      console.error('Error en guardar:', error);
      this.mostrarError('Error al guardar la reserva');
      this.cargando = false;
    }
  }

  // Método para realizar check-in
  realizarCheckIn(): void {
    if (!this.reserva || this.cargando) return;

    this.cargando = true;
    this.reservasService.updateEstado(this.reserva._id, 'En curso')
      .subscribe({
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

  // Método para realizar check-out
  realizarCheckOut(): void {
    if (!this.reserva || this.cargando) return;

    this.cargando = true;
    this.reservasService.updateEstado(this.reserva._id, 'Completada')
      .subscribe({
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

  // Método para cancelar reserva
  cancelarReserva(): void {
    if (!this.reserva || this.cargando) return;

    this.cargando = true;
    this.reservasService.updateEstado(this.reserva._id, 'Cancelada')
      .subscribe({
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

  // Método para imprimir reserva
  imprimirReserva(): void {
    if (!this.reserva) return;
    
    // Crear contenido para imprimir
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
    
    // Abrir ventana de impresión
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

  // Método auxiliar para formatear fechas en DD/MM/YYYY
  private formatDateDDMMYYYY(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Métodos para obtener labels
  getTipoCamaLabel(tipo: string): string {
    const tipos: { [key: string]: string } = {
      'matrimonial': 'Matrimonial',
      'single': 'Single',
      'doble': 'Doble',
      'queen': 'Queen',
      'king': 'King'
    };
    return tipos[tipo] || tipo;
  }

  getTransporteLabel(tipo: string): string {
    const tipos: { [key: string]: string } = {
      'vehiculo_propio': 'Vehículo Propio',
      'colectivo': 'Colectivo',
      'taxi': 'Taxi',
      'otro': 'Otro'
    };
    return tipos[tipo] || tipo;
  }
}