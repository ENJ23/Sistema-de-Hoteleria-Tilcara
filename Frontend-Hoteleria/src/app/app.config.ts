import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { ReservaService } from './services/reserva.service';
import { HabitacionService } from './services/habitacion.service';
import { AuthInterceptor } from './interceptors/auth.interceptor';

// Proveedor para el servicio de reservas (siempre real)
const reservaServiceProvider = {
  provide: ReservaService,
  useClass: ReservaService
};

// Proveedor para el servicio de habitaciones (siempre real)
const habitacionServiceProvider = {
  provide: HabitacionService,
  useClass: HabitacionService
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes), 
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([AuthInterceptor])),
    reservaServiceProvider,
    habitacionServiceProvider
  ]
};
