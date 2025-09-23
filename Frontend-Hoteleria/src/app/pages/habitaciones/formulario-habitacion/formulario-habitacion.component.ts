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
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';

// Models y servicios
import { Habitacion, HabitacionCreate, HabitacionUpdate, TipoHabitacion, EstadoHabitacion } from '../../../models/habitacion.model';
import { HabitacionService } from '../../../services/habitacion.service';

// Componentes
import { HeaderComponent } from '../../../components/layout/header/header.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

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
    MatChipsModule,
    MatSnackBarModule,
    MatCheckboxModule,
    // Componentes
    HeaderComponent,
    LoadingSpinnerComponent
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
  estados: EstadoHabitacion[] = [];
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
        Validators.max(10000)
      ]],
      precioActual: [0, [
        Validators.required, 
        Validators.min(0), 
        Validators.max(10000)
      ]],
      estado: ['Disponible', Validators.required],
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
    // Obtener los tipos de habitación y estados disponibles
    this.tiposHabitacion = this.habitacionService.getTiposHabitacion();
    this.estados = this.habitacionService.getEstadosHabitacion();
    
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
    if (this.habitacionForm.invalid || this.submitting) {
      this.mostrarErroresFormulario();
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

    // Convertir el número de habitación a número y verificar si ya existe
    const numeroHabitacion = Number(habitacionData.numero);
    this.habitacionService.checkNumeroExists(numeroHabitacion, this.habitacionId || undefined)
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
                
                let mensajeError = `Error al ${this.isEditMode ? 'actualizar' : 'crear'} la habitación.`;
                
                if (error.error?.message) {
                  mensajeError += ` ${error.error.message}`;
                } else if (error.status === 409) {
                  mensajeError = 'Ya existe una habitación con este número. Por favor, elija otro número.';
                } else if (error.status === 401 || error.status === 403) {
                  mensajeError = 'No tienes permisos para realizar esta acción. Por favor, inicia sesión nuevamente.';
                }
                
                this.mostrarMensaje(mensajeError, 'error');
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
}
