import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { HeaderComponent } from '../../components/layout/header/header.component';
import { ReservasComponent } from '../../components/reservas/reservas.component';
import { CalendarioComponent } from '../../components/calendario/calendario.component';
import { DetalleReservaComponent } from '../../components/detalle-reserva/detalle-reserva.component';
import { Reserva } from '../../models/reserva.model';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatTabsModule,
    HeaderComponent,
    ReservasComponent,
    CalendarioComponent,
    DetalleReservaComponent
  ],
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css']
})
export class InicioComponent {
  selectedTab = 0;
  selectedReservation: Reserva | null = null;

  onReservationSelected(event: Event | Reserva) {
    // Si el evento es un CustomEvent, extraer el detalle
    if (event instanceof CustomEvent && event.detail) {
      this.selectedReservation = event.detail as Reserva;
    } else if ('_id' in event) {
      // Si ya es un objeto Reserva
      this.selectedReservation = event as Reserva;
    } else {
      // En caso de cualquier otro tipo de evento
      console.warn('Tipo de evento no manejado:', event);
      this.selectedReservation = null;
    }
  }

  onReservationUpdated(event: Event | Reserva) {
    // Misma lógica que onReservationSelected
    if (event instanceof CustomEvent && event.detail) {
      this.selectedReservation = event.detail as Reserva;
    } else if ('_id' in event) {
      this.selectedReservation = event as Reserva;
    } else {
      console.warn('Tipo de evento no manejado:', event);
      this.selectedReservation = null;
    }
  }
}
