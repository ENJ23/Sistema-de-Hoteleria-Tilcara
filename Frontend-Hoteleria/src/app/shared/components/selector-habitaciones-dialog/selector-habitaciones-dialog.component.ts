import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { Habitacion } from '../../../models/habitacion.model';

export interface SelectorHabitacionesData {
  habitaciones: Habitacion[];
  habitacionSeleccionada?: Habitacion;
}

@Component({
  selector: 'app-selector-habitaciones-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule
  ],
  templateUrl: './selector-habitaciones-dialog.component.html',
  styleUrls: ['./selector-habitaciones-dialog.component.scss']
})
export class SelectorHabitacionesDialogComponent implements OnInit {
  habitaciones: Habitacion[] = [];
  habitacionSeleccionada?: Habitacion;

  constructor(
    public dialogRef: MatDialogRef<SelectorHabitacionesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SelectorHabitacionesData
  ) {}

  ngOnInit(): void {
    this.habitaciones = this.data.habitaciones || [];
    this.habitacionSeleccionada = this.data.habitacionSeleccionada;
  }

  seleccionarHabitacion(habitacion: Habitacion): void {
    console.log('🏨 Seleccionando habitación:', habitacion);
    this.habitacionSeleccionada = habitacion;
  }

  confirmar(): void {
    if (this.habitacionSeleccionada) {
      console.log('✅ Confirmando selección:', this.habitacionSeleccionada);
      this.dialogRef.close(this.habitacionSeleccionada);
    }
  }

  cancelar(): void {
    console.log('❌ Cancelando selección');
    this.dialogRef.close();
  }
}
