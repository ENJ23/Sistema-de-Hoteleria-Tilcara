export interface HabitacionEmbedded {
  _id: string;
  numero: string;
  tipo: string;
  estado: string;
}

export interface Tarea {
  _id: string;
  tipo: 'limpieza' | 'mantenimiento' | 'otro';
  descripcion: string;
  habitacion: HabitacionEmbedded;
  estado: 'pendiente' | 'completada';
  fechaCreacion: Date;
  fechaCompletada?: Date;
  creadoPor: string;
  completadoPor?: string;
  observaciones?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TareaCreate {
  tipo: 'limpieza' | 'mantenimiento' | 'otro';
  descripcion: string;
  habitacion: string;
  creadoPor?: string;
}

export interface TareaCompletar {
  completadoPor?: string;
  observaciones?: string;
}

export interface TareaResponse {
  success: boolean;
  data: Tarea[];
  total: number;
  message?: string;
}
