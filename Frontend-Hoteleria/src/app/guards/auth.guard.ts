import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, map, of, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';

type Role = 'admin' | 'empleado';

export interface RouteData {
  roles?: Role[];
  requiresAuth?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const routeData: RouteData = route.data as RouteData;
    
    // Si la ruta no requiere autenticación, permitir acceso
    if (routeData.requiresAuth === false) {
      return true;
    }

    // Verificar si el usuario está autenticado
    if (!this.authService.isAuthenticated()) {
      // Redirigir al login con la URL de retorno
      return this.router.createUrlTree(['/login'], { 
        queryParams: { returnUrl: state.url } 
      });
    }

    // Si la ruta no requiere roles específicos, permitir acceso
    if (!routeData.roles || routeData.roles.length === 0) {
      return true;
    }

    // Verificar si el usuario tiene alguno de los roles requeridos
    const user = this.authService.currentUserValue;
    const hasRequiredRole = user && routeData.roles.includes(user.rol as Role);
    
    if (!hasRequiredRole) {
      // Redirigir a la página de inicio o a una página de acceso denegado
      return this.router.createUrlTree(['/']);
    }

    return true;
  }
}
