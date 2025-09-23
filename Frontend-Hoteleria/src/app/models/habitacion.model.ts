// Tipos de habitación permitidos
export type TipoHabitacion = 'Individual' | 'Doble' | 'Triple' | 'Suite' | 'Familiar';

// Estados posibles de una habitación
export type EstadoHabitacion = 'Disponible' | 'Ocupada' | 'Mantenimiento' | 'Reservada' | 'Fuera de servicio';

export interface Habitacion {
  _id: string;
  numero: string; // Cambiado a string para permitir formatos como '101A'
  tipo: TipoHabitacion;
  capacidad: number;
  precioBase: number; // Agregado para coincidir con el backend
  precioActual: number;
  estado: EstadoHabitacion;
  piso: number; // Hacerlo obligatorio según el modelo del backend
  descripcion?: string;
  servicios: string[]; // Hacerlo obligatorio pero puede ser un array vacío
  activa: boolean; // Agregado para manejar borrado lógico
  createdAt: Date;
  updatedAt: Date;
}

export interface HabitacionCreate {
  numero: string;
  tipo: TipoHabitacion;
  capacidad: number;
  precioBase: number;
  precioActual: number;
  estado: EstadoHabitacion;
  piso: number;
  descripcion?: string;
  servicios: string[];
  activa?: boolean;
}

export interface HabitacionUpdate {
  numero?: string;
  tipo?: TipoHabitacion;
  capacidad?: number;
  precioBase?: number;
  precioActual?: number;
  estado?: EstadoHabitacion;
  piso?: number;
  descripcion?: string;
  servicios?: string[];
  activa?: boolean;
}

export interface HabitacionFilters {
  estado?: string;
  tipo?: string;
  piso?: number;
  precioMin?: number;
  precioMax?: number;
  capacidad?: number;
  busqueda?: string;
} 