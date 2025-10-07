import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';

import { Reserva } from '../../models/reserva.model';
import { Habitacion } from '../../models/habitacion.model';

export interface SeleccionReservaSimpleData {
  reservas: Reserva[];
  habitacion: Habitacion;
  dia: Date;
}

@Component({
  selector: 'app-seleccion-reserva-simple',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule
  ],
  templateUrl: './seleccion-reserva-simple.component.html',
  styleUrls: ['./seleccion-reserva-simple.component.scss']
})
export class SeleccionReservaSimpleComponent implements OnInit {
  reservas: Reserva[] = [];
  habitacion: Habitacion;
  dia: Date;
  fechaFormateada: string = '';

  constructor(
    public dialogRef: MatDialogRef<SeleccionReservaSimpleComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SeleccionReservaSimpleData
  ) {
    this.reservas = data.reservas;
    this.habitacion = data.habitacion;
    this.dia = data.dia;
  }

  ngOnInit(): void {
    const day = this.dia.getDate().toString().padStart(2, '0');
    const month = (this.dia.getMonth() + 1).toString().padStart(2, '0');
    const year = this.dia.getFullYear();
    this.fechaFormateada = `${day}/${month}/${year}`;
  }

  seleccionarReserva(reserva: Reserva): void {
    this.dialogRef.close({ 
      accion: 'verDetalle', 
      reserva: reserva 
    });
  }


  cancelar(): void {
    this.dialogRef.close({ accion: 'cancelar' });
  }

  obtenerColorEstado(estado: string): string {
    const colores: { [key: string]: string } = {
      'Pendiente': '#FFC107',
      'Confirmada': '#17a2b8',
      'En curso': '#28a745',
      'Finalizada': '#007bff',
      'Cancelada': '#dc3545',
      'No Show': '#6c757d'
    };
    return colores[estado] || '#6c757d';
  }

  obtenerIconoEstado(estado: string): string {
    const iconos: { [key: string]: string } = {
      'Pendiente': 'schedule',
      'Confirmada': 'check_circle',
      'En curso': 'hotel',
      'Finalizada': 'done_all',
      'Cancelada': 'cancel',
      'No Show': 'person_off'
    };
    return iconos[estado] || 'help';
  }

  obtenerTipoDia(reserva: Reserva): string {
    const fechaStr = this.dia.toISOString().split('T')[0];
    const fechaEntrada = new Date(reserva.fechaEntrada).toISOString().split('T')[0];
    const fechaSalida = new Date(reserva.fechaSalida).toISOString().split('T')[0];
    
    if (fechaStr === fechaEntrada && fechaStr === fechaSalida) {
      return 'Entrada y Salida';
    } else if (fechaStr === fechaEntrada) {
      return 'Entrada';
    } else if (fechaStr === fechaSalida) {
      return 'Salida';
    } else {
      return 'Estancia';
    }
  }

  obtenerColorTipoDia(tipo: string): string {
    const colores: { [key: string]: string } = {
      'Entrada': '#4CAF50',
      'Salida': '#FF9800',
      'Entrada y Salida': '#9C27B0',
      'Estancia': '#2196F3'
    };
    return colores[tipo] || '#757575';
  }

  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(precio);
  }

  obtenerEstadoPago(reserva: Reserva): { texto: string, color: string, icon: string } {
    if (reserva.estaCompletamentePagado) {
      return { texto: 'Pagado', color: '#4CAF50', icon: 'check_circle' };
    } else if (reserva.montoPagado && reserva.montoPagado > 0) {
      return { texto: 'Parcial', color: '#FF9800', icon: 'schedule' };
    } else {
      return { texto: 'Sin pago', color: '#F44336', icon: 'cancel' };
    }
  }
}
