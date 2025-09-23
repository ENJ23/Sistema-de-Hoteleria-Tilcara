export interface Cliente {
  _id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  documento: string;
  direccion?: string;
  fechaNacimiento?: Date;
  nacionalidad?: string;
  observaciones?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClienteCreate {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  documento: string;
  direccion?: string;
  fechaNacimiento?: Date;
  nacionalidad?: string;
  observaciones?: string;
}

export interface ClienteUpdate {
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  documento?: string;
  direccion?: string;
  fechaNacimiento?: Date;
  nacionalidad?: string;
  observaciones?: string;
} 