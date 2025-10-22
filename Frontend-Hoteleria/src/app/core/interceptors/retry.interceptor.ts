import { HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { retryWhen, mergeMap, take, catchError } from 'rxjs/operators';

export function retryInterceptor(req: HttpRequest<any>, next: HttpHandlerFn): Observable<any> {
  // Solo reintentar para errores de red, no para errores 401/403
  return next(req).pipe(
    retryWhen(errors => 
      errors.pipe(
        mergeMap((error: HttpErrorResponse, index) => {
          // No reintentar para errores de autenticación
          if (error.status === 401 || error.status === 403) {
            return throwError(() => error);
          }
          
          // No reintentar para errores del cliente (4xx excepto 429)
          if (error.status >= 400 && error.status < 500 && error.status !== 429) {
            return throwError(() => error);
          }
          
          // Máximo 3 reintentos
          if (index >= 2) {
            return throwError(() => error);
          }
          
          // Esperar tiempo exponencial: 1s, 2s, 4s
          const delay = Math.pow(2, index) * 1000;
          console.log(`🔄 Reintentando petición en ${delay}ms (intento ${index + 1}/3)`);
          
          return timer(delay);
        }),
        take(3)
      )
    )
  );
}

