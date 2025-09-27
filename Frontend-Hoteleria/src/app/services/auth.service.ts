import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { Router } from '@angular/router';
import { StorageService } from '../core/services/storage.service';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: 'encargado' | 'limpieza' | 'mantenimiento';
}

export interface LoginResponse {
  message: string;
  usuario: {
    id: string;
    nombre: string;
    email: string;
    rol: 'encargado' | 'limpieza' | 'mantenimiento';
  };
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;

  constructor(
    private http: HttpClient, 
    private router: Router,
    private storageService: StorageService
  ) {
    const storedUser = this.storageService.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<User | null>(
      storedUser ? JSON.parse(storedUser) : null
    );
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap(response => {
          const user = response.usuario;
          this.storageService.setItem('currentUser', JSON.stringify(user));
          this.storageService.setItem('token', response.token);
          this.currentUserSubject.next(user);
        })
      );
  }

  register(userData: {
    nombre: string;
    email: string;
    password: string;
    rol: 'encargado' | 'limpieza' | 'mantenimiento';
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/registro`, userData);
  }

  logout(): void {
    this.storageService.removeItem('currentUser');
    this.storageService.removeItem('token');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.storageService.getItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  isEncargado(): boolean {
    const user = this.currentUserValue;
    return user ? user.rol === 'encargado' : false;
  }

  isLimpieza(): boolean {
    const user = this.currentUserValue;
    return user ? user.rol === 'limpieza' : false;
  }

  isMantenimiento(): boolean {
    const user = this.currentUserValue;
    return user ? user.rol === 'mantenimiento' : false;
  }

  isUsuarioValido(): boolean {
    const user = this.currentUserValue;
    return user ? ['encargado', 'limpieza', 'mantenimiento'].includes(user.rol) : false;
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  verifyToken(): Observable<boolean> {
    const token = this.getToken();
    if (!token) {
      return new Observable(subscriber => {
        subscriber.next(false);
        subscriber.complete();
      });
    }

    return this.http.get<{valid: boolean}>(`${this.apiUrl}/verificar-token`)
      .pipe(
        map(response => response.valid)
      );
  }
}
