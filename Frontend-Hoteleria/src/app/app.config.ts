import { ApplicationConfig, provideZoneChangeDetection, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { ReservaService } from './services/reserva.service';
import { HabitacionService } from './services/habitacion.service';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { tokenRefreshInterceptor } from './core/interceptors/token-refresh.interceptor';
import { httpCacheInterceptor } from './core/interceptors/http-cache.interceptor';
import { timeoutInterceptor } from './core/interceptors/timeout.interceptor';
import { retryInterceptor } from './core/interceptors/retry.interceptor';

// Registrar datos de locale
registerLocaleData(localeEsAr, 'es-AR');

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
    { provide: LOCALE_ID, useValue: 'es-AR' },
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([
      timeoutInterceptor,
      retryInterceptor,
      AuthInterceptor,
      tokenRefreshInterceptor,
      httpCacheInterceptor
    ])),
    reservaServiceProvider,
    habitacionServiceProvider
  ]
};
