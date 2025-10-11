import { Habitacion } from './habitacion.model';

export interface ClienteEmbedded {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  documento: string;
  direccion?: string;
  nacionalidad?: string;
}

export interface PagoHistorial {
  monto: number;
  metodoPago: 'Efectivo' | 'Tarjeta de Crédito' | 'Tarjeta de Débito' | 'Transferencia' | 'PayPal';
  fechaPago: Date;
  observaciones?: string;
  registradoPor: string;
}

export interface Reserva {
  _id: string;
  cliente: ClienteEmbedded;
  habitacion: Habitacion | string;
  fechaEntrada: string;
  fechaSalida: string;
  horaEntrada: string;
  horaSalida: string;
  precioPorNoche: number;
  precioTotal: number;
  estado: 'Confirmada' | 'Pendiente' | 'En curso' | 'Cancelada' | 'Completada' | 'No Show' | 'Finalizada';
  pagado: boolean;
  metodoPago?: string;
  observaciones?: string;
  // Campos para check-in/check-out
  horaCheckIn?: string;
  fechaCheckIn?: Date;
  horaCheckOut?: string;
  fechaCheckOut?: Date;
  // Campos para pagos
  montoPagado?: number;
  historialPagos?: PagoHistorial[];
  fechaPago?: Date;
  // Campos calculados del backend
  montoRestante?: number;
  estaCompletamentePagado?: boolean;
  totalPagos?: number;
  // Nuevos campos para configuración específica
  configuracionCamas?: CamaInfo[];
  informacionTransporte?: TransporteInfo;
  necesidadesEspeciales?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CamaInfo {
  tipo: 'matrimonial' | 'single' | 'doble' | 'queen' | 'king';
  cantidad: number;
}

export interface TransporteInfo {
  tipo: 'vehiculo_propio' | 'colectivo' | 'taxi' | 'otro';
  detalles?: string;
  numeroPlaca?: string;
  empresa?: string;
}

export interface ReservaCreate {
  cliente: ClienteEmbedded;
  habitacion: string;
  fechaEntrada: string;
  fechaSalida: string;
  horaEntrada: string;
  horaSalida: string;
  precioPorNoche: number;
  estado?: 'Confirmada' | 'Pendiente' | 'En curso' | 'Cancelada' | 'Completada' | 'No Show' | 'Finalizada';
  pagado?: boolean;
  metodoPago?: string;
  observaciones?: string;
  // Nuevos campos para configuración específica
  configuracionCamas?: CamaInfo[];
  informacionTransporte?: TransporteInfo;
  necesidadesEspeciales?: string;
}

export interface ReservaUpdate {
  cliente?: ClienteEmbedded;
  habitacion?: string;
  fechaEntrada?: string;
  fechaSalida?: string;
  horaEntrada?: string;
  horaSalida?: string;
  precioPorNoche?: number;
  precioTotal?: number;
  estado?: 'Confirmada' | 'Pendiente' | 'En curso' | 'Cancelada' | 'Completada' | 'No Show' | 'Finalizada';
  pagado?: boolean;
  metodoPago?: string;
  observaciones?: string;
  // Nuevos campos para configuración específica
  configuracionCamas?: CamaInfo[];
  informacionTransporte?: TransporteInfo;
  necesidadesEspeciales?: string;
}

export interface ReservaFilters {
  fechaInicio?: string;
  fechaFin?: string;
  estado?: string;
  cliente?: ClienteEmbedded;
  habitacion?: string | { _id: string };
  pagado?: boolean;
}

export interface ReservaResponse {
  reservas: Reserva[];
  total: number;
  pagina: number;
  porPagina: number;
} 