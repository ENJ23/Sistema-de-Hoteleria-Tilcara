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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { CancelacionService, CancelacionReserva } from '../../services/cancelacion.service';

export interface ReembolsoDialogData {
  cancelacion: CancelacionReserva;
}

export interface ReembolsoDialogResult {
  success: boolean;
  reembolso?: any;
  error?: string;
}

@Component({
  selector: 'app-reembolso-dialog',
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
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './reembolso-dialog.component.html',
  styleUrls: ['./reembolso-dialog.component.scss']
})
export class ReembolsoDialogComponent {
  reembolsoForm: FormGroup;
  cargando = false;

  metodosReembolso = [
    { value: 'Efectivo', label: 'Efectivo' },
    { value: 'Transferencia', label: 'Transferencia bancaria' },
    { value: 'Tarjeta de Crédito', label: 'Tarjeta de Crédito' },
    { value: 'Tarjeta de Débito', label: 'Tarjeta de Débito' },
    { value: 'Cheque', label: 'Cheque' }
  ];

  constructor(
    private fb: FormBuilder,
    private cancelacionService: CancelacionService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<ReembolsoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ReembolsoDialogData
  ) {
    this.reembolsoForm = this.fb.group({
      metodoReembolso: ['', Validators.required],
      observaciones: ['']
    });
  }

  get f() { return this.reembolsoForm.controls; }

  get montoReembolso(): number {
    return this.data.cancelacion.montoPagado;
  }

  async procesarReembolso(): Promise<void> {
    if (this.reembolsoForm.invalid) {
      this.marcarCamposComoTocados();
      return;
    }

    this.cargando = true;
    const { metodoReembolso, observaciones } = this.reembolsoForm.value;

    try {
      console.log('💰 Procesando reembolso:', {
        cancelacionId: this.data.cancelacion._id,
        metodo: metodoReembolso,
        monto: this.montoReembolso
      });

      const resultado = await this.cancelacionService.procesarReembolso(
        this.data.cancelacion._id,
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

      this.dialogRef.close({
        success: true,
        reembolso: resultado
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
      success: false
    });
  }

  private marcarCamposComoTocados(): void {
    Object.keys(this.reembolsoForm.controls).forEach(key => {
      const control = this.reembolsoForm.get(key);
      control?.markAsTouched();
    });
  }

  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(precio);
  }
}
