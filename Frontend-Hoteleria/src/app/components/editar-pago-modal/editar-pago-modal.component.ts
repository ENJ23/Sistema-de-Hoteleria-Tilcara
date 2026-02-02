import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

export interface EditarPagoDialogData {
  pago: {
    _id: string;
    monto: number;
    metodoPago: string;
    fechaPago: Date;
    observaciones?: string;
    registradoPor: string;
  };
  reserva: {
    _id: string;
    precioTotal: number;
    montoPagado: number;
    montoRestante: number;
    estado: string;
  };
}

@Component({
  selector: 'app-editar-pago-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './editar-pago-modal.component.html',
  styleUrls: ['./editar-pago-modal.component.scss']
})
export class EditarPagoModalComponent {
  editarPagoForm: FormGroup;
  procesando = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<EditarPagoModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditarPagoDialogData,
    private snackBar: MatSnackBar
  ) {
    // Calcular el monto máximo permitido
    const montoMaximo = this.calcularMontoMaximo();

    this.editarPagoForm = this.fb.group({
      metodoPago: [data.pago.metodoPago, Validators.required],
      monto: [data.pago.monto, [
        Validators.required, 
        Validators.min(0.01),
        Validators.max(montoMaximo)
      ]],
      fechaPago: [data.pago.fechaPago, Validators.required],
      observaciones: [data.pago.observaciones || '']
    });
  }

  private calcularMontoMaximo(): number {
    // El monto máximo es el precio total de la reserva
    // menos los otros pagos (excluyendo el que se está editando)
    const otrosPagos = this.data.reserva.montoPagado - this.data.pago.monto;
    return this.data.reserva.precioTotal - otrosPagos;
  }

  confirmarEdicion(): void {
    if (this.editarPagoForm.valid) {
      this.procesando = true;
      const datosEdicion = this.editarPagoForm.value;
      
      // Formatear la fecha a YYYY-MM-DD
      let fechaPagoStr = '';
      if (datosEdicion.fechaPago) {
        const fecha = new Date(datosEdicion.fechaPago);
        fechaPagoStr = fecha.getFullYear() + '-' + 
                      (fecha.getMonth() + 1).toString().padStart(2, '0') + '-' + 
                      fecha.getDate().toString().padStart(2, '0');
      }
      
      // Agregar información de auditoría
      const datosCompletos = {
        metodoPago: datosEdicion.metodoPago,
        monto: datosEdicion.monto,
        fechaPago: fechaPagoStr,
        observaciones: datosEdicion.observaciones,
        motivo: 'Edición de pago por usuario autorizado'
      };
      
      this.dialogRef.close({
        confirmado: true,
        datosEdicion: datosCompletos
      });
    }
  }

  cancelar(): void {
    this.dialogRef.close({ confirmado: false });
  }
}
