import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConnectivityService {
  private lastCheck: number = 0;
  private isOnline: boolean = true;
  private readonly CHECK_INTERVAL = 30000; // 30 segundos
  private readonly TIMEOUT_DURATION = 5000; // 5 segundos

  constructor(private http: HttpClient) {
    // Verificar conectividad al inicializar
    this.checkConnectivity();
    
    // Verificar conectividad periódicamente
    setInterval(() => {
      this.checkConnectivity();
    }, this.CHECK_INTERVAL);
  }

  /**
   * Verifica si hay conectividad con el servidor
   */
  checkConnectivity(): Observable<boolean> {
    const now = Date.now();
    
    // Si ya se verificó recientemente, devolver el estado actual
    if (now - this.lastCheck < 10000) { // 10 segundos
      return of(this.isOnline);
    }

    this.lastCheck = now;

    // Hacer ping al endpoint de salud del servidor
    return this.http.get(`${environment.apiUrl}/health`).pipe(
      timeout(this.TIMEOUT_DURATION),
      map(() => {
        this.isOnline = true;
        return true;
      }),
      catchError((error) => {
        this.isOnline = false;
        console.warn('⚠️ Sin conectividad:', error);
        return of(false);
      })
    );
  }

  /**
   * Verifica si el usuario está online
   */
  isUserOnline(): boolean {
    return navigator.onLine && this.isOnline;
  }

  /**
   * Obtiene el estado de conectividad
   */
  getConnectivityStatus(): { online: boolean; lastCheck: number } {
    return {
      online: this.isUserOnline(),
      lastCheck: this.lastCheck
    };
  }

  /**
   * Verifica conectividad antes de una operación crítica
   */
  ensureConnectivity(): Observable<boolean> {
    if (!navigator.onLine) {
      return throwError(() => new Error('Sin conexión a internet'));
    }

    if (!this.isOnline) {
      return this.checkConnectivity().pipe(
        map(online => {
          if (!online) {
            throw new Error('Sin conexión al servidor');
          }
          return true;
        })
      );
    }

    return of(true);
  }
}

