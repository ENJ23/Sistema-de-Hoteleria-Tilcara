import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

// Material Modules
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Components
import { ListaHabitacionesComponent } from './lista-habitaciones/lista-habitaciones.component';
import { FormularioHabitacionComponent } from './formulario-habitacion/formulario-habitacion.component';
import { DetalleHabitacionComponent } from './detalle-habitacion/detalle-habitacion.component';

// Los componentes standalone se importan directamente en los componentes que los necesitan
// No es necesario importar SharedModule si solo contiene componentes standalone

const routes: Routes = [
  { path: '', component: ListaHabitacionesComponent },
  { path: 'nueva', component: FormularioHabitacionComponent },
  { path: 'editar/:id', component: FormularioHabitacionComponent },
  { path: ':id', component: DetalleHabitacionComponent }
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    ReactiveFormsModule,
    // No importamos componentes standalone aquí
    // Material Modules
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ]
})
export class HabitacionesModule { }
