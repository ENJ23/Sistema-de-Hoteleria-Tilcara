import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormControl, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, NativeDateAdapter } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { SelectorHabitacionesDialogComponent, SelectorHabitacionesData } from '../../shared/components/selector-habitaciones-dialog/selector-habitaciones-dialog.component';
import { Observable, Subject, of, debounceTime, distinctUntilChanged, switchMap, takeUntil, firstValueFrom } from 'rxjs';

import { ReservaService } from '../../services/reserva.service';
import { HabitacionService } from '../../services/habitacion.service';
import { DateTimeService } from '../../services/date-time.service';
import { ReservaCreate, ReservaUpdate, Reserva, CamaInfo, TransporteInfo } from '../../models/reserva.model';
import { Habitacion } from '../../models/habitacion.model';

// DateAdapter personalizado para formato DD/MM/YYYY
export class CustomDateAdapter extends NativeDateAdapter {
  override parse(value: any): Date | null {
    if (typeof value === 'string' && value) {
      // Formato DD/MM/YYYY
      const parts = value.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Los meses van de 0-11
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
    }
    return super.parse(value);
  }

  override format(date: Date, displayFormat: any): string {
    if (displayFormat === 'DD/MM/YYYY') {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return super.format(date, displayFormat);
  }
}

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
  selector: 'app-nueva-reserva',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatDialogModule,
    MatChipsModule
  ],
  templateUrl: './nueva-reserva.component.html',
  styleUrls: ['./nueva-reserva.component.scss'],
  providers: [
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMAT },
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' }
  ]
})
export class NuevaReservaComponent implements OnInit, OnDestroy {
  reservaForm: FormGroup;
  habitaciones: Habitacion[] = [];
  habitacionesDisponibles: Habitacion[] = [];
  habitacionesFiltradas: Observable<Habitacion[]> = of([]);
  
  cargando = false;
  guardando = false;
  fechaSeleccionada?: Date;
  habitacionSeleccionada?: Habitacion;
  modoClic = false;
  
  // Propiedades para modo de edición
  modoEdicion = false;
  reservaId?: string;
  reservaOriginal?: Reserva;
  
  // Estados y tipos
  estadosReserva = ['Confirmada', 'Pendiente', 'En curso', 'Cancelada', 'Completada', 'No Show'];
  metodosPago = ['Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia', 'PayPal'];
  
  // Precios
  precioPorNoche = 0;
  precioTotal = 0;
  numeroNoches = 0;
  
  // Destructor para observables
  private destroy$ = new Subject<void>();
  
  // Referencia al dialog
  private dialogRef?: any;
  
  // Flag para prevenir múltiples aperturas
  private abriendoDialog = false;

  // Getter para el título de la página
  get tituloPagina(): string {
    return this.modoEdicion ? 'Editar Reserva' : 'Nueva Reserva';
  }

  // Getter para el texto del botón de guardar
  get textoBotonGuardar(): string {
    return this.modoEdicion ? 'Actualizar Reserva' : 'Crear Reserva';
  }

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private reservaService: ReservaService,
    private habitacionService: HabitacionService,
    private dateTimeService: DateTimeService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.reservaForm = this.fb.group({
      // Información del cliente (campos obligatorios)
      nombreCliente: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50), Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/)]],
      apellidoCliente: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50), Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/)]],
      emailCliente: ['', [Validators.email]],
      telefonoCliente: ['', [Validators.required, Validators.minLength(7), Validators.maxLength(20), Validators.pattern(/^[0-9+\-\s()]*$/)]],
      documentoCliente: ['', [Validators.minLength(5), Validators.maxLength(20)]],
      direccionCliente: [''],
      nacionalidadCliente: [''],
      
      // Información de la reserva
      habitacion: ['', Validators.required],
      fechaEntrada: ['', [Validators.required, this.validarFechaEntrada.bind(this)]],
      fechaSalida: ['', [Validators.required, this.validarFechaSalida.bind(this)]],
      horaEntrada: ['14:00', [Validators.required, this.validarFormatoHora.bind(this)]],
      horaSalida: ['11:00', [Validators.required, this.validarFormatoHora.bind(this)]],
      precioPorNoche: [0, [Validators.required, Validators.min(0.01)]],
      estado: ['Pendiente', Validators.required],
      pagado: [false],
      metodoPago: [''],
      observaciones: [''],
      
      // Nuevos campos para configuración específica
      configuracionCamas: this.fb.array([]),
      tipoTransporte: [''],
      numeroPlaca: [''],
      empresa: [''],
      detallesTransporte: [''],
      necesidadesEspeciales: ['']
    });
  }

  ngOnInit(): void {
    this.cargarDatosIniciales();
    this.configurarObservadores();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Métodos para manejo de camas
  get camas(): FormArray {
    return this.reservaForm.get('configuracionCamas') as FormArray;
  }

  agregarCama(): void {
    const camaForm = this.fb.group({
      tipo: ['', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]]
    });
    this.camas.push(camaForm);
  }

  eliminarCama(index: number): void {
    this.camas.removeAt(index);
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

  private cargarDatosIniciales(): void {
    this.cargando = true;
    
    // Cargar habitaciones
    this.habitacionService.getHabitaciones(1, 100).subscribe({
      next: (response) => {
        this.habitaciones = response.habitaciones;
        this.cargando = false;
        this.verificarParametrosRuta();
        
        // Después de cargar las habitaciones, verificar si hay habitación pendiente de configurar
        this.route.queryParams.subscribe(params => {
          if (params['habitacion'] && this.habitaciones.length > 0) {
            this.buscarYConfigurarHabitacion(params['habitacion']);
          }
        });
      },
      error: (error) => {
        console.error('Error al cargar habitaciones:', error);
        this.mostrarMensaje('Error al cargar habitaciones', 'error');
        this.cargando = false;
      }
    });
  }

  private configurarObservadores(): void {
    // Observar cambios en las fechas para calcular precio y validar
    this.reservaForm.get('fechaEntrada')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.calcularPrecio();
        this.validarFechasEnTiempoReal();
      });

    this.reservaForm.get('fechaSalida')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.calcularPrecio();
        this.validarFechasEnTiempoReal();
      });

    this.reservaForm.get('precioPorNoche')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calcularPrecio());

    // Observar cambios en habitación para actualizar precio
    this.reservaForm.get('habitacion')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((habitacionId) => {
        if (habitacionId) {
          this.actualizarPrecioHabitacion(habitacionId);
        }
      });

    // Configurar autocompletado para habitaciones
    this.reservaForm.get('habitacion')?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(value => {
          // Si el valor está vacío, mostrar todas las habitaciones
          if (!value || value === '') {
            return of(this.habitaciones);
          }
          
          // Si es un ID válido (24 caracteres hexadecimales), no filtrar
          if (typeof value === 'string' && value.length === 24 && /^[a-f0-9]+$/i.test(value)) {
            return of([]);
          }
          
          // Si es texto de búsqueda, filtrar
          if (typeof value === 'string' && value.trim().length > 0) {
            const habitacionesFiltradas = this.filtrarHabitaciones(value);
            return of(habitacionesFiltradas);
          }
          
          return of([]);
        })
      )
      .subscribe(habitaciones => {
        // Solo actualizar si no estamos en modo clic
        if (!this.modoClic) {
          this.habitacionesFiltradas = of(habitaciones);
        }
      });
  }

  private verificarParametrosRuta(): void {
    this.route.queryParams.subscribe(params => {
      // Verificar si estamos en modo de edición
      if (params['modo'] === 'editar' && params['reservaId']) {
        this.modoEdicion = true;
        this.reservaId = params['reservaId'];
        this.cargarReservaParaEdicion(params['reservaId']);
        return;
      }
      
      // Modo de creación normal
      if (params['fecha']) {
        // DEBUGGING: Logs para diagnosticar el problema
        console.log('🔍 DEBUGGING NUEVA RESERVA:');
        console.log('📅 Fecha recibida como string:', params['fecha']);
        
        this.fechaSeleccionada = this.dateTimeService.stringToDate(params['fecha']);
        console.log('📅 Fecha convertida con stringToDate:', this.fechaSeleccionada);
        console.log('📅 Fecha ISO string:', this.fechaSeleccionada.toISOString());
        console.log('📅 Fecha local string:', this.fechaSeleccionada.toLocaleDateString());
        
        this.reservaForm.patchValue({
          fechaEntrada: this.fechaSeleccionada
        });
        
        console.log('📅 Fecha asignada al formulario:', this.reservaForm.get('fechaEntrada')?.value);
      }
      
      if (params['habitacion']) {
        // Si las habitaciones ya están cargadas, buscar inmediatamente
        if (this.habitaciones.length > 0) {
          this.buscarYConfigurarHabitacion(params['habitacion']);
        } else {
          // Si no están cargadas, guardar el ID para configurarlo después
          this.habitacionSeleccionada = undefined;
          // El ID se configurará cuando se carguen las habitaciones
        }
      }
    });
  }

  private cargarReservaParaEdicion(reservaId: string): void {
    this.cargando = true;
    
    this.reservaService.getReserva(reservaId).subscribe({
      next: (reserva) => {
        this.reservaOriginal = reserva;
        this.precargarDatosReserva(reserva);
        this.cargando = false;
      },
      error: (error) => {
        this.mostrarMensaje('Error al cargar la reserva para edición', 'error');
        this.cargando = false;
        this.router.navigate(['/']);
      }
    });
  }

  private precargarDatosReserva(reserva: Reserva): void {
    // Precargar datos del cliente
    this.reservaForm.patchValue({
      nombreCliente: reserva.cliente.nombre,
      apellidoCliente: reserva.cliente.apellido,
      emailCliente: reserva.cliente.email,
      telefonoCliente: reserva.cliente.telefono,
      documentoCliente: reserva.cliente.documento,
      direccionCliente: reserva.cliente.direccion || '',
      nacionalidadCliente: reserva.cliente.nacionalidad || ''
    });

    // ESTÁNDAR: Precargar datos de la reserva usando métodos estándar
    this.reservaForm.patchValue({
      fechaEntrada: this.dateTimeService.stringToDate(reserva.fechaEntrada),
      fechaSalida: this.dateTimeService.stringToDate(reserva.fechaSalida),
      horaEntrada: reserva.horaEntrada,
      horaSalida: reserva.horaSalida,
      precioPorNoche: reserva.precioPorNoche,
      estado: reserva.estado,
      pagado: reserva.pagado,
      metodoPago: reserva.metodoPago || '',
      observaciones: reserva.observaciones || '',
      // Nuevos campos
      tipoTransporte: reserva.informacionTransporte?.tipo || '',
      numeroPlaca: reserva.informacionTransporte?.numeroPlaca || '',
      empresa: reserva.informacionTransporte?.empresa || '',
      detallesTransporte: reserva.informacionTransporte?.detalles || '',
      necesidadesEspeciales: reserva.necesidadesEspeciales || ''
    });

    // Cargar configuración de camas
    if (reserva.configuracionCamas && reserva.configuracionCamas.length > 0) {
      this.camas.clear();
      reserva.configuracionCamas.forEach(cama => {
        const camaForm = this.fb.group({
          tipo: [cama.tipo, Validators.required],
          cantidad: [cama.cantidad, [Validators.required, Validators.min(1)]]
        });
        this.camas.push(camaForm);
      });
    }

    // Configurar habitación
    const habitacionId = typeof reserva.habitacion === 'string' ? reserva.habitacion : reserva.habitacion._id;
    this.reservaForm.patchValue({
      habitacion: habitacionId
    });

    // Buscar y configurar la habitación seleccionada
    this.habitacionSeleccionada = this.habitaciones.find(h => h._id === habitacionId);
    if (this.habitacionSeleccionada) {
      console.log('🏨 Habitación encontrada para edición:', this.habitacionSeleccionada);
    }

    // Actualizar precio total desde la reserva original
    if (reserva.precioTotal) {
      this.precioTotal = reserva.precioTotal;
      console.log('💰 Precio total precargado:', this.precioTotal);
    }
    
    // Calcular precios (esto actualizará el cálculo local)
    this.calcularPrecio();
    
    console.log('✅ Datos precargados correctamente');
  }


  private buscarYConfigurarHabitacion(habitacionId: string): void {
    this.habitacionSeleccionada = this.habitaciones.find(h => h._id === habitacionId);
    
    if (this.habitacionSeleccionada) {
      this.reservaForm.patchValue({
        habitacion: this.habitacionSeleccionada._id
      });
      this.actualizarPrecioHabitacion(this.habitacionSeleccionada._id);
    } else {
      this.mostrarMensaje(`No se encontró la habitación con ID: ${habitacionId}`, 'error');
    }
  }

  private filtrarHabitaciones(termino: string): Habitacion[] {
    const terminoLower = termino.toLowerCase();
    return this.habitaciones.filter(hab => 
      hab.numero.toLowerCase().includes(terminoLower) ||
      hab.tipo.toLowerCase().includes(terminoLower) ||
      hab.estado.toLowerCase().includes(terminoLower)
    );
  }

  private actualizarPrecioHabitacion(habitacionId: string): void {
    const habitacion = this.habitaciones.find(h => h._id === habitacionId);
    if (habitacion) {
      this.precioPorNoche = habitacion.precioActual;
      this.reservaForm.patchValue({
        precioPorNoche: habitacion.precioActual
      });
      this.calcularPrecio();
    }
  }

  private calcularPrecio(): void {
    const fechaEntrada = this.reservaForm.get('fechaEntrada')?.value;
    const fechaSalida = this.reservaForm.get('fechaSalida')?.value;
    const precioPorNoche = this.reservaForm.get('precioPorNoche')?.value;

    if (fechaEntrada && fechaSalida && precioPorNoche) {
      const entrada = new Date(fechaEntrada);
      const salida = new Date(fechaSalida);
      this.numeroNoches = this.dateTimeService.calculateDaysDifference(entrada, salida);
      
      if (this.numeroNoches > 0) {
        this.precioTotal = this.numeroNoches * precioPorNoche;
      } else {
        this.precioTotal = 0;
      }
    }
  }

  // Método para obtener el texto de la habitación seleccionada
  getHabitacionSeleccionadaTexto(): string {
    if (this.habitacionSeleccionada) {
      return `${this.habitacionSeleccionada.numero} - ${this.habitacionSeleccionada.tipo} (${this.habitacionSeleccionada.estado})`;
    }
    return '';
  }

  // Métodos para autocompletado
  mostrarNombreHabitacion(habitacion: Habitacion | string): string {
    // Si las habitaciones aún no están cargadas, retornar string vacío
    if (!this.habitaciones || this.habitaciones.length === 0) {
      return '';
    }
    
    if (typeof habitacion === 'string') {
      // Si es un ID, buscar la habitación completa
      const habitacionCompleta = this.habitaciones.find(h => h._id === habitacion);
      if (habitacionCompleta) {
        return `${habitacionCompleta.numero} - ${habitacionCompleta.tipo} (${habitacionCompleta.estado})`;
      }
      // Si no se encuentra, intentar con la habitación seleccionada
      if (this.habitacionSeleccionada && this.habitacionSeleccionada._id === habitacion) {
        return `${this.habitacionSeleccionada.numero} - ${this.habitacionSeleccionada.tipo} (${this.habitacionSeleccionada.estado})`;
      }
      return ''; // Retornar string vacío si no se encuentra
    }
    
    if (habitacion && habitacion._id) {
      return `${habitacion.numero} - ${habitacion.tipo} (${habitacion.estado})`;
    }
    
    return '';
  }

  // Método para mostrar todas las habitaciones
  mostrarTodasHabitaciones(): void {
    console.log('🔄 Mostrando todas las habitaciones');
    this.habitacionesFiltradas = of(this.habitaciones);
  }

  // Método para manejar el clic en el campo de habitación
  onHabitacionClick(): void {
    console.log('=== CLIC EN CAMPO HABITACIÓN ===');
    console.log('Habitaciones disponibles:', this.habitaciones.length);
    
    // Activar modo clic para evitar que el observador sobrescriba
    this.modoClic = true;
    
    // Mostrar todas las habitaciones cuando se hace clic
    this.mostrarTodasHabitaciones();
    
    // Desactivar modo clic después de un breve delay
    setTimeout(() => {
      this.modoClic = false;
      console.log('=== FIN CLIC ===');
    }, 100);
  }

  // Método para manejar la selección de una habitación
  onHabitacionSeleccionada(event: any): void {
    console.log('=== SELECCIÓN DE HABITACIÓN ===');
    console.log('Evento completo:', event);
    console.log('Evento option:', event.option);
    console.log('Valor de la habitación seleccionada:', event.option.value);
    
    const habitacionId = event.option.value;
    console.log('Habitación ID extraído:', habitacionId);
    
    // Buscar la habitación completa
    const habitacionCompleta = this.habitaciones.find(h => h._id === habitacionId);
    console.log('Habitación encontrada:', habitacionCompleta);
    
    if (habitacionCompleta) {
      // Configurar la habitación seleccionada
      this.habitacionSeleccionada = habitacionCompleta;
      
      // Actualizar el precio de la habitación seleccionada
      this.actualizarPrecioHabitacion(habitacionId);
      
      // Asegurar que el formulario tenga el valor correcto
      this.reservaForm.patchValue({
        habitacion: habitacionId
      });
      
      console.log('✅ Habitación seleccionada y configurada:', habitacionCompleta);
    }
    
    // Cerrar el autocompletado después de un breve delay
    setTimeout(() => {
      this.habitacionesFiltradas = of([]);
      console.log('=== FIN SELECCIÓN ===');
    }, 100);
  }

  // Métodos para el dialog de selección de habitaciones
  abrirSelectorHabitaciones(): void {
    // Evitar abrir múltiples dialogs
    if (this.dialogRef || this.abriendoDialog) {
      console.log('⚠️ Dialog ya está abierto o abriéndose, ignorando nueva apertura');
      return;
    }

    this.abriendoDialog = true;
    console.log('🔍 Abriendo selector de habitaciones');
    console.log('Habitaciones disponibles:', this.habitaciones.length);
    
    const dialogData: SelectorHabitacionesData = {
      habitaciones: this.habitaciones,
      habitacionSeleccionada: this.habitacionSeleccionada
    };
    
    this.dialogRef = this.dialog.open(SelectorHabitacionesDialogComponent, {
      width: '800px',
      maxHeight: '80vh',
      disableClose: false,
      data: dialogData
    });

    this.dialogRef.afterClosed().subscribe((result: Habitacion | undefined) => {
      console.log('Dialog cerrado con resultado:', result);
      this.dialogRef = null; // Limpiar referencia
      this.abriendoDialog = false; // Resetear flag
      if (result) {
        this.confirmarSeleccionHabitacion(result);
      }
    });
  }

  cerrarSelectorHabitaciones(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = null; // Limpiar referencia
      this.abriendoDialog = false; // Resetear flag
    }
  }

  seleccionarHabitacion(habitacion: Habitacion): void {
    console.log('🏨 Seleccionando habitación:', habitacion);
    this.habitacionSeleccionada = habitacion;
  }

  confirmarSeleccionHabitacion(habitacion: Habitacion): void {
    console.log('✅ Confirmando selección de habitación:', habitacion);
    
    // Configurar la habitación seleccionada
    this.habitacionSeleccionada = habitacion;
    
    // Actualizar el formulario
    this.reservaForm.patchValue({
      habitacion: habitacion._id
    });
    
    // Actualizar el precio
    this.actualizarPrecioHabitacion(habitacion._id);
    
    // Mostrar mensaje de confirmación
    this.mostrarMensaje(`Habitación ${habitacion.numero} seleccionada`, 'success');
  }

  // Validación en tiempo real
  private validarFechasEnTiempoReal(): void {
    const fechaEntrada = this.reservaForm.get('fechaEntrada')?.value;
    const fechaSalida = this.reservaForm.get('fechaSalida')?.value;
    
    if (fechaEntrada && fechaSalida) {
      const entrada = new Date(fechaEntrada);
      const salida = new Date(fechaSalida);
      const hoy = this.dateTimeService.getCurrentDate();
      hoy.setHours(0, 0, 0, 0);
      
      // Validar fecha de entrada
      if (!this.modoEdicion && entrada < hoy) {
        this.reservaForm.get('fechaEntrada')?.setErrors({ fechaAnterior: true });
      } else {
        this.reservaForm.get('fechaEntrada')?.setErrors(null);
      }
      
      // Validar fecha de salida
      if (salida <= entrada) {
        this.reservaForm.get('fechaSalida')?.setErrors({ fechaInvalida: true });
      } else {
        this.reservaForm.get('fechaSalida')?.setErrors(null);
      }
    }
  }

  // Validadores personalizados
  validarFechaEntrada(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    // En modo edición permitimos fecha de entrada anterior a hoy (reserva en curso)
    if (this.modoEdicion) return null;

    const fecha = new Date(control.value);
    const hoy = this.dateTimeService.getCurrentDate();
    hoy.setHours(0, 0, 0, 0);
    
    if (fecha < hoy) {
      return { fechaAnterior: true };
    }
    
    return null;
  }

  validarFechaSalida(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const fechaSalida = new Date(control.value);
    const fechaEntrada = this.reservaForm?.get('fechaEntrada')?.value;
    
    if (fechaEntrada) {
      const fechaEntradaDate = new Date(fechaEntrada);
      if (fechaSalida <= fechaEntradaDate) {
        return { fechaInvalida: true };
      }
    }
    
    return null;
  }

  validarFormatoHora(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const horaRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!horaRegex.test(control.value)) {
      return { formatoHoraInvalido: true };
    }
    
    return null;
  }

  // Validaciones
  validarFechas(): boolean {
    const fechaEntrada = this.reservaForm.get('fechaEntrada')?.value;
    const fechaSalida = this.reservaForm.get('fechaSalida')?.value;
    
    if (fechaEntrada && fechaSalida) {
      const entrada = new Date(fechaEntrada);
      const salida = new Date(fechaSalida);
      const hoy = this.dateTimeService.getCurrentDate();
      hoy.setHours(0, 0, 0, 0);
      
      // Validar que la fecha de entrada no sea anterior a hoy (solo creación)
      if (!this.modoEdicion) {
        if (entrada < hoy) {
          this.reservaForm.get('fechaEntrada')?.setErrors({ fechaAnterior: true });
          this.mostrarMensaje('📅 La fecha de entrada no puede ser anterior a hoy', 'error');
          return false;
        } else {
          this.reservaForm.get('fechaEntrada')?.setErrors(null);
        }
      }
      
      // Validar que la fecha de salida sea posterior a la entrada
      if (salida <= entrada) {
        this.reservaForm.get('fechaSalida')?.setErrors({ fechaInvalida: true });
        this.mostrarMensaje('📅 La fecha de salida debe ser posterior a la fecha de entrada', 'error');
        return false;
      } else {
        this.reservaForm.get('fechaSalida')?.setErrors(null);
      }
      
      return true;
    }
    
    return false;
  }

  async verificarDisponibilidad(): Promise<boolean> {
    const habitacionId = this.reservaForm.get('habitacion')?.value;
    const fechaEntrada = this.reservaForm.get('fechaEntrada')?.value;
    const fechaSalida = this.reservaForm.get('fechaSalida')?.value;
    
    if (habitacionId && fechaEntrada && fechaSalida) {
      try {
        // Usar el método checkDisponibilidad que está implementado en el servicio
        const disponible = await firstValueFrom(this.reservaService.checkDisponibilidad(
          habitacionId, 
          fechaEntrada instanceof Date ? this.dateTimeService.dateToString(fechaEntrada) : fechaEntrada,
          fechaSalida instanceof Date ? this.dateTimeService.dateToString(fechaSalida) : fechaSalida,
          this.modoEdicion ? this.reservaId : undefined
        ));
        
        if (!disponible) {
          this.mostrarMensaje('🚫 La habitación no está disponible para las fechas seleccionadas. Por favor, seleccione otras fechas o una habitación diferente.', 'error');
          return false;
        }
        
        return true;
      } catch (error: any) {
        console.error('Error al verificar disponibilidad:', error);
        
        // Si es un error 500, 403 o 404, puede ser que el endpoint no exista o haya problemas
        if (error.status === 500 || error.status === 403 || error.status === 404) {
          this.mostrarMensaje('⚠️ Advertencia: No se pudo verificar la disponibilidad. Continuando con la reserva...', 'info');
          return true;
        }
        
        this.mostrarMensaje('🔍 Error al verificar disponibilidad de la habitación. Por favor, intente nuevamente.', 'error');
        return false;
      }
    }
    
    return true; // Si no hay datos suficientes, permitir continuar
  }

  async guardarReserva(): Promise<void> {
    // Marcar todos los campos como tocados para mostrar errores
    this.marcarTodosLosCamposComoTocados();
    
    // Validación específica de campos obligatorios
    const erroresFaltantes = this.validarCamposObligatorios();
    if (erroresFaltantes.length > 0) {
      this.mostrarMensaje(`❌ Complete los siguientes campos: ${erroresFaltantes.join(', ')}`, 'error');
      return;
    }
    
    if (this.reservaForm.invalid) {
      this.mostrarMensaje('❌ Por favor, corrija los errores mostrados en el formulario', 'error');
      return;
    }

    if (!this.validarFechas()) {
      return;
    }

    // Verificar disponibilidad antes de crear/actualizar la reserva
    const disponibilidadVerificada = await this.verificarDisponibilidad();
    if (!disponibilidadVerificada) {
      this.guardando = false;
      return;
    }

    this.guardando = true;

    // Crear la reserva con los datos del cliente embebidos
    const metodoPagoValue = this.reservaForm.get('metodoPago')?.value;
    const observacionesValue = this.reservaForm.get('observaciones')?.value;
    
    // Preparar datos con validaciones y formateo
    const fechaEntrada = this.reservaForm.get('fechaEntrada')?.value;
    const fechaSalida = this.reservaForm.get('fechaSalida')?.value;
    const horaEntrada = this.reservaForm.get('horaEntrada')?.value;
    const horaSalida = this.reservaForm.get('horaSalida')?.value;
    const precioPorNoche = this.reservaForm.get('precioPorNoche')?.value;
    
    
    // Validar que las fechas sean válidas
    if (!fechaEntrada || !fechaSalida) {
      this.mostrarMensaje('📅 Las fechas de entrada y salida son obligatorias', 'error');
      return;
    }
    
    // Validar que el precio sea válido
    if (!precioPorNoche || precioPorNoche <= 0) {
      this.mostrarMensaje('💰 El precio por noche debe ser mayor a $0', 'error');
      return;
    }
    
    // Validar formato de horas
    const horaEntradaRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    const horaSalidaRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (horaEntrada && !horaEntradaRegex.test(horaEntrada)) {
      this.mostrarMensaje('🕐 Formato de hora de entrada inválido. Use formato HH:MM (24 horas)', 'error');
      return;
    }
    
    if (horaSalida && !horaSalidaRegex.test(horaSalida)) {
      this.mostrarMensaje('🕐 Formato de hora de salida inválido. Use formato HH:MM (24 horas)', 'error');
      return;
    }
    
    // DEBUGGING: Logs para diagnosticar el problema
    console.log('🔍 DEBUGGING GUARDAR RESERVA:');
    console.log('📅 Fecha entrada del formulario:', fechaEntrada);
    console.log('📅 Fecha salida del formulario:', fechaSalida);
    console.log('📅 Tipo fecha entrada:', typeof fechaEntrada);
    console.log('📅 Tipo fecha salida:', typeof fechaSalida);
    
    const fechaEntradaFormateada = fechaEntrada instanceof Date ? 
      this.dateTimeService.dateToString(fechaEntrada) : fechaEntrada;
    const fechaSalidaFormateada = fechaSalida instanceof Date ? 
      this.dateTimeService.dateToString(fechaSalida) : fechaSalida;
    
    console.log('📅 Fecha entrada formateada:', fechaEntradaFormateada);
    console.log('📅 Fecha salida formateada:', fechaSalidaFormateada);
    
    // Preparar configuración de camas
    const configuracionCamas: CamaInfo[] = this.camas.controls
      .filter(cama => cama.get('tipo')?.value && cama.get('cantidad')?.value)
      .map(cama => ({
        tipo: cama.get('tipo')?.value,
        cantidad: cama.get('cantidad')?.value
      }));

    // Preparar información de transporte
    const tipoTransporte = this.reservaForm.get('tipoTransporte')?.value;
    const informacionTransporte: TransporteInfo | undefined = tipoTransporte && tipoTransporte.trim() !== '' ? {
      tipo: tipoTransporte,
      numeroPlaca: this.reservaForm.get('numeroPlaca')?.value?.trim() || undefined,
      empresa: this.reservaForm.get('empresa')?.value?.trim() || undefined,
      detalles: this.reservaForm.get('detallesTransporte')?.value?.trim() || undefined
    } : undefined;

    // DEBUGGING: Ver qué datos se están preparando
    console.log('🔍 DEBUGGING FRONTEND - Configuración de camas preparada:', configuracionCamas);
    console.log('🔍 DEBUGGING FRONTEND - Información de transporte preparada:', informacionTransporte);
    console.log('🔍 DEBUGGING FRONTEND - Necesidades especiales:', this.reservaForm.get('necesidadesEspeciales')?.value);

    const reservaData: ReservaCreate = {
      cliente: {
        nombre: this.reservaForm.get('nombreCliente')?.value?.trim() || undefined,
        apellido: this.reservaForm.get('apellidoCliente')?.value?.trim() || undefined,
        email: this.reservaForm.get('emailCliente')?.value?.trim() || undefined,
        telefono: this.reservaForm.get('telefonoCliente')?.value?.trim() || undefined,
        documento: this.reservaForm.get('documentoCliente')?.value?.trim() || undefined,
        direccion: this.reservaForm.get('direccionCliente')?.value?.trim() || undefined,
        nacionalidad: this.reservaForm.get('nacionalidadCliente')?.value?.trim() || undefined
      },
      habitacion: this.reservaForm.get('habitacion')?.value,
      fechaEntrada: fechaEntradaFormateada,
      fechaSalida: fechaSalidaFormateada,
      horaEntrada: horaEntrada || '14:00',
      horaSalida: horaSalida || '11:00',
      precioPorNoche: parseFloat(precioPorNoche),
      estado: this.reservaForm.get('estado')?.value || 'Pendiente',
      pagado: this.reservaForm.get('pagado')?.value || false,
      metodoPago: metodoPagoValue && metodoPagoValue.trim() !== '' ? metodoPagoValue : undefined,
      observaciones: observacionesValue && observacionesValue.trim() !== '' ? observacionesValue : undefined,
      // Nuevos campos - solo enviar si tienen contenido
      configuracionCamas: configuracionCamas.length > 0 ? configuracionCamas : undefined,
      informacionTransporte: informacionTransporte,
      necesidadesEspeciales: this.reservaForm.get('necesidadesEspeciales')?.value?.trim() || undefined
    };

    // DEBUGGING: Ver el objeto completo que se va a enviar
    console.log('🔍 DEBUGGING FRONTEND - Objeto completo a enviar:', reservaData);

    if (this.modoEdicion && this.reservaId) {
      // Modo de edición
      this.actualizarReserva(reservaData);
    } else {
      // Modo de creación
      this.crearReserva(reservaData);
    }
  }

  private crearReserva(reservaData: ReservaCreate): void {
    console.log('=== CREANDO NUEVA RESERVA ===');
    console.log('Datos:', reservaData);

    this.reservaService.createReserva(reservaData).subscribe({
      next: (reserva) => {
        this.mostrarMensaje('Reserva creada exitosamente', 'success');
        this.router.navigate(['/'], { 
          queryParams: { 
            reservaCreada: reserva._id,
            mensaje: 'Reserva creada exitosamente'
          }
        });
      },
      error: (error) => {
        console.error('Error al crear reserva:', error);
        this.manejarErrorReserva(error, 'crear');
      }
    });
  }

  private actualizarReserva(reservaData: ReservaCreate): void {
    console.log('=== ACTUALIZANDO RESERVA ===');
    console.log('ID:', this.reservaId);
    console.log('Datos:', reservaData);

    // Convertir ReservaCreate a ReservaUpdate
    const reservaUpdateData: ReservaUpdate = {
      cliente: reservaData.cliente,
      habitacion: reservaData.habitacion,
      fechaEntrada: reservaData.fechaEntrada,
      fechaSalida: reservaData.fechaSalida,
      horaEntrada: reservaData.horaEntrada,
      horaSalida: reservaData.horaSalida,
      precioPorNoche: reservaData.precioPorNoche,
      estado: reservaData.estado,
      pagado: reservaData.pagado,
      metodoPago: reservaData.metodoPago,
      observaciones: reservaData.observaciones,
      // ✅ INCLUIR LOS NUEVOS CAMPOS
      configuracionCamas: reservaData.configuracionCamas,
      informacionTransporte: reservaData.informacionTransporte,
      necesidadesEspeciales: reservaData.necesidadesEspeciales
    };

    this.reservaService.updateReserva(this.reservaId!, reservaUpdateData).subscribe({
      next: (reserva) => {
        console.log('✅ Reserva actualizada:', reserva);
        
        // Actualizar el precio total en la interfaz con el valor del backend
        if (reserva.precioTotal) {
          this.precioTotal = reserva.precioTotal;
          console.log('💰 Precio total actualizado desde backend:', this.precioTotal);
        }
        
        this.mostrarMensaje('Reserva actualizada exitosamente', 'success');
        this.router.navigate(['/'], { 
          queryParams: { 
            reservaActualizada: reserva._id,
            mensaje: 'Reserva actualizada exitosamente'
          }
        });
      },
      error: (error) => {
        console.error('Error al actualizar reserva:', error);
        this.manejarErrorReserva(error, 'actualizar');
      }
    });
  }

  private manejarErrorReserva(error: any, accion: string): void {
    console.error(`Error al ${accion} reserva:`, error);
    console.error('Error completo:', error);
    console.error('Error details:', error.error);
    
    let mensajeError = `Error al ${accion} la reserva`;
    
    // Manejo específico de errores de validación del backend
    if (error.error && error.error.errors && Array.isArray(error.error.errors)) {
      console.error('Errores de validación:', error.error.errors);
      
      // Mapear errores específicos a mensajes personalizados
      const erroresPersonalizados = error.error.errors.map((err: any) => {
        const campo = err.param || err.field || '';
        const mensaje = err.msg || err.message || '';
        
        // Mensajes personalizados por campo con nombres amigables
        switch (campo) {
          case 'cliente.nombre':
            return 'El nombre debe tener entre 2 y 50 caracteres y solo contener letras';
          case 'cliente.apellido':
            return 'El apellido debe tener entre 2 y 50 caracteres y solo contener letras';
          case 'cliente.email':
            return 'Formato de email inválido. Ejemplo: usuario@ejemplo.com';
          case 'cliente.telefono':
            return 'El teléfono debe tener entre 7 y 20 caracteres';
          case 'cliente.documento':
            return 'El documento debe tener entre 5 y 20 caracteres';
          case 'habitacion':
            return '🏨 Debe seleccionar una habitación válida';
          case 'fechaEntrada':
            return '📅 La fecha de entrada no puede ser anterior a hoy';
          case 'fechaSalida':
            return '📅 La fecha de salida debe ser posterior a la fecha de entrada';
          case 'horaEntrada':
            return '🕐 La hora de entrada es obligatoria. Use formato HH:MM (24 horas)';
          case 'horaSalida':
            return '🕐 La hora de salida es obligatoria. Use formato HH:MM (24 horas)';
          case 'precioPorNoche':
            return '💰 El precio por noche debe ser mayor a $0';
          case 'estado':
            return '📋 Debe seleccionar un estado para la reserva';
          case 'metodoPago':
            return '💳 Debe seleccionar un método de pago válido';
          case 'observaciones':
            return '📝 Las observaciones no pueden exceder 500 caracteres';
          case 'informacionTransporte.tipo':
            return '🚗 Debe seleccionar un tipo de transporte válido';
          case 'configuracionCamas':
            return '🛏️ Debe configurar al menos una cama';
          default:
            return mensaje || 'Campo inválido';
        }
      });
      
      this.mostrarMensaje(erroresPersonalizados.join('. '), 'error');
      return;
    }
    
    // Manejo específico de diferentes tipos de errores HTTP
    if (error.status === 400) {
      if (error.error?.message) {
        // Mensajes específicos del backend
        if (error.error.message.includes('ya está reservada')) {
          mensajeError = '🚫 La habitación ya está reservada para esas fechas. Por favor, seleccione otras fechas o una habitación diferente.';
        } else if (error.error.message.includes('fecha de entrada')) {
          mensajeError = '📅 La fecha de entrada no puede ser anterior a hoy.';
        } else if (error.error.message.includes('fecha de salida')) {
          mensajeError = '📅 La fecha de salida debe ser posterior a la fecha de entrada.';
        } else if (error.error.message.includes('habitación no encontrada')) {
          mensajeError = '🏨 La habitación seleccionada no existe. Por favor, seleccione otra habitación.';
        } else {
          mensajeError = `❌ ${error.error.message}`;
        }
      } else {
        mensajeError = '❌ Los datos ingresados no son válidos. Por favor, revise la información.';
      }
    } else if (error.status === 401) {
      mensajeError = '🔐 Su sesión ha expirado. Por favor, inicie sesión nuevamente.';
      // Opcional: redirigir al login
      // this.router.navigate(['/login']);
    } else if (error.status === 403) {
      mensajeError = '🚫 No tiene permisos para realizar esta acción.';
    } else if (error.status === 404) {
      mensajeError = '🔍 No se encontró la reserva o habitación especificada.';
    } else if (error.status === 409) {
      mensajeError = '⚠️ Conflicto detectado: La habitación ya está reservada para esas fechas.';
    } else if (error.status === 422) {
      mensajeError = '📝 Error de validación: Los datos enviados no son válidos.';
    } else if (error.status === 429) {
      mensajeError = '⏰ Demasiadas solicitudes. Por favor, espere un momento e intente nuevamente.';
    } else if (error.status === 500) {
      // Análisis detallado del error 500
      const errorMessage = error.error?.message || '';
      const errorDetails = error.error?.error || '';
      const errorType = error.error?.errorType || '';
      
      // Logging detallado para debugging
      console.error('🔍 DEBUGGING ERROR 500:');
      console.error('Error message:', errorMessage);
      console.error('Error details:', errorDetails);
      console.error('Error type:', errorType);
      console.error('Full error object:', error.error);
      
      // Usar errorType del backend si está disponible, sino usar detección por texto
      if (errorType === 'required' || errorMessage.includes('required') || errorDetails.includes('required')) {
        mensajeError = '❌ Faltan datos obligatorios. Por favor, complete todos los campos requeridos.';
      } else if (errorType === 'validation' || errorMessage.includes('validation') || errorDetails.includes('validation')) {
        mensajeError = '❌ Error de validación. Por favor, revise los datos ingresados.';
      } else if (errorType === 'habitacion' || errorMessage.includes('habitacion') || errorDetails.includes('habitacion')) {
        mensajeError = '🏨 Error con la habitación seleccionada. Por favor, seleccione otra habitación.';
      } else if (errorType === 'fecha' || errorMessage.includes('fecha') || errorDetails.includes('fecha')) {
        mensajeError = '📅 Error con las fechas seleccionadas. Por favor, verifique las fechas de entrada y salida.';
      } else if (errorType === 'precio' || errorMessage.includes('precio') || errorDetails.includes('precio')) {
        mensajeError = '💰 Error con el precio. Por favor, verifique que el precio sea un número válido mayor a 0.';
      } else if (errorType === 'cliente' || errorMessage.includes('cliente') || errorDetails.includes('cliente')) {
        mensajeError = '👤 Error con los datos del cliente. Por favor, verifique la información del cliente.';
      } else if (errorType === 'estado' || errorMessage.includes('estado') || errorDetails.includes('estado')) {
        mensajeError = '📋 Error con el estado de la reserva. Por favor, seleccione un estado válido.';
      } else if (errorType === 'MongoDB' || errorMessage.includes('MongoDB') || errorDetails.includes('MongoDB')) {
        mensajeError = '🗄️ Error de base de datos. Por favor, intente nuevamente en unos minutos.';
      } else if (errorType === 'duplicate' || errorMessage.includes('duplicate') || errorDetails.includes('duplicate')) {
        mensajeError = '⚠️ Ya existe una reserva con estos datos. Por favor, verifique la información.';
      } else if (errorType === 'type' || errorMessage.includes('type') || errorDetails.includes('type')) {
        mensajeError = '📝 Error de tipo de datos. Por favor, verifique que todos los campos tengan el formato correcto.';
      } else if (errorMessage.includes('informacionTransporte') || errorDetails.includes('informacionTransporte')) {
        mensajeError = '🚗 Error en la información de transporte. Por favor, complete los datos de transporte o déjelos vacíos.';
      } else if (errorMessage.includes('constraint') || errorDetails.includes('constraint')) {
        mensajeError = '🔗 Error de restricción de datos. Por favor, verifique que todos los datos sean válidos.';
      } else if (errorMessage.includes('length') || errorDetails.includes('length')) {
        mensajeError = '📏 Error de longitud de datos. Por favor, verifique que los campos no excedan el límite permitido.';
      } else if (errorMessage.includes('format') || errorDetails.includes('format')) {
        mensajeError = '📋 Error de formato de datos. Por favor, verifique que todos los campos tengan el formato correcto.';
      } else {
        // Solo mostrar error interno si realmente no se puede identificar la causa
        mensajeError = '🔧 Error interno del servidor. Por favor, intente nuevamente en unos minutos.';
      }
    } else if (error.status === 503) {
      mensajeError = '🚧 El servicio no está disponible temporalmente. Por favor, intente más tarde.';
    } else if (error.status === 0) {
      mensajeError = '🌐 Error de conexión. Verifique su conexión a internet y intente nuevamente.';
    } else if (error.error?.message) {
      mensajeError = `❌ ${error.error.message}`;
    } else {
      mensajeError = `❌ Error inesperado (${error.status || 'desconocido'}). Por favor, intente nuevamente.`;
    }
    
    this.mostrarMensaje(mensajeError, 'error');
    this.guardando = false;
  }

  cancelar(): void {
    this.router.navigate(['/']);
  }

  private mostrarMensaje(mensaje: string, tipo: 'success' | 'error' | 'info' = 'info'): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: tipo === 'error' ? 'error-snackbar' : tipo === 'success' ? 'success-snackbar' : 'info-snackbar'
    });
  }

  // Método para marcar todos los campos como tocados
  private marcarTodosLosCamposComoTocados(): void {
    Object.keys(this.reservaForm.controls).forEach(key => {
      const control = this.reservaForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  // Validar campos obligatorios y retornar lista de campos faltantes
  private validarCamposObligatorios(): string[] {
    const camposFaltantes: string[] = [];
    
    // Campos obligatorios con sus nombres amigables
    const camposObligatorios = [
      { control: 'habitacion', nombre: 'Habitación' },
      { control: 'fechaEntrada', nombre: 'Fecha de Entrada' },
      { control: 'fechaSalida', nombre: 'Fecha de Salida' },
      { control: 'horaEntrada', nombre: 'Hora de Entrada' },
      { control: 'horaSalida', nombre: 'Hora de Salida' },
      { control: 'precioPorNoche', nombre: 'Precio por Noche' },
      { control: 'estado', nombre: 'Estado de la Reserva' },
      { control: 'nombreCliente', nombre: 'Nombre del Cliente' },
      { control: 'apellidoCliente', nombre: 'Apellido del Cliente' },
      { control: 'telefonoCliente', nombre: 'Teléfono del Cliente' }
    ];
    
    camposObligatorios.forEach(campo => {
      const control = this.reservaForm.get(campo.control);
      if (!control || !control.value || (typeof control.value === 'string' && control.value.trim() === '')) {
        camposFaltantes.push(campo.nombre);
      }
    });
    
    // Validar método de pago si está marcado como pagado
    if (this.reservaForm.get('pagado')?.value && !this.reservaForm.get('metodoPago')?.value) {
      camposFaltantes.push('Método de Pago');
    }
    
    return camposFaltantes;
  }

  // Métodos para el template
  getErrorMessage(controlName: string): string {
    const control = this.reservaForm.get(controlName);
    
    // Solo mostrar errores si el campo ha sido tocado o el formulario ha sido enviado
    if (!control || (!control.touched && !this.reservaForm.dirty)) {
      return '';
    }
    
    if (!control.errors) {
      return '';
    }
    
    // Mensajes personalizados por campo
    if (control.hasError('required')) {
      switch (controlName) {
        case 'habitacion':
          return '🏨 Debe seleccionar una habitación';
        case 'fechaEntrada':
          return '📅 La fecha de entrada es obligatoria';
        case 'fechaSalida':
          return '📅 La fecha de salida es obligatoria';
        case 'horaEntrada':
          return '🕐 La hora de entrada es obligatoria';
        case 'horaSalida':
          return '🕐 La hora de salida es obligatoria';
        case 'precioPorNoche':
          return '💰 El precio por noche es obligatorio';
        case 'estado':
          return '📋 El estado es obligatorio';
        case 'nombreCliente':
          return '👤 El nombre del cliente es obligatorio';
        case 'apellidoCliente':
          return '👤 El apellido del cliente es obligatorio';
        case 'telefonoCliente':
          return '📞 El teléfono del cliente es obligatorio';
        default:
          return 'Este campo es requerido';
      }
    }
    
    if (control.hasError('min')) {
      switch (controlName) {
        case 'precioPorNoche':
          return '💰 El precio debe ser mayor a $0';
        default:
          return 'El valor debe ser mayor a 0';
      }
    }
    
    if (control.hasError('minlength')) {
      switch (controlName) {
        case 'nombreCliente':
          return '👤 El nombre debe tener al menos 2 caracteres';
        case 'apellidoCliente':
          return '👤 El apellido debe tener al menos 2 caracteres';
        case 'telefonoCliente':
          return '📞 El teléfono debe tener al menos 7 caracteres';
        case 'documentoCliente':
          return '📄 El documento debe tener al menos 5 caracteres';
        default:
          return 'El campo es muy corto';
      }
    }
    
    if (control.hasError('maxlength')) {
      switch (controlName) {
        case 'nombreCliente':
          return '👤 El nombre no puede exceder 50 caracteres';
        case 'apellidoCliente':
          return '👤 El apellido no puede exceder 50 caracteres';
        case 'telefonoCliente':
          return '📞 El teléfono no puede exceder 20 caracteres';
        case 'documentoCliente':
          return '📄 El documento no puede exceder 20 caracteres';
        default:
          return 'El campo es muy largo';
      }
    }
    
    if (control.hasError('email')) {
      return '📧 Ingrese un email válido (ejemplo: usuario@ejemplo.com)';
    }
    
    if (control.hasError('pattern')) {
      switch (controlName) {
        case 'horaEntrada':
        case 'horaSalida':
          return '🕐 Formato de hora inválido. Use formato HH:MM (24 horas)';
        case 'nombreCliente':
        case 'apellidoCliente':
          return '👤 Solo se permiten letras y espacios (sin números ni símbolos)';
        case 'telefonoCliente':
          return '📞 Formato de teléfono inválido. Use solo números, +, -, espacios y paréntesis';
        default:
          return 'Formato inválido';
      }
    }
    
    if (control.hasError('fechaInvalida')) {
      return '📅 La fecha de salida debe ser posterior a la fecha de entrada';
    }
    
    if (control.hasError('fechaAnterior')) {
      return '📅 La fecha de entrada no puede ser anterior a hoy';
    }
    
    if (control.hasError('formatoHoraInvalido')) {
      return '🕐 Formato de hora inválido. Use formato HH:MM (24 horas)';
    }
    
    // Errores personalizados
    if (control.hasError('custom')) {
      return control.errors['custom'];
    }
    
    return '';
  }

  isFieldInvalid(controlName: string): boolean {
    const control = this.reservaForm.get(controlName);
    
    // Los campos del cliente son opcionales, no considerarlos inválidos
    const camposCliente = ['nombreCliente', 'apellidoCliente', 'emailCliente', 'telefonoCliente', 'documentoCliente', 'direccionCliente', 'nacionalidadCliente'];
    if (camposCliente.includes(controlName)) {
      return false;
    }
    
    // Mostrar errores si el campo es inválido y ha sido tocado, o si el formulario ha sido enviado
    return !!(control && control.invalid && (control.dirty || control.touched || this.reservaForm.dirty));
  }
}
