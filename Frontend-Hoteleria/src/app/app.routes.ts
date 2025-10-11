import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { CalendarioComponent } from './pages/calendario/calendario.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { NuevaReservaComponent } from './pages/nueva-reserva/nueva-reserva.component';
import { ReservasComponent } from './pages/reservas/reservas.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Ruta principal
  { 
    path: '', 
    component: HomeComponent,
    canActivate: [AuthGuard]
  },
  
  // Autenticación
  { 
    path: 'login', 
    component: LoginComponent
  },
  { 
    path: 'register', 
    component: RegisterComponent,
    canActivate: [AuthGuard],
    data: { roles: ['admin'] }
  },
  
  // Módulo de habitaciones (carga perezosa optimizada)
  {
    path: 'habitaciones',
    loadChildren: () => import('./pages/habitaciones/habitaciones.module').then(m => m.HabitacionesModule),
    canActivate: [AuthGuard],
    data: { preload: false } // No precargar para mejor rendimiento inicial
  },
  
  // Calendario de ocupación
  {
    path: 'calendario',
    component: CalendarioComponent,
    canActivate: [AuthGuard]
  },
  
  // Nueva Reserva
  {
    path: 'nueva-reserva',
    component: NuevaReservaComponent,
    canActivate: [AuthGuard]
  },
  
  // Gestión de Reservas
  {
    path: 'reservas',
    component: ReservasComponent,
    canActivate: [AuthGuard]
  },
  
  // Dashboard de Ingresos
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard]
  },
  
  // Ruta por defecto (redirige a la página principal)
  { path: '**', redirectTo: '' }
];
