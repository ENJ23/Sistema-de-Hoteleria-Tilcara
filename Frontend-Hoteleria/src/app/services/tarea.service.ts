import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Tarea, TareaCreate, TareaCompletar, TareaResponse } from '../models/tarea.model';

@Injectable({
  providedIn: 'root'
})
export class TareaService {
  private apiUrl = `${environment.apiUrl}/tareas`;

  constructor(private http: HttpClient) { }

  // Obtener todas las tareas
  getTareas(filtros?: {
    estado?: string;
    tipo?: string;
    habitacion?: string;
  }): Observable<TareaResponse> {
    let params = new HttpParams();
    
    if (filtros) {
      if (filtros.estado) params = params.set('estado', filtros.estado);
      if (filtros.tipo) params = params.set('tipo', filtros.tipo);
      if (filtros.habitacion) params = params.set('habitacion', filtros.habitacion);
    }

    return this.http.get<TareaResponse>(this.apiUrl, { params });
  }

  // Obtener solo tareas pendientes
  getTareasPendientes(): Observable<TareaResponse> {
    return this.http.get<TareaResponse>(`${this.apiUrl}/pendientes`);
  }

  // Crear nueva tarea
  crearTarea(tarea: TareaCreate): Observable<TareaResponse> {
    return this.http.post<TareaResponse>(this.apiUrl, tarea);
  }

  // Marcar tarea como completada
  completarTarea(id: string, datos: TareaCompletar = {}): Observable<TareaResponse> {
    return this.http.patch<TareaResponse>(`${this.apiUrl}/${id}/completar`, datos);
  }

  // Eliminar tarea
  eliminarTarea(id: string): Observable<TareaResponse> {
    return this.http.delete<TareaResponse>(`${this.apiUrl}/${id}`);
  }

  // Crear tarea de limpieza automática
  crearTareaLimpieza(habitacionId: string): Observable<TareaResponse> {
    return this.http.post<TareaResponse>(`${this.apiUrl}/limpieza/${habitacionId}`, {});
  }

  // Obtener icono según tipo de tarea
  obtenerIconoTipo(tipo: string): string {
    const iconos: { [key: string]: string } = {
      'limpieza': 'cleaning_services',
      'mantenimiento': 'build',
      'otro': 'task'
    };
    return iconos[tipo] || 'task';
  }

  // Obtener color según tipo de tarea
  obtenerColorTipo(tipo: string): string {
    const colores: { [key: string]: string } = {
      'limpieza': '#4CAF50',
      'mantenimiento': '#FF9800',
      'otro': '#2196F3'
    };
    return colores[tipo] || '#757575';
  }

  // Formatear fecha para mostrar (DD/MM/YYYY HH:mm)
  formatearFecha(fecha: Date | string): string {
    const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    const day = fechaObj.getDate().toString().padStart(2, '0');
    const month = (fechaObj.getMonth() + 1).toString().padStart(2, '0');
    const year = fechaObj.getFullYear();
    const hours = fechaObj.getHours().toString().padStart(2, '0');
    const minutes = fechaObj.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  // Obtener tiempo transcurrido desde creación
  obtenerTiempoTranscurrido(fechaCreacion: Date | string): string {
    const ahora = new Date();
    const fecha = typeof fechaCreacion === 'string' ? new Date(fechaCreacion) : fechaCreacion;
    const diffMs = ahora.getTime() - fecha.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else if (diffMins > 0) {
      return `hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    } else {
      return 'ahora mismo';
    }
  }
}
