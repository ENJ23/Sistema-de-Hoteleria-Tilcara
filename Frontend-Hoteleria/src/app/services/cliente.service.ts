import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

import { Cliente, ClienteCreate, ClienteUpdate } from '../models/cliente.model';

export interface ClienteFilters {
  nombre?: string;
  email?: string;
  documento?: string;
}

export interface ClienteResponse {
  clientes: Cliente[];
  total: number;
  pagina: number;
  porPagina: number;
}

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private apiUrl = `${environment.apiUrl}/clientes`;

  constructor(private http: HttpClient) {}

  // Obtener todos los clientes con filtros opcionales
  getClientes(filtros?: ClienteFilters, pagina: number = 1, porPagina: number = 10): Observable<ClienteResponse> {
    let params = new HttpParams()
      .set('pagina', pagina.toString())
      .set('porPagina', porPagina.toString());

    if (filtros) {
      if (filtros.nombre) params = params.set('nombre', filtros.nombre);
      if (filtros.email) params = params.set('email', filtros.email);
      if (filtros.documento) params = params.set('documento', filtros.documento);
    }

    return this.http.get<ClienteResponse>(this.apiUrl, { params });
  }

  // Obtener un cliente por ID
  getCliente(id: string): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.apiUrl}/${id}`);
  }

  // Crear un nuevo cliente
  createCliente(cliente: ClienteCreate): Observable<Cliente> {
    return this.http.post<Cliente>(this.apiUrl, cliente);
  }

  // Actualizar un cliente
  updateCliente(id: string, cliente: ClienteUpdate): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.apiUrl}/${id}`, cliente);
  }

  // Eliminar un cliente
  deleteCliente(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Buscar clientes por término
  searchClientes(termino: string): Observable<Cliente[]> {
    const params = new HttpParams().set('buscar', termino);
    return this.http.get<Cliente[]>(`${this.apiUrl}/buscar`, { params });
  }

  // Verificar si existe un cliente por documento
  checkDocumentoExists(documento: string, excludeId?: string): Observable<boolean> {
    let params = new HttpParams().set('documento', documento);
    if (excludeId) {
      params = params.set('excludeId', excludeId);
    }
    return this.http.get<boolean>(`${this.apiUrl}/check-documento`, { params });
  }

  // Verificar si existe un cliente por email
  checkEmailExists(email: string, excludeId?: string): Observable<boolean> {
    let params = new HttpParams().set('email', email);
    if (excludeId) {
      params = params.set('excludeId', excludeId);
    }
    return this.http.get<boolean>(`${this.apiUrl}/check-email`, { params });
  }
} 