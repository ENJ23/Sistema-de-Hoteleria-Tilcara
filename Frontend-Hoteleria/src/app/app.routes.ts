import { Routes } from '@angular/router';
// Legacy HomeComponent eliminado del build activo
import { HomeComponentClean } from './pages/home/home.component.clean';
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
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  { 
    path: 'register', 
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent),
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
    loadComponent: () => import('./pages/calendario/calendario.component').then(m => m.CalendarioComponent),
    canActivate: [AuthGuard]
  },
  
  // Nueva Reserva
  {
    path: 'nueva-reserva',
    loadComponent: () => import('./pages/nueva-reserva/nueva-reserva.component').then(m => m.NuevaReservaComponent),
    canActivate: [AuthGuard]
  },
  
  // Gestión de Reservas
  {
    path: 'reservas',
    loadComponent: () => import('./pages/reservas/reservas.component').then(m => m.ReservasComponent),
    canActivate: [AuthGuard]
  },
  
  // Dashboard de Ingresos
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard]
  },
  
  // Auditoría de Cancelaciones
  {
    path: 'auditoria-cancelaciones',
    loadComponent: () => import('./pages/auditoria-cancelaciones/auditoria-cancelaciones.component').then(m => m.AuditoriaCancelacionesComponent),
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
