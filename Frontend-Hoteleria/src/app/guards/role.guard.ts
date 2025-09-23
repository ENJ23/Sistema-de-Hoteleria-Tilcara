import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
    // Obtener los roles requeridos de la ruta
    const requiredRoles = route.data['roles'] as Array<string>;
    
    // Si no hay roles requeridos, permitir el acceso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Verificar si el usuario tiene alguno de los roles requeridos
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (user && requiredRoles.includes(user.rol)) {
          return true;
        }
        
        // Redirigir a la página de inicio si no tiene permisos
        this.router.navigate(['/']);
        return false;
      })
    );
  }
}
