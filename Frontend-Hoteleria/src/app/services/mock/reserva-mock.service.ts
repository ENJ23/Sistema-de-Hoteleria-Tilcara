import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Reserva, ReservaCreate, ReservaUpdate, ReservaFilters, ReservaResponse } from '../../models/reserva.model';
import { Cliente } from '../../models/cliente.model';
import { Habitacion } from '../../models/habitacion.model';

@Injectable({
  providedIn: 'root'
})
export class ReservaMockService {
  private reservas: Reserva[] = [
    {
      _id: '1',
      cliente: {
        _id: '1',
        nombre: 'Juan',
        apellido: 'Pérez',
        email: 'juan@example.com',
        telefono: '123456789',
        documento: '12345678',
        direccion: 'Calle Falsa 123',
        fechaNacimiento: new Date('1990-01-01'),
        nacionalidad: 'Argentina',
        observaciones: 'Cliente frecuente',
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Cliente,
      habitacion: {
        _id: '101',
        numero: '101',
        tipo: 'Doble',
        capacidad: 2,
        precioBase: 100,
        precioActual: 120,
        estado: 'Disponible',
        piso: 1,
        descripcion: 'Habitación doble con cama matrimonial',
        servicios: ['TV', 'Aire acondicionado', 'WiFi'],
        activa: true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Habitacion,
      fechaEntrada: '2025-08-15',
      fechaSalida: '2025-08-20',
      horaEntrada: '14:00',
      horaSalida: '10:00',
      precioPorNoche: 120,
      precioTotal: 600,
      estado: 'Confirmada',
      pagado: true,
      metodoPago: 'Tarjeta de crédito',
      observaciones: 'Llamar una hora antes de la llegada',
      createdAt: new Date('2025-07-01'),
      updatedAt: new Date('2025-07-01')
    },
    {
      _id: '2',
      cliente: {
        _id: '2',
        nombre: 'María',
        apellido: 'González',
        email: 'maria@example.com',
        telefono: '987654321',
        documento: '87654321',
        direccion: 'Avenida Siempreviva 742',
        fechaNacimiento: new Date('1985-05-15'),
        nacionalidad: 'Chilena',
        observaciones: 'Alergia a los frutos secos',
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Cliente,
      habitacion: {
        _id: '201',
        numero: '201',
        tipo: 'Suite',
        capacidad: 3,
        precioBase: 200,
        precioActual: 250,
        estado: 'Ocupada',
        piso: 2,
        descripcion: 'Suite con sala de estar y jacuzzi',
        servicios: ['TV', 'Aire acondicionado', 'WiFi', 'Minibar', 'Jacuzzi'],
        activa: true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Habitacion,
      fechaEntrada: '2025-08-10',
      fechaSalida: '2025-08-18',
      horaEntrada: '15:00',
      horaSalida: '11:00',
      precioPorNoche: 250,
      precioTotal: 2000,
      estado: 'Pendiente',
      pagado: false,
      metodoPago: 'Transferencia',
      observaciones: 'Llegada tarde',
      createdAt: new Date('2025-07-15'),
      updatedAt: new Date('2025-07-15')
    }
  ];

  // Obtener todas las reservas con filtros opcionales
  getReservas(filtros?: ReservaFilters, pagina: number = 1, porPagina: number = 10): Observable<ReservaResponse> {
    // Filtrar reservas si se proporcionan filtros
    let reservasFiltradas = [...this.reservas];
    
    if (filtros) {
      if (filtros.fechaInicio) {
        reservasFiltradas = reservasFiltradas.filter(r => r.fechaEntrada >= filtros.fechaInicio!);
      }
      if (filtros.fechaFin) {
        reservasFiltradas = reservasFiltradas.filter(r => r.fechaSalida <= filtros.fechaFin!);
      }
      if (filtros.estado) {
        reservasFiltradas = reservasFiltradas.filter(r => r.estado === filtros.estado);
      }
      if (filtros.cliente) {
        const clienteId = typeof filtros.cliente === 'string' ? filtros.cliente : filtros.cliente._id;
        reservasFiltradas = reservasFiltradas.filter(r => 
          (r.cliente as Cliente)._id === clienteId || r.cliente === clienteId
        );
      }
      if (filtros.habitacion) {
        const habitacionId = typeof filtros.habitacion === 'string' ? filtros.habitacion : filtros.habitacion._id;
        reservasFiltradas = reservasFiltradas.filter(r => 
          (r.habitacion as Habitacion)._id === habitacionId || r.habitacion === habitacionId
        );
      }
      if (filtros.pagado !== undefined) {
        reservasFiltradas = reservasFiltradas.filter(r => r.pagado === filtros.pagado);
      }
    }

    // Paginación
    const total = reservasFiltradas.length;
    const inicio = (pagina - 1) * porPagina;
    const fin = inicio + porPagina;
    const resultado = reservasFiltradas.slice(inicio, fin);

    return of({
      reservas: resultado,
      total,
      pagina,
      porPagina: Math.min(porPagina, resultado.length)
    });
  }

  // Obtener una reserva por ID
  getReserva(id: string): Observable<Reserva> {
    const reserva = this.reservas.find(r => r._id === id);
    if (reserva) {
      return of(reserva);
    } else {
      throw new Error(`Reserva con ID ${id} no encontrada`);
    }
  }

  // Crear una nueva reserva
  createReserva(reserva: ReservaCreate): Observable<Reserva> {
    const nuevaReserva: Reserva = {
      ...reserva,
      _id: (this.reservas.length + 1).toString(),
      precioTotal: reserva.precioPorNoche * this.calcularNoches(reserva.fechaEntrada, reserva.fechaSalida),
      pagado: reserva.pagado || false,
      estado: reserva.estado || 'Pendiente',
      createdAt: new Date(),
      updatedAt: new Date()
    } as Reserva;
    
    this.reservas.push(nuevaReserva);
    return of(nuevaReserva);
  }

  // Actualizar una reserva existente
  updateReserva(id: string, reserva: ReservaUpdate): Observable<Reserva> {
    const index = this.reservas.findIndex(r => r._id === id);
    if (index !== -1) {
      const reservaActual = this.reservas[index];
      const clienteActual = typeof reservaActual.cliente === 'string' ? reservaActual.cliente : (reservaActual.cliente as Cliente)._id;
      const habitacionActual = typeof reservaActual.habitacion === 'string' ? reservaActual.habitacion : (reservaActual.habitacion as Habitacion)._id;
      
      const reservaActualizada: Reserva = {
        ...reservaActual,
        ...reserva,
        _id: id,
        cliente: reserva.cliente ? reserva.cliente : clienteActual,
        habitacion: reserva.habitacion ? reserva.habitacion : habitacionActual,
        estado: reserva.estado as 'Confirmada' | 'Pendiente' | 'Cancelada' | 'Completada' | 'No Show' || reservaActual.estado,
        updatedAt: new Date()
      };
      
      // Recalcular precio total si cambian las fechas o el precio por noche
      if (reserva.fechaEntrada || reserva.fechaSalida || reserva.precioPorNoche) {
        const fechaEntrada = reserva.fechaEntrada || reservaActual.fechaEntrada;
        const fechaSalida = reserva.fechaSalida || reservaActual.fechaSalida;
        const precioPorNoche = reserva.precioPorNoche || reservaActual.precioPorNoche;
        
        reservaActualizada.precioTotal = precioPorNoche * this.calcularNoches(fechaEntrada, fechaSalida);
      }
      
      this.reservas[index] = reservaActualizada;
      return of(reservaActualizada);
    } else {
      throw new Error(`Reserva con ID ${id} no encontrada`);
    }
  }

  // Eliminar una reserva
  deleteReserva(id: string): Observable<{message: string}> {
    const index = this.reservas.findIndex(r => r._id === id);
    if (index !== -1) {
      this.reservas.splice(index, 1);
      return of({message: 'Reserva eliminada correctamente'});
    } else {
      return of({message: 'Reserva no encontrada'});
    }
  }

  // Actualizar solo el estado de una reserva
  updateEstado(id: string, estado: 'Confirmada' | 'Pendiente' | 'Cancelada' | 'Completada' | 'No Show'): Observable<Reserva> {
    const index = this.reservas.findIndex(r => r._id === id);
    if (index !== -1) {
      const reservaActual = this.reservas[index];
      const reservaActualizada: Reserva = {
        ...reservaActual,
        estado,
        updatedAt: new Date()
      };
      
      this.reservas[index] = reservaActualizada;
      return of(reservaActualizada);
    } else {
      throw new Error(`Reserva con ID ${id} no encontrada`);
    }
  }

  // Actualizar solo el estado de pago de una reserva
  updatePago(id: string, pagado: boolean, metodoPago?: string): Observable<Reserva> {
    const index = this.reservas.findIndex(r => r._id === id);
    if (index !== -1) {
      const reservaActualizada = {
        ...this.reservas[index],
        pagado,
        metodoPago: metodoPago || this.reservas[index].metodoPago,
        updatedAt: new Date()
      };
      
      this.reservas[index] = reservaActualizada;
      return of(reservaActualizada);
    } else {
      throw new Error(`Reserva con ID ${id} no encontrada`);
    }
  }

  // Verificar disponibilidad de habitación
  verificarDisponibilidad(
    habitacionId: string, 
    fechaEntrada: string, 
    fechaSalida: string, 
    reservaId?: string
  ): Observable<boolean> {
    // Verificar si hay reservas que se superpongan con las fechas dadas
    const reservasExistentes = this.reservas.filter(r => 
      r.habitacion === habitacionId || 
      (r.habitacion as Habitacion)._id === habitacionId
    );

    const entrada = new Date(fechaEntrada);
    const salida = new Date(fechaSalida);

    const haySuperposicion = reservasExistentes.some(r => {
      // Si es la misma reserva (en caso de actualización), la ignoramos
      if (r._id === reservaId) return false;
      
      const rEntrada = new Date(r.fechaEntrada);
      const rSalida = new Date(r.fechaSalida);
      
      // Verificar superposición de fechas
      return (
        (entrada >= rEntrada && entrada < rSalida) || // La entrada está dentro de una reserva existente
        (salida > rEntrada && salida <= rSalida) ||  // La salida está dentro de una reserva existente
        (entrada <= rEntrada && salida >= rSalida)   // La reserva abarca completamente una reserva existente
      );
    });

    return of(!haySuperposicion);
  }

  // Método auxiliar para calcular noches entre dos fechas
  private calcularNoches(fechaInicio: string, fechaFin: string): number {
    const unDia = 24 * 60 * 60 * 1000; // milisegundos en un día
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const diferencia = Math.round(Math.abs((fin.getTime() - inicio.getTime()) / unDia));
    return diferencia || 1; // Mínimo una noche
  }
}
