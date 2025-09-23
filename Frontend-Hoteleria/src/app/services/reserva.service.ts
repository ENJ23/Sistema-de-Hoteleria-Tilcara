import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

import { 
  Reserva, 
  ReservaCreate, 
  ReservaUpdate, 
  ReservaFilters, 
  ReservaResponse 
} from '../models/reserva.model';


@Injectable({
  providedIn: 'root'
})
export class ReservaService {
  private apiUrl = `${environment.apiUrl}/reservas`;

  constructor(private http: HttpClient) {}

  // Obtener todas las reservas con filtros opcionales
  getReservas(filtros?: ReservaFilters, pagina: number = 1, porPagina: number = 10): Observable<ReservaResponse> {
    let params = new HttpParams()
      .set('pagina', pagina.toString())
      .set('porPagina', porPagina.toString());

    if (filtros) {
      if (filtros.fechaInicio) params = params.set('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params = params.set('fechaFin', filtros.fechaFin);
      if (filtros.estado) params = params.set('estado', filtros.estado);
          if (filtros.cliente) {
      // Los clientes ahora están embebidos, no hay ID
      params = params.set('clienteEmail', filtros.cliente.email);
    }
      if (filtros.habitacion) {
        const habitacionId = typeof filtros.habitacion === 'string' ? filtros.habitacion : filtros.habitacion._id;
        params = params.set('habitacion', habitacionId);
      }
      if (filtros.pagado !== undefined) params = params.set('pagado', filtros.pagado.toString());
    }

    return this.http.get<ReservaResponse>(this.apiUrl, { params });
  }

  // Obtener una reserva por ID
  getReserva(id: string): Observable<Reserva> {
    return this.http.get<Reserva>(`${this.apiUrl}/${id}`);
  }

  // Crear una nueva reserva
  createReserva(reserva: ReservaCreate): Observable<Reserva> {
    return this.http.post<Reserva>(this.apiUrl, reserva);
  }

  // Actualizar una reserva
  updateReserva(id: string, reserva: ReservaUpdate): Observable<Reserva> {
    return this.http.put<Reserva>(`${this.apiUrl}/${id}`, reserva);
  }

  // Eliminar una reserva
  deleteReserva(id: string): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/${id}`);
  }

  // Actualizar el estado de una reserva
  updateEstado(id: string, estado: string): Observable<Reserva> {
    return this.http.patch<Reserva>(`${this.apiUrl}/${id}/estado`, { estado });
  }

  // Actualizar el estado de pago de una reserva
  updatePago(id: string, pagado: boolean): Observable<Reserva> {
    return this.http.patch<Reserva>(`${this.apiUrl}/${id}/pago`, { pagado });
  }

  // Verificar disponibilidad de habitación para un rango de fechas
  checkDisponibilidad(habitacionId: string, fechaInicio: string, fechaFin: string, excludeReservaId?: string): Observable<boolean> {
    let params = new HttpParams()
      .set('habitacionId', habitacionId)
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);
    
    if (excludeReservaId) {
      params = params.set('excludeReservaId', excludeReservaId);
    }

    return this.http.get<boolean>(`${this.apiUrl}/check-disponibilidad`, { params });
  }

  // Alias para compatibilidad con el mock service
  verificarDisponibilidad(habitacionId: string, fechaInicio: string, fechaFin: string, excludeReservaId?: string): Observable<boolean> {
    return this.checkDisponibilidad(habitacionId, fechaInicio, fechaFin, excludeReservaId);
  }

  // Obtener reservas por cliente
  getReservasPorCliente(clienteId: string): Observable<Reserva[]> {
    const params = new HttpParams().set('clienteId', clienteId);
    return this.http.get<Reserva[]>(`${this.apiUrl}/por-cliente`, { params });
  }

  // Obtener reservas por habitación
  getReservasPorHabitacion(habitacionId: string): Observable<Reserva[]> {
    const params = new HttpParams().set('habitacionId', habitacionId);
    return this.http.get<Reserva[]>(`${this.apiUrl}/por-habitacion`, { params });
  }

  // Obtener reservas para hoy
  getReservasHoy(): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${this.apiUrl}/hoy`);
  }

  // Obtener reservas próximas (próximos 7 días)
  getReservasProximas(): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${this.apiUrl}/proximas`);
  }

  // Obtener estadísticas de reservas
  getEstadisticas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/estadisticas`);
  }

  // Cancelar una reserva
  cancelarReserva(id: string, motivo?: string): Observable<Reserva> {
    const data = motivo ? { motivo } : {};
    return this.http.patch<Reserva>(`${this.apiUrl}/${id}/cancelar`, data);
  }

  // Confirmar una reserva
  confirmarReserva(id: string): Observable<Reserva> {
    return this.http.patch<Reserva>(`${this.apiUrl}/${id}/confirmar`, {});
  }

  // Marcar como completada
  completarReserva(id: string): Observable<Reserva> {
    return this.http.patch<Reserva>(`${this.apiUrl}/${id}/completar`, {});
  }

  // Marcar como No Show
  marcarNoShow(id: string): Observable<Reserva> {
    return this.http.patch<Reserva>(`${this.apiUrl}/${id}/no-show`, {});
  }

  // Check-in de una reserva
  checkIn(id: string, horaCheckIn?: string): Observable<Reserva> {
    const data = horaCheckIn ? { horaCheckIn } : {};
    return this.http.patch<Reserva>(`${this.apiUrl}/${id}/checkin`, data);
  }

  // Check-out de una reserva
  checkOut(id: string, horaCheckOut?: string): Observable<Reserva> {
    const data = horaCheckOut ? { horaCheckOut } : {};
    return this.http.patch<Reserva>(`${this.apiUrl}/${id}/checkout`, data);
  }

  // Registrar pago de una reserva
  registrarPago(id: string, metodoPago: string, monto?: number, observaciones?: string): Observable<Reserva> {
    const data: any = { metodoPago };
    if (monto) data.monto = monto;
    if (observaciones) data.observaciones = observaciones;
    return this.http.patch<Reserva>(`${this.apiUrl}/${id}/pago`, data);
  }

  // Obtener reservas para check-in hoy
  getReservasCheckInHoy(): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${this.apiUrl}/checkin/hoy`);
  }

  // Obtener reservas para check-out hoy
  getReservasCheckOutHoy(): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${this.apiUrl}/checkout/hoy`);
  }

  // Obtener reservas en curso
  getReservasEnCurso(): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(`${this.apiUrl}/en-curso`);
  }

  // Generar PDF de reserva
  generarPDF(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/pdf`, { responseType: 'blob' });
  }

  // Generar comprobante de pago
  generarComprobantePago(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/comprobante`, { responseType: 'blob' });
  }
} 