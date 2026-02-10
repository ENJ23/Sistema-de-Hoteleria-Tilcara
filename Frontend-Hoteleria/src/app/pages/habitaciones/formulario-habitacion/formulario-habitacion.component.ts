import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// Material
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';

// Models y servicios
import { Habitacion, HabitacionCreate, HabitacionUpdate, TipoHabitacion } from '../../../models/habitacion.model';
import { HabitacionService } from '../../../services/habitacion.service';

// Componentes (removidos ya que no se usan en el template)

@Component({
  selector: 'app-formulario-habitacion',
  templateUrl: './formulario-habitacion.component.html',
  styleUrls: ['./formulario-habitacion.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    // Material
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatChipsModule,
    MatSnackBarModule,
    MatCheckboxModule
  ]
})
export class FormularioHabitacionComponent implements OnInit {
  habitacionForm: FormGroup;
  isEditMode = false;
  loading = false;
  submitting = false;
  habitacionId: string | null = null;
  private destroy$ = new Subject<void>();
  
  // Opciones para los selects
  tiposHabitacion: TipoHabitacion[] = [];
  
  // Servicios disponibles para selección múltiple
  serviciosDisponibles: string[] = [
    'Aire acondicionado',
    'TV por cable',
    'Minibar',
    'Caja fuerte',
    'WiFi',
    'Teléfono',
    'Secador de pelo',
    'Cafetera',
    'Plancha',
    'Escritorio',
    'Caja de seguridad electrónica',
    'Servicio a la habitación',
    'Bañera de hidromasaje',
    'Frigobar',
    'Caja de seguridad',
    'TV pantalla plana',
    'Canales premium',
    'Escritorio de trabajo',
    'Sala de estar',
    'Vistas al mar',
    'Terraza privada'
  ];
  
  // Configuración de validación
  readonly MAX_LONGITUD_DESCRIPCION = 500;
  readonly MAX_SERVICIOS = 10;

  constructor(
    private fb: FormBuilder,
    private habitacionService: HabitacionService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    // Inicializar el formulario con validaciones
    this.habitacionForm = this.fb.group({
      numero: ['', [
        Validators.required, 
        Validators.pattern('^[0-9]{1,3}[A-Za-z]?$'),
        Validators.maxLength(4)
      ]],
      tipo: ['', Validators.required],
      piso: [null, [
        Validators.required, 
        Validators.min(1), 
        Validators.max(50)
      ]],
      capacidad: [1, [
        Validators.required, 
        Validators.min(1), 
        Validators.max(10)
      ]],
      precioBase: [0, [
        Validators.required, 
        Validators.min(0), 
        Validators.max(500000)
      ]],
      precioActual: [0, [
        Validators.required, 
        Validators.min(0), 
        Validators.max(500000)
      ]],
      descripcion: ['', [
        Validators.maxLength(this.MAX_LONGITUD_DESCRIPCION)
      ]],
      servicios: [[]],
      activa: [true]
    });
    
    // Sincronizar precio base con precio actual si no se ha modificado
    let precioBaseOriginal = 0;
    this.habitacionForm.get('precioBase')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(val => {
        const precioActual = this.habitacionForm.get('precioActual')?.value;
        if (precioActual === precioBaseOriginal) {
          this.habitacionForm.patchValue({ precioActual: val });
        }
        precioBaseOriginal = val;
      });
  }

  ngOnInit(): void {
    // Obtener los tipos de habitación disponibles
    this.tiposHabitacion = this.habitacionService.getTiposHabitacion();
    
    // Verificar si estamos en modo edición
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const id = params.get('id');
        if (id) {
          this.isEditMode = true;
          this.habitacionId = id;
          this.cargarHabitacion(id);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarHabitacion(id: string): void {
    this.loading = true;
    this.habitacionService.getHabitacion(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (habitacion) => {
          // Asegurarse de que los servicios sean un array
          const habitacionData = {
            ...habitacion,
            servicios: Array.isArray(habitacion.servicios) ? habitacion.servicios : []
          };
          this.habitacionForm.patchValue(habitacionData);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al cargar la habitación', error);
          this.snackBar.open(
            'Error al cargar los datos de la habitación. La habitación no existe o no tienes permiso para verla.',
            'Cerrar',
            { duration: 5000, panelClass: ['error-snackbar'] }
          );
          this.loading = false;
          this.router.navigate(['/habitaciones']);
        }
      });
  }

  onSubmit(): void {
    // Marcar todos los campos como tocados para mostrar errores
    this.marcarTodosLosCamposComoTocados();
    
    // Validación específica de campos obligatorios
    const erroresFaltantes = this.validarCamposObligatorios();
    if (erroresFaltantes.length > 0) {
      this.mostrarMensaje(`❌ Complete los siguientes campos: ${erroresFaltantes.join(', ')}`, 'error');
      return;
    }
    
    if (this.habitacionForm.invalid || this.submitting) {
      this.mostrarMensaje('❌ Por favor, corrija los errores mostrados en el formulario', 'error');
      return;
    }

    this.submitting = true;
    const formValue = this.habitacionForm.value;
    
    // Preparar los datos para enviar al servidor
    const habitacionData: HabitacionCreate | HabitacionUpdate = {
      ...formValue,
      // Asegurarse de que los campos numéricos sean números
      piso: Number(formValue.piso),
      capacidad: Number(formValue.capacidad),
      precioBase: Number(formValue.precioBase),
      precioActual: Number(formValue.precioActual),
      // Asegurarse de que servicios sea un array
      servicios: Array.isArray(formValue.servicios) ? formValue.servicios : []
    };

    // Verificar si el número de habitación ya existe
    this.habitacionService.checkNumeroExists(habitacionData.numero || '', this.habitacionId || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (exists) => {
          if (exists) {
            this.mostrarMensaje('Ya existe una habitación con este número. Por favor, elija otro número.', 'error');
            this.submitting = false;
            return;
          }
          
          // Si el número no existe, proceder con la creación/actualización
          const request$ = this.isEditMode && this.habitacionId
            ? this.habitacionService.updateHabitacion(this.habitacionId, habitacionData as HabitacionUpdate)
            : this.habitacionService.createHabitacion(habitacionData as HabitacionCreate);

          request$
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (habitacion) => {
                const mensaje = this.isEditMode 
                  ? 'Habitación actualizada correctamente' 
                  : 'Habitación creada correctamente';
                
                this.mostrarMensaje(mensaje, 'success');
                
                // Navegar a la lista de habitaciones con un parámetro de recarga
                this.router.navigate(['/habitaciones'], {
                  queryParams: { refresh: new Date().getTime() },
                  queryParamsHandling: 'merge'
                });
              },
              error: (error) => {
                console.error(`Error al ${this.isEditMode ? 'actualizar' : 'crear'} la habitación`, error);
                this.manejarErrorHabitacion(error, this.isEditMode ? 'actualizar' : 'crear');
                this.submitting = false;
              }
            });
        },
        error: (error) => {
          console.error('Error al verificar el número de habitación', error);
          this.mostrarMensaje('Error al verificar el número de habitación. Intente nuevamente.', 'error');
          this.submitting = false;
        }
      });
  }
  
  /**
   * Maneja errores específicos de habitaciones
   */
  private manejarErrorHabitacion(error: any, accion: string): void {
    console.error(`Error al ${accion} habitación:`, error);
    console.error('Error completo:', error);
    console.error('Error details:', error.error);
    
    let mensajeError = `Error al ${accion} la habitación`;
    
    // Manejo específico de errores de validación del backend
    if (error.error && error.error.errors && Array.isArray(error.error.errors)) {
      console.error('Errores de validación:', error.error.errors);
      
      // Mapear errores específicos a mensajes personalizados
      const erroresPersonalizados = error.error.errors.map((err: any) => {
        const campo = err.param || err.field || '';
        const mensaje = err.msg || err.message || '';
        
        // Mensajes personalizados por campo
        switch (campo) {
          case 'numero':
            return '🏨 El número de habitación es obligatorio';
          case 'tipo':
            return '🏠 El tipo de habitación es obligatorio';
          case 'capacidad':
            return '👥 La capacidad debe ser mayor a 0';
          case 'precioBase':
            return '💰 El precio base debe ser mayor a $0';
          case 'piso':
            return '🏢 El piso es obligatorio';
          case 'servicios':
            return '🛎️ Debe seleccionar al menos un servicio';
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
        if (error.error.message.includes('número')) {
          mensajeError = '🏨 Ya existe una habitación con este número. Por favor, elija otro número.';
        } else if (error.error.message.includes('tipo')) {
          mensajeError = '🏠 Tipo de habitación inválido. Por favor, seleccione un tipo válido.';
        } else if (error.error.message.includes('capacidad')) {
          mensajeError = '👥 La capacidad debe ser un número mayor a 0.';
        } else if (error.error.message.includes('precio')) {
          mensajeError = '💰 El precio debe ser un número mayor a $0.';
        } else {
          mensajeError = `❌ ${error.error.message}`;
        }
      } else {
        mensajeError = '❌ Los datos ingresados no son válidos. Por favor, revise la información.';
      }
    } else if (error.status === 401) {
      mensajeError = '🔐 Su sesión ha expirado. Por favor, inicie sesión nuevamente.';
    } else if (error.status === 403) {
      mensajeError = '🚫 No tiene permisos para realizar esta acción.';
    } else if (error.status === 404) {
      mensajeError = '🔍 No se encontró la habitación especificada.';
    } else if (error.status === 409) {
      mensajeError = '⚠️ Ya existe una habitación con este número. Por favor, elija otro número.';
    } else if (error.status === 422) {
      mensajeError = '📝 Error de validación: Los datos enviados no son válidos.';
    } else if (error.status === 429) {
      mensajeError = '⏰ Demasiadas solicitudes. Por favor, espere un momento e intente nuevamente.';
    } else if (error.status === 500) {
      if (error.error?.message && error.error.message.includes('required')) {
        mensajeError = '❌ Faltan datos obligatorios. Por favor, complete todos los campos requeridos.';
      } else if (error.error?.message && error.error.message.includes('validation')) {
        mensajeError = '❌ Error de validación. Por favor, revise los datos ingresados.';
      } else {
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
  }

  /**
   * Marca todos los campos como tocados para mostrar errores
   */
  private marcarTodosLosCamposComoTocados(): void {
    Object.keys(this.habitacionForm.controls).forEach(key => {
      const control = this.habitacionForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  /**
   * Valida campos obligatorios y retorna lista de campos faltantes
   */
  private validarCamposObligatorios(): string[] {
    const camposFaltantes: string[] = [];
    
    // Campos obligatorios con sus nombres amigables
    const camposObligatorios = [
      { control: 'numero', nombre: 'Número de Habitación' },
      { control: 'tipo', nombre: 'Tipo de Habitación' },
      { control: 'capacidad', nombre: 'Capacidad' },
      { control: 'precioBase', nombre: 'Precio Base' },
      { control: 'piso', nombre: 'Piso' }
    ];
    
    camposObligatorios.forEach(campo => {
      const control = this.habitacionForm.get(campo.control);
      if (!control || !control.value || (typeof control.value === 'string' && control.value.trim() === '')) {
        camposFaltantes.push(campo.nombre);
      }
    });
    
    return camposFaltantes;
  }

  /**
   * Muestra los errores de validación del formulario
   */
  private mostrarErroresFormulario(): void {
    const form = this.habitacionForm;
    
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      if (control?.invalid) {
        control.markAsTouched();
      }
    });
    
    // Desplazarse al primer error
    const firstError = document.querySelector('.ng-invalid');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  
  /**
   * Maneja la selección/deselección de servicios
   */
  toggleServicio(servicio: string, event?: any): void {
    const serviciosControl = this.habitacionForm.get('servicios');
    if (!serviciosControl) return;

    let servicios: string[] = [...(serviciosControl.value || [])];
    const index = servicios.indexOf(servicio);
    
    // Si viene de un evento de checkbox, usar su estado checked
    if (event && event.checked !== undefined) {
      if (event.checked) {
        if (servicios.length < this.MAX_SERVICIOS) {
          servicios.push(servicio);
        } else {
          this.snackBar.open(
            `Solo se pueden seleccionar hasta ${this.MAX_SERVICIOS} servicios`,
            'Cerrar',
            { duration: 3000 }
          );
          return;
        }
      } else {
        servicios = servicios.filter(s => s !== servicio);
      }
    } else {
      // Comportamiento alternativo si se llama sin evento
      if (index >= 0) {
        servicios.splice(index, 1);
      } else if (servicios.length < this.MAX_SERVICIOS) {
        servicios.push(servicio);
      } else {
        this.snackBar.open(
          `Solo se pueden seleccionar hasta ${this.MAX_SERVICIOS} servicios`,
          'Cerrar',
          { duration: 3000 }
        );
        return;
      }
    }
    
    serviciosControl.setValue(servicios);
    serviciosControl.markAsDirty();
  }

  /**
   * Verifica si un servicio está seleccionado
   */
  isServicioSeleccionado(servicio: string): boolean {
    const servicios = this.habitacionForm.get('servicios')?.value || [];
    return Array.isArray(servicios) && servicios.includes(servicio);
  }
  
  /**
   * Maneja el evento de cancelar
   */
  onCancel(): void {
    if (this.habitacionForm.dirty && !confirm('¿Está seguro de que desea salir? Los cambios no guardados se perderán.')) {
      return;
    }
    this.router.navigate(['/habitaciones']);
  }

  /**
   * Muestra un mensaje usando el snackbar
   */
  private mostrarMensaje(mensaje: string, tipo: 'success' | 'error' | 'warn'): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      panelClass: [`snackbar-${tipo}`],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  // Getters para acceder a los controles del formulario
  get f() { return this.habitacionForm.controls; }

  /**
   * Obtiene el icono correspondiente al tipo de habitación
   */
  getTipoIcon(tipo: TipoHabitacion): string {
    const iconos: Record<TipoHabitacion, string> = {
      'Individual': 'bed',
      'Doble': 'hotel',
      'Triple': 'home',
      'Suite': 'star',
      'Familiar': 'group'
    };
    return iconos[tipo] || 'room';
  }

  /**
   * Obtiene el icono correspondiente al servicio
   */
  getServicioIcon(servicio: string): string {
    const iconos: Record<string, string> = {
      'Aire acondicionado': 'ac_unit',
      'TV por cable': 'tv',
      'Minibar': 'local_bar',
      'Caja fuerte': 'security',
      'WiFi': 'wifi',
      'Teléfono': 'phone',
      'Secador de pelo': 'content_cut',
      'Cafetera': 'local_cafe',
      'Plancha': 'iron',
      'Escritorio': 'desktop_windows',
      'Caja de seguridad electrónica': 'lock',
      'Servicio a la habitación': 'room_service',
      'Bañera de hidromasaje': 'hot_tub',
      'Frigobar': 'kitchen',
      'Caja de seguridad': 'lock_outline',
      'TV pantalla plana': 'tv',
      'Canales premium': 'star',
      'Escritorio de trabajo': 'work',
      'Sala de estar': 'weekend',
      'Vistas al mar': 'visibility',
      'Terraza privada': 'balcony'
    };
    return iconos[servicio] || 'room_service';
  }
}
