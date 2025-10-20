import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CancelacionReserva {
  _id: string;
  reservaId: string;
  cliente: {
    nombre: string;
    apellido: string;
    email?: string;
    telefono?: string;
    documento?: string;
  };
  habitacion: {
    numero: string;
    tipo: string;
  };
  fechaEntrada: string;
  fechaSalida: string;
  precioTotal: number;
  montoPagado: number;
  montoRestante: number;
  historialPagos: Array<{
    monto: number;
    metodoPago: string;
    fechaPago: string;
    observaciones?: string;
    registradoPor: string;
  }>;
  motivoCancelacion: string;
  canceladoPor: string;
  fechaCancelacion: string;
  estadoReembolso: 'Pendiente' | 'Procesado' | 'Completado' | 'Rechazado';
  reembolso?: {
    monto: number;
    metodoReembolso: string;
    fechaReembolso: string;
    procesadoPor: string;
    observaciones?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CancelacionResponse {
  cancelaciones: CancelacionReserva[];
  total: number;
}

export interface EstadisticasReembolsos {
  estadisticas: Array<{
    _id: string;
    count: number;
    montoTotal: number;
  }>;
  totalCancelaciones: number;
  totalMontoReembolsos: number;
}

export interface ProcesarReembolsoRequest {
  metodoReembolso: 'Efectivo' | 'Transferencia' | 'Tarjeta de Crédito' | 'Tarjeta de Débito' | 'Cheque';
  observaciones?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CancelacionService {
  private apiUrl = `${environment.apiUrl}/reservas`;

  constructor(private http: HttpClient) {}

  // Obtener todas las cancelaciones
  getCancelaciones(filtros?: {
    estadoReembolso?: string;
    fechaInicio?: string;
    fechaFin?: string;
  }): Observable<CancelacionResponse> {
    let params = new HttpParams();
    
    if (filtros) {
      if (filtros.estadoReembolso) {
        params = params.set('estadoReembolso', filtros.estadoReembolso);
      }
      if (filtros.fechaInicio) {
        params = params.set('fechaInicio', filtros.fechaInicio);
      }
      if (filtros.fechaFin) {
        params = params.set('fechaFin', filtros.fechaFin);
      }
    }

    console.log('🔍 CancelacionService.getCancelaciones llamado con:', { filtros, params: params.toString() });
    console.log('🌐 URL completa:', `${this.apiUrl}/cancelaciones`);

    return this.http.get<CancelacionResponse>(`${this.apiUrl}/cancelaciones`, { params });
  }

  // Obtener una cancelación específica
  getCancelacion(id: string): Observable<CancelacionReserva> {
    return this.http.get<CancelacionReserva>(`${this.apiUrl}/cancelaciones/${id}`);
  }

  // Procesar reembolso
  procesarReembolso(cancelacionId: string, datos: ProcesarReembolsoRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/cancelaciones/${cancelacionId}/reembolso`, datos);
  }

  // Completar reembolso
  completarReembolso(cancelacionId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/cancelaciones/${cancelacionId}/reembolso/completar`, {});
  }

  // Obtener estadísticas de reembolsos
  getEstadisticasReembolsos(): Observable<EstadisticasReembolsos> {
    return this.http.get<EstadisticasReembolsos>(`${this.apiUrl}/cancelaciones/estadisticas`);
  }
}
