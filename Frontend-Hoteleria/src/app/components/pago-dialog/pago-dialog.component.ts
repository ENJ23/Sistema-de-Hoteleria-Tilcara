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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatMenuModule } from '@angular/material/menu';

export interface PagoDialogData {
  reserva: any;
  montoTotal: number;
}

@Component({
  selector: 'app-pago-dialog',
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
    MatNativeDateModule,
    MatMenuModule
  ],
  templateUrl: './pago-dialog.component.html',
  styleUrls: ['./pago-dialog.component.scss']
})
export class PagoDialogComponent {
  pagoForm: FormGroup;
  procesando = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<PagoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PagoDialogData
  ) {
    // Calcular el monto por defecto (monto restante o total)
    const montoPorDefecto = data.reserva.montoRestante !== undefined ? 
      data.reserva.montoRestante : data.montoTotal;

    this.pagoForm = this.fb.group({
      metodoPago: ['', Validators.required],
      monto: [montoPorDefecto, [
        Validators.required, 
        Validators.min(0),
        Validators.max(data.reserva.montoRestante !== undefined ? data.reserva.montoRestante : data.montoTotal)
      ]],
      fechaPago: [new Date(), Validators.required],
      observaciones: ['']
    });
  }

  confirmarPago(): void {
    if (this.pagoForm.valid) {
      this.procesando = true;
      const pagoData = this.pagoForm.value;
      
      this.dialogRef.close({
        confirmado: true,
        metodoPago: pagoData.metodoPago,
        monto: pagoData.monto,
        fechaPago: pagoData.fechaPago,
        observaciones: pagoData.observaciones
      });
    }
  }

  cancelar(): void {
    this.dialogRef.close({ confirmado: false });
  }
}
