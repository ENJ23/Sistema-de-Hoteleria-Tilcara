import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarioOcupacionComponent } from '../../components/calendario-ocupacion/calendario-ocupacion.component';

@Component({
  selector: 'app-calendario',
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    CalendarioOcupacionComponent
  ]
})
export class CalendarioComponent {
  // Esta página simplemente contiene el componente del calendario
}
