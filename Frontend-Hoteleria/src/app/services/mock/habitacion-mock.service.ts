import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Habitacion, HabitacionCreate, HabitacionUpdate, HabitacionFilters, TipoHabitacion } from '../../models/habitacion.model';

@Injectable({
  providedIn: 'root'
})
export class HabitacionMockService {
  private habitaciones: Habitacion[] = [
    {
      _id: '101',
      numero: '101',
      tipo: 'Individual',
      capacidad: 1,
      precioBase: 80,
      precioActual: 100,
      estado: 'Disponible',
      piso: 1,
      descripcion: 'Habitación individual con cama individual',
      servicios: ['TV', 'WiFi', 'Baño privado'],
      activa: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: '102',
      numero: '102',
      tipo: 'Doble',
      capacidad: 2,
      precioBase: 120,
      precioActual: 150,
      estado: 'Disponible',
      piso: 1,
      descripcion: 'Habitación doble con cama matrimonial',
      servicios: ['TV', 'WiFi', 'Baño privado', 'Aire acondicionado'],
      activa: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: '201',
      numero: '201',
      tipo: 'Suite',
      capacidad: 3,
      precioBase: 200,
      precioActual: 250,
      estado: 'Disponible',
      piso: 2,
      descripcion: 'Suite con sala de estar y jacuzzi',
      servicios: ['TV', 'WiFi', 'Baño privado', 'Aire acondicionado', 'Minibar', 'Jacuzzi'],
      activa: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: '202',
      numero: '202',
      tipo: 'Familiar',
      capacidad: 4,
      precioBase: 180,
      precioActual: 220,
      estado: 'Disponible',
      piso: 2,
      descripcion: 'Habitación familiar con dos habitaciones',
      servicios: ['TV', 'WiFi', 'Baño privado', 'Aire acondicionado', 'Cocina pequeña'],
      activa: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: '301',
      numero: '301',
      tipo: 'Suite',
      capacidad: 2,
      precioBase: 250,
      precioActual: 300,
      estado: 'Disponible',
      piso: 3,
      descripcion: 'Suite premium con vista al mar',
      servicios: ['TV', 'WiFi', 'Baño privado', 'Aire acondicionado', 'Balcón', 'Vista al mar'],
      activa: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  // Obtener todas las habitaciones con filtros opcionales y paginación
  getHabitaciones(
    page: number = 1, 
    limit: number = 10, 
    activa?: boolean, 
    tipo?: TipoHabitacion,
    busqueda?: string
  ): Observable<any> {
    let habitacionesFiltradas = [...this.habitaciones];

    // Aplicar filtros
    if (activa !== undefined) {
      habitacionesFiltradas = habitacionesFiltradas.filter(h => h.activa === activa);
    }
    if (tipo) {
      habitacionesFiltradas = habitacionesFiltradas.filter(h => h.tipo === tipo);
    }
    if (busqueda) {
      const termino = busqueda.toLowerCase();
      habitacionesFiltradas = habitacionesFiltradas.filter(h => 
        h.numero.toLowerCase().includes(termino) ||
        h.tipo.toLowerCase().includes(termino)
      );
    }

    // Filtrar por habitaciones activas por defecto para listados

    // Paginación
    const total = habitacionesFiltradas.length;
    const inicio = (page - 1) * limit;
    const fin = inicio + limit;
    const resultado = habitacionesFiltradas.slice(inicio, fin);

    return of({
      habitaciones: resultado,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      limit
    });
  }

  // Obtener una habitación por ID
  getHabitacion(id: string): Observable<Habitacion> {
    const habitacion = this.habitaciones.find(h => h._id === id);
    if (habitacion) {
      return of(habitacion);
    } else {
      throw new Error(`Habitación con ID ${id} no encontrada`);
    }
  }

  // Crear una nueva habitación
  createHabitacion(habitacion: HabitacionCreate): Observable<Habitacion> {
    const nuevaHabitacion: Habitacion = {
      ...habitacion,
      _id: (this.habitaciones.length + 1).toString(),
      activa: true,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Habitacion;
    
    this.habitaciones.push(nuevaHabitacion);
    return of(nuevaHabitacion);
  }

  // Actualizar una habitación existente
  updateHabitacion(id: string, habitacion: HabitacionUpdate): Observable<Habitacion> {
    const index = this.habitaciones.findIndex(h => h._id === id);
    if (index !== -1) {
      const habitacionActualizada: Habitacion = {
        ...this.habitaciones[index],
        ...habitacion,
        _id: id,
        updatedAt: new Date()
      };
      
      this.habitaciones[index] = habitacionActualizada;
      return of(habitacionActualizada);
    } else {
      throw new Error(`Habitación con ID ${id} no encontrada`);
    }
  }

  // Eliminar una habitación (marcar como inactiva)
  deleteHabitacion(id: string): Observable<boolean> {
    const index = this.habitaciones.findIndex(h => h._id === id);
    if (index !== -1) {
      this.habitaciones[index].activa = false;
      this.habitaciones[index].updatedAt = new Date();
      return of(true);
    } else {
      return of(false);
    }
  }

  // Cambiar disponibilidad de una habitación
  updateDisponibilidad(id: string, activa: boolean): Observable<Habitacion> {
    const index = this.habitaciones.findIndex(h => h._id === id);
    if (index !== -1) {
      this.habitaciones[index].activa = activa;
      this.habitaciones[index].updatedAt = new Date();
      return of(this.habitaciones[index]);
    } else {
      throw new Error(`Habitación con ID ${id} no encontrada`);
    }
  }

  // Actualizar el precio de una habitación
  updatePrecio(id: string, precio: number): Observable<Habitacion> {
    const index = this.habitaciones.findIndex(h => h._id === id);
    if (index !== -1) {
      this.habitaciones[index].precioActual = precio;
      this.habitaciones[index].updatedAt = new Date();
      return of(this.habitaciones[index]);
    } else {
      throw new Error(`Habitación con ID ${id} no encontrada`);
    }
  }

  // Obtener habitaciones por tipo
  getHabitacionesPorTipo(tipo: TipoHabitacion): Observable<Habitacion[]> {
    const habitaciones = this.habitaciones.filter(h => h.tipo === tipo && h.activa);
    return of(habitaciones);
  }

  // Obtener habitaciones disponibles (activas)
  getHabitacionesDisponibles(): Observable<Habitacion[]> {
    const habitaciones = this.habitaciones.filter(h => h.activa);
    return of(habitaciones);
  }

  // Buscar habitaciones
  searchHabitaciones(termino: string): Observable<Habitacion[]> {
    const terminoLower = termino.toLowerCase();
    const habitaciones = this.habitaciones.filter(h => 
      h.activa && (
        h.numero.toLowerCase().includes(terminoLower) ||
        h.tipo.toLowerCase().includes(terminoLower) ||
        (h.descripcion || '').toLowerCase().includes(terminoLower)
      )
    );
    return of(habitaciones);
  }
}
