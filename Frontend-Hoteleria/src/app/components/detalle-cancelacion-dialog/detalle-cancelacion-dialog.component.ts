import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { CancelacionReserva } from '../../services/cancelacion.service';

@Component({
  selector: 'app-detalle-cancelacion-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  templateUrl: './detalle-cancelacion-dialog.component.html',
  styleUrls: ['./detalle-cancelacion-dialog.component.scss']
})
export class DetalleCancelacionDialogComponent {
  cancelacion: CancelacionReserva;

  constructor(
    public dialogRef: MatDialogRef<DetalleCancelacionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { cancelacion: CancelacionReserva },
    private snackBar: MatSnackBar
  ) {
    this.cancelacion = data.cancelacion;
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(precio);
  }

  formatearFecha(fecha: Date | string): string {
    const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return fechaObj.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'Pendiente': return 'warn';
      case 'Procesado': return 'primary';
      case 'Completado': return 'accent';
      case 'Rechazado': return 'warn';
      default: return 'basic';
    }
  }

  getEstadoIcon(estado: string): string {
    switch (estado) {
      case 'Pendiente': return 'schedule';
      case 'Procesado': return 'autorenew';
      case 'Completado': return 'check_circle';
      case 'Rechazado': return 'cancel';
      default: return 'help';
    }
  }

  copiarAlPortapapeles(texto: string): void {
    navigator.clipboard.writeText(texto).then(() => {
      this.snackBar.open('📋 Copiado al portapapeles', 'Cerrar', {
        duration: 2000
      });
    }).catch(() => {
      this.snackBar.open('❌ Error al copiar', 'Cerrar', {
        duration: 2000
      });
    });
  }

  calcularDiasEstancia(): number {
    const entrada = new Date(this.cancelacion.fechaEntrada);
    const salida = new Date(this.cancelacion.fechaSalida);
    const diffTime = Math.abs(salida.getTime() - entrada.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  calcularPrecioPorNoche(): number {
    const dias = this.calcularDiasEstancia();
    return dias > 0 ? this.cancelacion.precioTotal / dias : 0;
  }
}
