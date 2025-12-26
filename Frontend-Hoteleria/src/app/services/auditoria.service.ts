import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface HistorialCambio {
  fecha: Date;
  usuario: string;
  rol: string;
  accion: string;
  detalles: string;
  estadoAnterior?: string;
  estadoNuevo?: string;
}

export interface RegistroAuditoria {
  reservaId: string;
  cliente: {
    nombre: string;
    apellido: string;
    email?: string;
  };
  habitacion: {
    _id: string;
    numero: string;
    tipo: string;
  };
  fechaEntrada: string;
  fechaSalida: string;
  estado: string;
  cambio: HistorialCambio;
}

export interface AuditoriaResponse {
  historial: RegistroAuditoria[];
  total: number;
  page: number;
  totalPages: number;
}

export interface FiltrosAuditoria {
  fechaInicio?: string;
  fechaFin?: string;
  accion?: string;
  usuario?: string;
  page?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuditoriaService {
  private apiUrl = `${environment.apiUrl}/reservas`;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene el historial completo de cambios de todas las reservas
   */
  getHistorialAuditoria(filtros?: FiltrosAuditoria): Observable<AuditoriaResponse> {
    console.log('🔍 AuditoriaService.getHistorialAuditoria llamado con:', filtros);

    let params = new HttpParams();

    if (filtros) {
      if (filtros.fechaInicio) params = params.set('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params = params.set('fechaFin', filtros.fechaFin);
      if (filtros.accion) params = params.set('accion', filtros.accion);
      if (filtros.usuario) params = params.set('usuario', filtros.usuario);
      if (filtros.page) params = params.set('page', filtros.page.toString());
      if (filtros.limit) params = params.set('limit', filtros.limit.toString());
    }

    // Agregar timestamp para evitar cache
    params = params.set('t', Date.now().toString());

    console.log('🌐 Llamando a:', `${this.apiUrl}/auditoria/historial`, 'con params:', params.toString());
    
    return this.http.get<AuditoriaResponse>(`${this.apiUrl}/auditoria/historial`, { params });
  }

  /**
   * Obtiene el historial de cambios de una reserva específica
   */
  getHistorialReserva(reservaId: string): Observable<HistorialCambio[]> {
    return this.http.get<HistorialCambio[]>(`${this.apiUrl}/${reservaId}/historial`);
  }

  /**
   * Exporta el historial de auditoría a CSV
   */
  exportarHistorialCSV(filtros?: FiltrosAuditoria): Observable<Blob> {
    let params = new HttpParams();

    if (filtros) {
      if (filtros.fechaInicio) params = params.set('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params = params.set('fechaFin', filtros.fechaFin);
      if (filtros.accion) params = params.set('accion', filtros.accion);
      if (filtros.usuario) params = params.set('usuario', filtros.usuario);
    }

    return this.http.get(`${this.apiUrl}/auditoria/historial/export`, {
      params,
      responseType: 'blob'
    });
  }

  /**
   * Obtiene estadísticas del historial de auditoría
   */
  getEstadisticasAuditoria(fechaInicio?: string, fechaFin?: string): Observable<any> {
    let params = new HttpParams();
    if (fechaInicio) params = params.set('fechaInicio', fechaInicio);
    if (fechaFin) params = params.set('fechaFin', fechaFin);

    return this.http.get(`${this.apiUrl}/auditoria/estadisticas`, { params });
  }
}
