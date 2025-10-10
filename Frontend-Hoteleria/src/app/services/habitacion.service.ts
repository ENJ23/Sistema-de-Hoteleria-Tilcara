import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

import { 
  Habitacion, 
  HabitacionCreate, 
  HabitacionUpdate, 
  HabitacionFilters,
  TipoHabitacion,
  EstadoHabitacion 
} from '../models/habitacion.model';
import { environment } from '../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface HabitacionResponse {
  habitaciones: Habitacion[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

@Injectable({
  providedIn: 'root'
})
export class HabitacionService {
  private apiUrl = `${environment.apiUrl}/habitaciones`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // Obtener todas las habitaciones con filtros opcionales y paginación
  getHabitaciones(
    page: number = 1, 
    limit: number = 10, 
    estado?: EstadoHabitacion, 
    tipo?: TipoHabitacion,
    busqueda?: string
  ): Observable<HabitacionResponse> {
    console.log('Solicitando habitaciones con parámetros:', { page, limit, estado, tipo, busqueda });
    
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
      // CORREGIDO: No filtrar por activa para mostrar todas las habitaciones

    if (estado) params = params.set('estado', estado);
    if (tipo) params = params.set('tipo', tipo);
    if (busqueda) params = params.set('search', busqueda);

    const headers = this.authService.getAuthHeaders();
    console.log('Headers de autenticación:', headers);

    return this.http.get<any>(
      this.apiUrl, 
      { 
        params,
        headers: headers
      }
    ).pipe(
      tap(response => {
        console.log('Respuesta del servidor (habitaciones):', response);
        console.log('URL de la petición:', this.apiUrl);
        console.log('Parámetros:', params.toString());
      }),
      map(response => {
        // Ajustar la respuesta para que coincida con la interfaz HabitacionResponse
        const result: HabitacionResponse = {
          habitaciones: response.habitaciones || [],
          total: response.total || 0,
          page: response.currentPage || 1,
          totalPages: response.totalPages || 1,
          limit: parseInt(limit.toString()) || 10
        };
        console.log('Datos de habitaciones procesados:', result);
        return result;
      }),
      catchError(error => {
        console.error('Error al obtener habitaciones:', error);
        return this.handleError(error);
      })
    );
  }

  // Obtener una habitación por ID
  getHabitacion(id: string): Observable<Habitacion> {
    return this.http.get<Habitacion>(
      `${this.apiUrl}/${id}`,
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Obtener solo habitaciones activas (para calendario de ocupación)
  getHabitacionesActivas(): Observable<HabitacionResponse> {
    console.log('Solicitando habitaciones activas para calendario');
    
    let params = new HttpParams()
      .set('page', '1')
      .set('limit', '100') // Límite alto para obtener todas
      .set('activa', 'true'); // Solo habitaciones activas

    const headers = this.authService.getAuthHeaders();

    return this.http.get<any>(
      this.apiUrl, 
      { 
        params,
        headers: headers
      }
    ).pipe(
      tap(response => {
        console.log('Respuesta del servidor (habitaciones activas):', response);
      }),
      map(response => {
        const result: HabitacionResponse = {
          habitaciones: response.habitaciones || [],
          total: response.total || 0,
          page: response.currentPage || 1,
          totalPages: response.totalPages || 1,
          limit: 100
        };
        console.log('Datos de habitaciones activas procesados:', result);
        return result;
      }),
      catchError(error => {
        console.error('Error al obtener habitaciones activas:', error);
        return this.handleError(error);
      })
    );
  }

  // Crear una nueva habitación
  createHabitacion(habitacion: HabitacionCreate): Observable<Habitacion> {
    return this.http.post<Habitacion>(
      this.apiUrl, 
      habitacion,
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Actualizar una habitación
  updateHabitacion(id: string, habitacion: HabitacionUpdate): Observable<Habitacion> {
    return this.http.put<Habitacion>(
      `${this.apiUrl}/${id}`, 
      habitacion,
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Eliminar una habitación
  deleteHabitacion(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`,
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Manejar errores de las peticiones HTTP
  private handleError(error: HttpErrorResponse) {
    console.error('Error en la petición HTTP:', error);
    let errorMessage = 'Ocurrió un error en la petición';
    
    if (error.status === 0) {
      errorMessage = 'No se pudo conectar con el servidor';
    } else if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.status === 401) {
      errorMessage = 'No estás autorizado para realizar esta acción';
    } else if (error.status === 403) {
      errorMessage = 'No tienes permisos para realizar esta acción';
    } else if (error.status === 404) {
      errorMessage = 'Recurso no encontrado';
    } else if (error.status >= 500) {
      errorMessage = 'Error del servidor';
    }
    
    return throwError(() => new Error(errorMessage));
  }

  // Obtener habitaciones disponibles para un rango de fechas
  getHabitacionesDisponibles(fechaInicio: string, fechaFin: string): Observable<Habitacion[]> {
    const params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);
    
    return this.http.get<Habitacion[]>(
      `${this.apiUrl}/disponibles`, 
      { 
        params,
        headers: this.authService.getAuthHeaders() 
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Actualizar el estado de una habitación
  updateEstado(id: string, estado: string): Observable<Habitacion> {
    return this.http.patch<Habitacion>(
      `${this.apiUrl}/${id}/estado`, 
      { estado },
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Actualizar el precio de una habitación
  updatePrecio(id: string, precio: number): Observable<Habitacion> {
    return this.http.patch<Habitacion>(
      `${this.apiUrl}/${id}/precio`, 
      { precio },
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Verificar si existe una habitación por número
  checkNumeroExists(numero: string, excludeId?: string): Observable<boolean> {
    let params = new HttpParams().set('numero', numero);
    if (excludeId) {
      params = params.set('excludeId', excludeId);
    }
    
    return this.http.get<{ exists: boolean }>(
      `${this.apiUrl}/check-numero`,
      { 
        params,
        headers: this.authService.getAuthHeaders() 
      }
    ).pipe(
      map(response => response.exists || false),
      catchError(error => {
        // Si el error es 404 (no encontrado), asumimos que el número no existe
        if (error.status === 404) {
          return of(false);
        }
        // Para otros errores, usamos el manejador de errores estándar
        return this.handleError(error);
      })
    );
  }

  // Obtener estadísticas de habitaciones
  getEstadisticas(): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/estadisticas`,
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Obtener tipos de habitación disponibles
  getTiposHabitacion(): TipoHabitacion[] {
    return ['Individual', 'Doble', 'Triple', 'Suite', 'Familiar'];
  }

  // Obtener estados de habitación disponibles
  getEstadosHabitacion(): EstadoHabitacion[] {
    return ['Disponible', 'Ocupada', 'Mantenimiento', 'Reservada', 'Fuera de servicio'];
  }

  // Cambiar el estado de una habitación
  cambiarEstadoHabitacion(id: string, estado: EstadoHabitacion): Observable<Habitacion> {
    return this.http.patch<Habitacion>(
      `${this.apiUrl}/${id}/estado`,
      { estado },
      { headers: this.authService.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Obtener el color según el estado de la habitación
  getEstadoColor(estado: EstadoHabitacion): string {
    const colores: Record<EstadoHabitacion, string> = {
      'Disponible': 'primary',
      'Ocupada': 'warn',
      'Mantenimiento': 'accent',
      'Reservada': 'accent',
      'Fuera de servicio': 'warn'
    };
    return colores[estado] || '';
  }
} 