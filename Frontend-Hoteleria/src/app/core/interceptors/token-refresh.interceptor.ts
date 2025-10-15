import { inject } from '@angular/core';
import { HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

// Variables globales para el estado de refresh
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<any>(null);

export function tokenRefreshInterceptor(req: HttpRequest<any>, next: HttpHandlerFn): Observable<any> {
    const authService = inject(AuthService);
    
    // Solo interceptar requests autenticados
    if (!req.headers.has('Authorization')) {
      return next(req);
    }

    return next(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !req.url.includes('/auth/refresh')) {
          return handle401Error(req, next, authService);
        }
        return throwError(() => error);
      })
    );
}

function handle401Error(request: HttpRequest<any>, next: HttpHandlerFn, authService: AuthService): Observable<any> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    const refreshToken = authService.getRefreshToken();
    
    if (refreshToken) {
      return authService.refreshToken().pipe(
        switchMap((response: any) => {
          isRefreshing = false;
          refreshTokenSubject.next(response.accessToken);
          
          // Actualizar el request con el nuevo token
          const newRequest = addTokenHeader(request, response.accessToken);
          return next(newRequest);
        }),
        catchError((error) => {
          isRefreshing = false;
          authService.logout();
          return throwError(() => error);
        })
      );
    } else {
      isRefreshing = false;
      authService.logout();
      return throwError(() => new Error('No refresh token available'));
    }
  }

  // Si ya se está refrescando, esperar a que termine
  return refreshTokenSubject.pipe(
    filter(token => token !== null),
    take(1),
    switchMap((token) => {
      const newRequest = addTokenHeader(request, token);
      return next(newRequest);
    })
  );
}

function addTokenHeader(request: HttpRequest<any>, token: string): HttpRequest<any> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}
