import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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
import { ReservaCreate, ReservaUpdate, Reserva } from '../../models/reserva.model';
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
      // Información del cliente (opcional para facilitar carga rápida)
      nombreCliente: [''],
      apellidoCliente: [''],
      emailCliente: [''],
      telefonoCliente: [''],
      documentoCliente: [''],
      direccionCliente: [''],
      nacionalidadCliente: [''],
      
      // Información de la reserva
      habitacion: ['', Validators.required],
      fechaEntrada: ['', Validators.required],
      fechaSalida: ['', Validators.required],
      horaEntrada: ['14:00', Validators.required],
      horaSalida: ['11:00', Validators.required],
      precioPorNoche: [0, [Validators.required, Validators.min(0)]],
      estado: ['Pendiente', Validators.required],
      pagado: [false],
      metodoPago: [''],
      observaciones: ['']
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
    // Observar cambios en las fechas para calcular precio
    this.reservaForm.get('fechaEntrada')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calcularPrecio());

    this.reservaForm.get('fechaSalida')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calcularPrecio());

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
        // ESTÁNDAR: Usar método estándar para parsear fecha
        const fechaStr = params['fecha'];
        this.fechaSeleccionada = this.dateTimeService.stringToDate(fechaStr);
        
        this.reservaForm.patchValue({
          fechaEntrada: this.fechaSeleccionada
        });
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
      observaciones: reserva.observaciones || ''
    });

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

  // Validaciones
  validarFechas(): boolean {
    const fechaEntrada = this.reservaForm.get('fechaEntrada')?.value;
    const fechaSalida = this.reservaForm.get('fechaSalida')?.value;
    
    if (fechaEntrada && fechaSalida) {
      const entrada = new Date(fechaEntrada);
      const salida = new Date(fechaSalida);
      const hoy = this.dateTimeService.getCurrentDate();
      hoy.setHours(0, 0, 0, 0);
      
      if (entrada < hoy) {
        this.mostrarMensaje('La fecha de entrada no puede ser anterior a hoy', 'error');
        return false;
      }
      
      if (salida <= entrada) {
        this.mostrarMensaje('La fecha de salida debe ser posterior a la fecha de entrada', 'error');
        return false;
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
          this.mostrarMensaje('La habitación no está disponible para las fechas seleccionadas', 'error');
          return false;
        }
        
        return true;
      } catch (error: any) {
        console.error('Error al verificar disponibilidad:', error);
        
        // Si es un error 500, 403 o 404, puede ser que el endpoint no exista o haya problemas
        if (error.status === 500 || error.status === 403 || error.status === 404) {
          this.mostrarMensaje('Advertencia: No se pudo verificar la disponibilidad. Continuando con la reserva...', 'info');
          return true;
        }
        
        this.mostrarMensaje('Error al verificar disponibilidad de la habitación', 'error');
        return false;
      }
    }
    
    return true; // Si no hay datos suficientes, permitir continuar
  }

  async guardarReserva(): Promise<void> {
    if (this.reservaForm.invalid) {
      this.mostrarMensaje('Por favor, complete todos los campos requeridos', 'error');
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
      this.mostrarMensaje('Las fechas de entrada y salida son obligatorias', 'error');
      return;
    }
    
    // Validar que el precio sea válido
    if (!precioPorNoche || precioPorNoche <= 0) {
      this.mostrarMensaje('El precio por noche debe ser mayor a 0', 'error');
      return;
    }
    
    // Validar formato de horas
    const horaEntradaRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    const horaSalidaRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (horaEntrada && !horaEntradaRegex.test(horaEntrada)) {
      this.mostrarMensaje('Formato de hora de entrada inválido (debe ser HH:MM)', 'error');
      return;
    }
    
    if (horaSalida && !horaSalidaRegex.test(horaSalida)) {
      this.mostrarMensaje('Formato de hora de salida inválido (debe ser HH:MM)', 'error');
      return;
    }
    
    // ESTÁNDAR: Procesar fechas usando métodos estándar
    const fechaEntradaFormateada = fechaEntrada instanceof Date ? 
      this.dateTimeService.dateToString(fechaEntrada) : fechaEntrada;
    const fechaSalidaFormateada = fechaSalida instanceof Date ? 
      this.dateTimeService.dateToString(fechaSalida) : fechaSalida;
    
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
      observaciones: observacionesValue && observacionesValue.trim() !== '' ? observacionesValue : undefined
    };


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
      observaciones: reservaData.observaciones
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
    
    // Mostrar errores de validación específicos
    if (error.error && error.error.errors && Array.isArray(error.error.errors)) {
      console.error('Errores de validación:', error.error.errors);
      const erroresTexto = error.error.errors.map((err: any) => `${err.param || err.field}: ${err.msg || err.message}`).join(', ');
      this.mostrarMensaje(`Errores de validación: ${erroresTexto}`, 'error');
      return;
    }
    
    let mensajeError = `Error al ${accion} la reserva`;
    
    // Manejo específico de diferentes tipos de errores
    if (error.status === 400) {
      // Error de validación
      if (error.error?.message) {
        mensajeError = error.error.message;
      } else if (error.error?.errors && Array.isArray(error.error.errors)) {
        const erroresValidacion = error.error.errors.map((err: any) => `${err.field}: ${err.message}`).join(', ');
        mensajeError = `Errores de validación: ${erroresValidacion}`;
      } else {
        mensajeError = 'Los datos ingresados no son válidos. Por favor, revise la información.';
      }
    } else if (error.status === 404) {
      mensajeError = 'No se encontró la reserva o habitación especificada.';
    } else if (error.status === 409) {
      mensajeError = 'Conflicto detectado: La habitación ya está reservada para esas fechas.';
    } else if (error.status === 500) {
      mensajeError = 'Error interno del servidor. Por favor, intente nuevamente.';
    } else if (error.status === 0) {
      mensajeError = 'Error de conexión. Verifique su conexión a internet.';
    } else if (error.error?.message) {
      mensajeError = error.error.message;
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

  // Métodos para el template
  getErrorMessage(controlName: string): string {
    const control = this.reservaForm.get(controlName);
    
    // Los campos del cliente son opcionales, no mostrar errores de validación
    const camposCliente = ['nombreCliente', 'apellidoCliente', 'emailCliente', 'telefonoCliente', 'documentoCliente', 'direccionCliente', 'nacionalidadCliente'];
    if (camposCliente.includes(controlName)) {
      return '';
    }
    
    if (control?.hasError('required')) {
      return 'Este campo es requerido';
    }
    if (control?.hasError('min')) {
      return 'El valor debe ser mayor a 0';
    }
    if (control?.hasError('email')) {
      return 'Ingrese un email válido';
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
    
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
