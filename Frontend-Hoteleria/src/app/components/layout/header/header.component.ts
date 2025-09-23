import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../services/auth.service';
import { DateTimeService } from '../../../services/date-time.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  isLoggedIn = false;
  isEncargado = false;
  isLimpieza = false;
  isMantenimiento = false;
  userName: string | null = null;
  userRole: string | null = null;
  currentTime = new Date();
  isMenuOpen = false;
  isUserMenuOpen = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private dateTimeService: DateTimeService
  ) {}

  ngOnInit() {
    // Suscribirse a los cambios en el estado de autenticación
    this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
      this.isEncargado = user?.rol === 'encargado';
      this.isLimpieza = user?.rol === 'limpieza';
      this.isMantenimiento = user?.rol === 'mantenimiento';
      this.userName = user?.nombre || null;
      this.userRole = user?.rol || null;
    });

    // Actualizar la hora cada minuto
    setInterval(() => {
      this.currentTime = this.dateTimeService.getCurrentDate();
    }, 60000);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleUserMenu() {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  getRoleDisplayName(): string {
    switch (this.userRole) {
      case 'encargado': return 'Encargado';
      case 'limpieza': return 'Limpieza';
      case 'mantenimiento': return 'Mantenimiento';
      default: return 'Usuario';
    }
  }

  getRoleIcon(): string {
    switch (this.userRole) {
      case 'encargado': return 'admin_panel_settings';
      case 'limpieza': return 'cleaning_services';
      case 'mantenimiento': return 'handyman';
      default: return 'person';
    }
  }

  getGreeting(): string {
    const hour = this.currentTime.getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }
}
