import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ReservaService } from '../../services/reserva.service';
import { CancelacionService } from '../../services/cancelacion.service';
import { Reserva } from '../../models/reserva.model';

export interface CancelarReservaData {
  reserva: Reserva;
}

export interface CancelarReservaResult {
  success: boolean;
  cancelacion?: any;
  error?: string;
}

@Component({
  selector: 'app-cancelar-reserva-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './cancelar-reserva-dialog.component.html',
  styleUrls: ['./cancelar-reserva-dialog.component.scss']
})
export class CancelarReservaDialogComponent {
  cancelacionForm: FormGroup;
  cargando = false;
  mostrarReembolso = false;
  datosCancelacion: any = null;

  motivosCancelacion = [
    'Cambio de planes del cliente',
    'Emergencia familiar',
    'Problemas de salud',
    'Cancelación por parte del hotel',
    'Error en la reserva',
    'Condiciones climáticas',
    'Otro'
  ];

  metodosReembolso = [
    { value: 'Efectivo', label: 'Efectivo' },
    { value: 'Transferencia', label: 'Transferencia bancaria' },
    { value: 'Tarjeta de Crédito', label: 'Tarjeta de Crédito' },
    { value: 'Tarjeta de Débito', label: 'Tarjeta de Débito' },
    { value: 'Cheque', label: 'Cheque' }
  ];

  constructor(
    private fb: FormBuilder,
    private reservaService: ReservaService,
    private cancelacionService: CancelacionService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<CancelarReservaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CancelarReservaData
  ) {
    this.cancelacionForm = this.fb.group({
      motivoCancelacion: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
      metodoReembolso: [''],
      observacionesReembolso: ['']
    });
  }

  get f() { return this.cancelacionForm.controls; }

  get montoPagado(): number {
    return this.data.reserva.montoPagado || 0;
  }

  get puedeReembolso(): boolean {
    return this.montoPagado > 0;
  }

  onMotivoChange(): void {
    const motivo = this.cancelacionForm.get('motivoCancelacion')?.value;
    if (motivo === 'Otro') {
      this.cancelacionForm.get('motivoCancelacion')?.setValue('');
    }
  }

  async cancelarReserva(): Promise<void> {
    if (this.cancelacionForm.invalid) {
      this.marcarCamposComoTocados();
      return;
    }

    this.cargando = true;
    const motivo = this.cancelacionForm.get('motivoCancelacion')?.value;

    try {
      console.log('🚫 Cancelando reserva:', {
        reservaId: this.data.reserva._id,
        motivo: motivo,
        montoPagado: this.montoPagado
      });

      const resultado = await this.reservaService.cancelarReserva(this.data.reserva._id, motivo).toPromise();
      
      if (resultado) {
        console.log('✅ Reserva cancelada:', resultado);
        
        this.datosCancelacion = resultado.cancelacion;
        this.mostrarReembolso = resultado.cancelacion.puedeReembolso;
      }
      
      this.snackBar.open('✅ Reserva cancelada exitosamente', 'Cerrar', {
        duration: 5000,
        panelClass: ['success-snackbar']
      });

      // Si hay reembolso pendiente, mostrar información
      if (this.mostrarReembolso) {
        this.snackBar.open(
          '💰 Reembolso pendiente: Puedes procesarlo desde la página de Auditoría', 
          'Ver Auditoría', 
          {
            duration: 10000,
            panelClass: ['info-snackbar']
          }
        ).onAction().subscribe(() => {
          // Navegar a auditoría (se implementará en el componente padre)
          this.dialogRef.close({
            success: true,
            cancelacion: this.datosCancelacion,
            navegarAAuditoria: true
          });
        });
      }

    } catch (error: any) {
      console.error('❌ Error al cancelar reserva:', error);
      
      let mensajeError = 'Error al cancelar la reserva';
      if (error.error?.message) {
        mensajeError = error.error.message;
      }
      
      this.snackBar.open(`❌ ${mensajeError}`, 'Cerrar', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.cargando = false;
    }
  }

  async procesarReembolso(): Promise<void> {
    if (!this.datosCancelacion) {
      this.snackBar.open('❌ No hay datos de cancelación disponibles', 'Cerrar', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    const metodoReembolso = this.cancelacionForm.get('metodoReembolso')?.value;
    const observaciones = this.cancelacionForm.get('observacionesReembolso')?.value;

    if (!metodoReembolso) {
      this.snackBar.open('❌ Seleccione un método de reembolso', 'Cerrar', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.cargando = true;

    try {
      console.log('💰 Procesando reembolso:', {
        cancelacionId: this.datosCancelacion._id,
        metodo: metodoReembolso,
        monto: this.datosCancelacion.montoPagado
      });

      const resultado = await this.cancelacionService.procesarReembolso(
        this.datosCancelacion._id,
        {
          metodoReembolso: metodoReembolso,
          observaciones: observaciones
        }
      ).toPromise();

      console.log('✅ Reembolso procesado:', resultado);

      this.snackBar.open('✅ Reembolso procesado exitosamente', 'Cerrar', {
        duration: 5000,
        panelClass: ['success-snackbar']
      });

      // Cerrar el diálogo con éxito
      this.dialogRef.close({
        success: true,
        cancelacion: this.datosCancelacion,
        reembolsoProcesado: true
      });

    } catch (error: any) {
      console.error('❌ Error al procesar reembolso:', error);
      
      let mensajeError = 'Error al procesar el reembolso';
      if (error.error?.message) {
        mensajeError = error.error.message;
      }
      
      this.snackBar.open(`❌ ${mensajeError}`, 'Cerrar', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.cargando = false;
    }
  }

  cerrar(): void {
    this.dialogRef.close({
      success: this.datosCancelacion ? true : false,
      cancelacion: this.datosCancelacion
    });
  }

  private marcarCamposComoTocados(): void {
    Object.keys(this.cancelacionForm.controls).forEach(key => {
      const control = this.cancelacionForm.get(key);
      control?.markAsTouched();
    });
  }

  getHabitacionInfo(): string {
    const habitacion = this.data.reserva.habitacion;
    if (typeof habitacion === 'object' && habitacion !== null) {
      return `${habitacion.numero} - ${habitacion.tipo}`;
    }
    return 'Habitación no disponible';
  }

  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(precio);
  }
}
