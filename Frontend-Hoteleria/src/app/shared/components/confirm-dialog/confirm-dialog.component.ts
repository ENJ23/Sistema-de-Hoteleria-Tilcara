import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';

// Material
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

// CDK
import { A11yModule } from '@angular/cdk/a11y';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    // Material
    MatDialogModule,
    MatButtonModule,
    // CDK
    A11yModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.titulo || 'Confirmar' }}</h2>
    <mat-dialog-content>
      {{ data.mensaje || '¿Está seguro de realizar esta acción?' }}
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onNoClick()">Cancelar</button>
      <button mat-button [color]="data.tipo || 'primary'" [mat-dialog-close]="true" cdkFocusInitial>
        {{ data.botonAceptar || 'Aceptar' }}
      </button>
    </mat-dialog-actions>
  `
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      titulo?: string;
      mensaje: string;
      tipo?: 'primary' | 'accent' | 'warn';
      botonAceptar?: string;
    }
  ) {}

  onNoClick(): void {
    this.dialogRef.close(false);
  }
}
