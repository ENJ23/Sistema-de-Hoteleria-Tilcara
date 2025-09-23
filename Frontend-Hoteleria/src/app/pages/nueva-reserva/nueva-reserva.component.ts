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
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Observable, Subject, of, debounceTime, distinctUntilChanged, switchMap, takeUntil, firstValueFrom } from 'rxjs';

import { ReservaService } from '../../services/reserva.service';
import { HabitacionService } from '../../services/habitacion.service';
import { DateTimeService } from '../../services/date-time.service';
import { ReservaCreate } from '../../models/reserva.model';
import { Habitacion } from '../../models/habitacion.model';

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
    MatCheckboxModule
  ],
  templateUrl: './nueva-reserva.component.html',
  styleUrls: ['./nueva-reserva.component.scss']
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
  
  // Estados y tipos
  estadosReserva = ['Confirmada', 'Pendiente', 'En curso', 'Cancelada', 'Completada', 'No Show'];
  metodosPago = ['Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia', 'PayPal'];
  
  // Precios
  precioPorNoche = 0;
  precioTotal = 0;
  numeroNoches = 0;
  
  // Destructor para observables
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private reservaService: ReservaService,
    private habitacionService: HabitacionService,
    private dateTimeService: DateTimeService,
    private snackBar: MatSnackBar
  ) {
    this.reservaForm = this.fb.group({
      // Información del cliente
      nombreCliente: ['', Validators.required],
      apellidoCliente: ['', Validators.required],
      emailCliente: ['', [Validators.required, Validators.email]],
      telefonoCliente: ['', Validators.required],
      documentoCliente: ['', Validators.required],
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
      if (params['fecha']) {
        // CORRECCIÓN: Usar el servicio de fecha para manejar correctamente la zona horaria
        this.fechaSeleccionada = this.dateTimeService.parseDateFromString(params['fecha']);
        this.reservaForm.patchValue({
          fechaEntrada: this.fechaSeleccionada
        });
        console.log('Fecha recibida desde calendario:', params['fecha']);
        console.log('Fecha procesada para formulario:', this.fechaSeleccionada);
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
      return habitacion; // Retornar el ID si no se encuentra
    }
    
    if (habitacion && habitacion._id) {
      return `${habitacion.numero} - ${habitacion.tipo} (${habitacion.estado})`;
    }
    
    return '';
  }

  // Método para manejar el clic en el campo de habitación
  onHabitacionClick(): void {
    console.log('=== CLIC EN CAMPO HABITACIÓN ===');
    console.log('Habitaciones disponibles:', this.habitaciones);
    console.log('Número de habitaciones:', this.habitaciones.length);
    
    // Activar modo clic para evitar que el observador sobrescriba
    this.modoClic = true;
    console.log('Modo clic activado:', this.modoClic);
    
    // Mostrar todas las habitaciones cuando se hace clic
    this.habitacionesFiltradas = of(this.habitaciones);
    console.log('Habitaciones filtradas configuradas');
    
    // Desactivar modo clic después de un breve delay
    setTimeout(() => {
      this.modoClic = false;
      console.log('Modo clic desactivado:', this.modoClic);
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
    console.log('¿Es undefined?', habitacionId === undefined);
    console.log('¿Es null?', habitacionId === null);
    console.log('¿Es string vacío?', habitacionId === '');
    console.log('Tipo de dato:', typeof habitacionId);
    
    // Buscar la habitación completa para verificar
    const habitacionCompleta = this.habitaciones.find(h => h._id === habitacionId);
    console.log('Habitación encontrada:', habitacionCompleta);
    console.log('¿Se encontró la habitación?', !!habitacionCompleta);
    
    // Actualizar el precio de la habitación seleccionada
    this.actualizarPrecioHabitacion(habitacionId);
    
    // Verificar el valor del formulario después de la selección
    setTimeout(() => {
      const valorFormulario = this.reservaForm.get('habitacion')?.value;
      console.log('Valor del formulario después de selección:', valorFormulario);
      console.log('=== FIN SELECCIÓN ===');
    }, 100);
    
    // Cerrar el autocompletado
    this.habitacionesFiltradas = of([]);
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
        const disponible = await firstValueFrom(this.reservaService.verificarDisponibilidad(
          habitacionId, 
          fechaEntrada, 
          fechaSalida
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
    
    return false;
  }

  async guardarReserva(): Promise<void> {
    if (this.reservaForm.invalid) {
      this.mostrarMensaje('Por favor, complete todos los campos requeridos', 'error');
      return;
    }

    if (!this.validarFechas()) {
      return;
    }

    // Saltar verificación de disponibilidad por ahora (endpoint con problemas)
    console.log('Saltando verificación de disponibilidad - endpoint con problemas en el backend');

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
    
    const reservaData: ReservaCreate = {
      cliente: {
        nombre: this.reservaForm.get('nombreCliente')?.value?.trim(),
        apellido: this.reservaForm.get('apellidoCliente')?.value?.trim(),
        email: this.reservaForm.get('emailCliente')?.value?.trim(),
        telefono: this.reservaForm.get('telefonoCliente')?.value?.trim(),
        documento: this.reservaForm.get('documentoCliente')?.value?.trim(),
        direccion: this.reservaForm.get('direccionCliente')?.value?.trim() || undefined,
        nacionalidad: this.reservaForm.get('nacionalidadCliente')?.value?.trim() || undefined
      },
      habitacion: this.reservaForm.get('habitacion')?.value,
      fechaEntrada: fechaEntrada instanceof Date ? fechaEntrada.toISOString() : fechaEntrada,
      fechaSalida: fechaSalida instanceof Date ? fechaSalida.toISOString() : fechaSalida,
      horaEntrada: horaEntrada || '14:00',
      horaSalida: horaSalida || '11:00',
      precioPorNoche: parseFloat(precioPorNoche),
      estado: this.reservaForm.get('estado')?.value || 'Pendiente',
      pagado: this.reservaForm.get('pagado')?.value || false,
      metodoPago: metodoPagoValue && metodoPagoValue.trim() !== '' ? metodoPagoValue : undefined,
      observaciones: observacionesValue && observacionesValue.trim() !== '' ? observacionesValue : undefined
    };

    console.log('=== DATOS DE RESERVA A ENVIAR ===');
    console.log('Reserva completa:', reservaData);
    console.log('Cliente:', reservaData.cliente);
    console.log('Habitación ID:', reservaData.habitacion);
    console.log('Fechas:', { entrada: reservaData.fechaEntrada, salida: reservaData.fechaSalida });
    console.log('Horas:', { entrada: reservaData.horaEntrada, salida: reservaData.horaSalida });
    console.log('Precio por noche:', reservaData.precioPorNoche);
    console.log('Estado:', reservaData.estado);
    console.log('Pagado:', reservaData.pagado);
    console.log('Método de pago:', reservaData.metodoPago);
    console.log('Observaciones:', reservaData.observaciones);
    console.log('=== FIN DATOS ===');

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
        console.error('Error completo:', error);
        console.error('Error details:', error.error);
        
        let mensajeError = 'Error al crear la reserva';
        
        if (error.error?.message) {
          mensajeError = error.error.message;
        }
        
        // Si hay errores de validación específicos, mostrarlos
        if (error.error?.errors && Array.isArray(error.error.errors)) {
          const erroresValidacion = error.error.errors.map((err: any) => `${err.field}: ${err.message}`).join(', ');
          mensajeError = `Errores de validación: ${erroresValidacion}`;
        }
        
        this.mostrarMensaje(mensajeError, 'error');
        this.guardando = false;
      }
    });
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
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
