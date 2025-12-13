import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of, Subject } from 'rxjs';
import { switchMap, map, tap } from 'rxjs/operators';
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

  // Eventos de cambios en reservas para refresco automático
  private reservaEventsSubject = new Subject<ReservaEvent>();
  public readonly reservaEvents$ = this.reservaEventsSubject.asObservable();

  constructor(private http: HttpClient) { }

  // Obtener todas las reservas con filtros opcionales
  getReservas(filtros?: ReservaFilters, page: number = 1, limit: number = 10, cacheBust?: number): Observable<ReservaResponse> {
    console.log('🔧 ReservaService.getReservas llamado con:', { filtros, page, limit });

    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (cacheBust) {
      params = params.set('t', cacheBust.toString());
    }

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

    console.log('🌐 Llamando a:', this.apiUrl, 'con params:', params.toString());
    return this.http.get<ReservaResponse>(this.apiUrl, { params });
  }

  // Obtener todas las reservas paginando automáticamente (lotes de hasta 100)
  getReservasAll(filtros?: ReservaFilters, pageSize: number = 100, forceFresh: boolean = false): Observable<ReservaResponse> {
    // Primera página para conocer total de páginas
    const bust = forceFresh ? Date.now() : undefined;
    return this.getReservas(filtros, 1, pageSize, bust).pipe(
      switchMap((firstPage) => {
        const totalPages = (firstPage as any).totalPages
          ?? ((firstPage as any).page && (firstPage as any).limit && (firstPage as any).total
            ? Math.ceil((firstPage as any).total / (firstPage as any).limit)
            : 1);
        if (totalPages <= 1) {
          return of(firstPage);
        }

        const requests: Array<Observable<ReservaResponse>> = [];
        for (let p = 2; p <= totalPages; p++) {
          requests.push(this.getReservas(filtros, p, pageSize, bust));
        }

        return forkJoin(requests).pipe(
          map((responses) => {
            const allReservas = [
              ...firstPage.reservas,
              ...responses.flatMap(r => r.reservas)
            ];

            return {
              ...firstPage,
              reservas: allReservas,
              currentPage: 1,
              totalPages: totalPages
            } as ReservaResponse;
          })
        );
      })
    );
  }

  // Obtener una reserva por ID
  getReserva(id: string): Observable<Reserva> {
    return this.http.get<Reserva>(`${this.apiUrl}/${id}`);
  }

  // Crear una nueva reserva
  createReserva(reserva: ReservaCreate): Observable<Reserva> {
    return this.http.post<Reserva>(this.apiUrl, reserva).pipe(
      tap(res => this.emitReservaEvent({ type: 'created', id: (res as any)?._id, reserva: res }))
    );
  }

  // Actualizar una reserva
  updateReserva(id: string, reserva: ReservaUpdate): Observable<Reserva> {
    return this.http.put<Reserva>(`${this.apiUrl}/${id}`, reserva).pipe(
      tap(res => {
        const hab = (res as any)?.habitacion;
        const habInfo = typeof hab === 'string' ? { _id: hab } : { _id: hab?._id, numero: hab?.numero };
        console.log('✅ Reserva actualizada', { id, habitacion: habInfo, fechaEntrada: (res as any)?.fechaEntrada, fechaSalida: (res as any)?.fechaSalida, estado: (res as any)?.estado });
        this.emitReservaEvent({ type: 'updated', id, reserva: res });
      })
    );
  }

  // Eliminar físicamente una reserva de la base de datos (solo para errores)
  deleteReserva(id: string): Observable<{
    message: string;
    reservaEliminada: {
      _id: string;
      cliente: string;
      habitacion: string;
    };
  }> {
    return this.http.delete<{
      message: string;
      reservaEliminada: {
        _id: string;
        cliente: string;
        habitacion: string;
      };
    }>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.emitReservaEvent({ type: 'deleted', id }))
    );
  }

  // Cancelar una reserva (con motivo de cancelación) - crea registro de cancelación
  cancelarReserva(id: string, motivoCancelacion: string): Observable<{
    message: string;
    reserva: Reserva;
    cancelacion: {
      _id: string;
      montoPagado: number;
      montoRestante: number;
      puedeReembolso: boolean;
      estadoReembolso: string;
    };
  }> {
    return this.http.post<{
      message: string;
      reserva: Reserva;
      cancelacion: {
        _id: string;
        montoPagado: number;
        montoRestante: number;
        puedeReembolso: boolean;
        estadoReembolso: string;
      };
    }>(`${this.apiUrl}/${id}/cancelar`, { motivoCancelacion }).pipe(
      tap(res => this.emitReservaEvent({ type: 'cancelada', id, reserva: res.reserva }))
    );
  }

  // Actualizar el estado de una reserva
  updateEstado(id: string, estado: string): Observable<Reserva> {
    return this.http.patch<Reserva>(`${this.apiUrl}/${id}/estado`, { estado }).pipe(
      tap(res => this.emitReservaEvent({ type: 'estado', id, reserva: res }))
    );
  }

  // Actualizar el estado de pago de una reserva
  updatePago(id: string, pagado: boolean): Observable<Reserva> {
    return this.http.patch<Reserva>(`${this.apiUrl}/${id}/pago`, { pagado }).pipe(
      tap(res => this.emitReservaEvent({ type: 'pago', id, reserva: res }))
    );
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
    return this.http.patch<Reserva>(`${this.apiUrl}/${id}/checkin`, data).pipe(
      tap(res => this.emitReservaEvent({ type: 'checkin', id, reserva: res }))
    );
  }

  // Check-out de una reserva
  checkOut(id: string, horaCheckOut?: string): Observable<Reserva> {
    const data = horaCheckOut ? { horaCheckOut } : {};
    return this.http.patch<Reserva>(`${this.apiUrl}/${id}/checkout`, data).pipe(
      tap(res => this.emitReservaEvent({ type: 'checkout', id, reserva: res }))
    );
  }

  // Revertir check-out de una reserva
  revertirCheckOut(id: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/revertir-checkout`, {}).pipe(
      tap(() => this.emitReservaEvent({ type: 'revertir-checkout', id }))
    );
  }

  // Dividir una reserva (Cambio de habitación)
  dividirReserva(id: string, fechaCambio: string, nuevaHabitacionId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/dividir`, { fechaCambio, nuevaHabitacionId }).pipe(
      tap(() => {
        this.emitReservaEvent({ type: 'updated', id });
        // También podríamos emitir 'created' para la nueva, pero un refresco general suele bastar
      })
    );
  }

  // Registrar pago de una reserva
  registrarPago(id: string, metodoPago: string, monto?: number, observaciones?: string): Observable<Reserva> {
    const data: any = { metodoPago };
    if (monto) data.monto = monto;
    if (observaciones) data.observaciones = observaciones;
    return this.http.patch<Reserva>(`${this.apiUrl}/${id}/pago`, data).pipe(
      tap(res => this.emitReservaEvent({ type: 'pago', id, reserva: res }))
    );
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

  // ===== MÉTODOS PARA GESTIÓN DE PAGOS INDIVIDUALES =====

  // Editar un pago específico
  editarPago(reservaId: string, pagoId: string, datosPago: {
    monto?: number;
    metodoPago?: string;
    observaciones?: string;
  }): Observable<any> {
    return this.http.put(`${this.apiUrl}/${reservaId}/pagos/${pagoId}`, datosPago).pipe(
      tap(() => this.emitReservaEvent({ type: 'pago', id: reservaId }))
    );
  }

  // Eliminar un pago específico
  eliminarPago(reservaId: string, pagoId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${reservaId}/pagos/${pagoId}`).pipe(
      tap(() => this.emitReservaEvent({ type: 'pago', id: reservaId }))
    );
  }

  // Recalcular totales de pagos
  recalcularPagos(reservaId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${reservaId}/recalcular-pagos`, {}).pipe(
      tap(() => this.emitReservaEvent({ type: 'pago', id: reservaId }))
    );
  }

  // Emitir eventos de cambio de reservas
  private emitReservaEvent(event: ReservaEvent) {
    this.reservaEventsSubject.next(event);
  }
}

// Tipos de eventos de reservas
export type ReservaEventType = 'created' | 'updated' | 'deleted' | 'estado' | 'pago' | 'checkin' | 'checkout' | 'revertir-checkout' | 'cancelada';
export interface ReservaEvent {
  type: ReservaEventType;
  id?: string;
  reserva?: Reserva;
}