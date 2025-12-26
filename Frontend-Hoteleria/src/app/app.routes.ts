import { Routes } from '@angular/router';
// Legacy HomeComponent eliminado del build activo
import { HomeComponentClean } from './pages/home/home.component.clean';
import { CalendarioComponent } from './pages/calendario/calendario.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { NuevaReservaComponent } from './pages/nueva-reserva/nueva-reserva.component';
import { ReservasComponent } from './pages/reservas/reservas.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { AuditoriaCancelacionesComponent } from './pages/auditoria-cancelaciones/auditoria-cancelaciones.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Ruta principal
  { 
    path: '', 
    component: HomeComponentClean,
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
  
  // Auditoría de Cancelaciones
  {
    path: 'auditoria-cancelaciones',
    component: AuditoriaCancelacionesComponent,
    canActivate: [AuthGuard]
  },
  
  // Auditoría de Reservas
  {
    path: 'auditoria-reservas',
    loadComponent: () => import('./pages/auditoria-reservas/auditoria-reservas.component').then(m => m.AuditoriaReservasComponent),
    canActivate: [AuthGuard]
  },
  
  // Ruta por defecto (redirige a la página principal)
  { path: '**', redirectTo: '' }
];
