import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CamaInfo } from '../../models/reserva.model';

@Component({
  selector: 'app-completar-limpieza-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>Completar Limpieza</h2>
    <mat-dialog-content>
      <p>Por favor, indica cómo quedaron configuradas las camas en la habitación.</p>
      
      <form [formGroup]="form">
        <div formArrayName="camas" class="camas-container">
          <div *ngFor="let cama of camas.controls; let i=index" [formGroupName]="i" class="cama-row">
            <mat-form-field appearance="outline" class="cama-tipo">
              <mat-label>Tipo de Cama</mat-label>
              <mat-select formControlName="tipo">
                <mat-option value="matrimonial">Matrimonial</mat-option>
                <mat-option value="single">Single (Individual)</mat-option>
                <mat-option value="doble">Doble</mat-option>
                <mat-option value="queen">Queen</mat-option>
                <mat-option value="king">King</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="cama-cantidad">
              <mat-label>Cantidad</mat-label>
              <input matInput type="number" formControlName="cantidad" min="1">
            </mat-form-field>

            <button mat-icon-button color="warn" type="button" (click)="removerCama(i)" [disabled]="camas.length === 1">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </div>

        <button mat-stroked-button color="primary" type="button" (click)="agregarCama()" class="btn-agregar-cama">
          <mat-icon>add</mat-icon> Agregar Cama
        </button>

        <mat-form-field appearance="outline" class="observaciones-field">
          <mat-label>Observaciones (Opcional)</mat-label>
          <textarea matInput formControlName="observaciones" rows="2" placeholder="Ej: Faltan toallas, se reportó daño..."></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid" (click)="confirmar()">
        Completar Tarea
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .camas-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 15px;
    }
    .cama-row {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .cama-tipo {
      flex: 2;
    }
    .cama-cantidad {
      flex: 1;
    }
    .btn-agregar-cama {
      margin-bottom: 20px;
      width: 100%;
    }
    .observaciones-field {
      width: 100%;
      margin-top: 10px;
    }
  `]
})
export class CompletarLimpiezaDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CompletarLimpiezaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form = this.fb.group({
      camas: this.fb.array([this.crearCamaFormGroup()]),
      observaciones: ['']
    });
  }

  get camas() {
    return this.form.get('camas') as FormArray;
  }

  crearCamaFormGroup(): FormGroup {
    return this.fb.group({
      tipo: ['matrimonial', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]]
    });
  }

  agregarCama() {
    this.camas.push(this.crearCamaFormGroup());
  }

  removerCama(index: number) {
    if (this.camas.length > 1) {
      this.camas.removeAt(index);
    }
  }

  confirmar() {
    if (this.form.valid) {
      this.dialogRef.close({
        configuracionCamas: this.form.value.camas,
        observaciones: this.form.value.observaciones
      });
    }
  }
}
