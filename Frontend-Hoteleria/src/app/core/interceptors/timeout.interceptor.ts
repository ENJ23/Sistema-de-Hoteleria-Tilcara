import { HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timeout } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export function timeoutInterceptor(req: HttpRequest<any>, next: HttpHandlerFn): Observable<any> {
  // Configurar timeout basado en el entorno
  const timeoutDuration = environment.production ? 30000 : 15000; // 30s prod, 15s dev
  
  return next(req).pipe(
    timeout(timeoutDuration),
    catchError((error: any) => {
      if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
        console.error('⏰ Timeout en petición:', req.url);
        return throwError(() => new Error('La petición tardó demasiado. Verifica tu conexión a internet.'));
      }
      return throwError(() => error);
    })
  );
}

