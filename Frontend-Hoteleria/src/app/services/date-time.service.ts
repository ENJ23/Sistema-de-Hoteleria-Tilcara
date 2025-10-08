import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DateTimeService {

  // Zona horaria de Argentina (UTC-3)
  private readonly ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';
  private readonly ARGENTINA_OFFSET = -3; // UTC-3

  constructor() { }

  /**
   * Obtiene la fecha actual en horario argentino
   */
  getCurrentDate(): Date {
    return new Date();
  }

  /**
   * Obtiene la fecha actual formateada como YYYY-MM-DD en horario argentino
   */
  getCurrentDateString(): string {
    const now = new Date();
    return this.formatDateToLocalString(now);
  }

  /**
   * Convierte una fecha UTC a horario argentino
   */
  convertUTCToArgentinaTime(utcDate: Date): Date {
    // Crear una nueva fecha en horario argentino
    const argentinaTime = new Date(utcDate.getTime() + (this.ARGENTINA_OFFSET * 60 * 60 * 1000));
    return argentinaTime;
  }

  /**
   * Convierte una fecha de horario argentino a UTC
   */
  convertArgentinaTimeToUTC(argentinaDate: Date): Date {
    // Crear una nueva fecha en UTC
    const utcTime = new Date(argentinaDate.getTime() - (this.ARGENTINA_OFFSET * 60 * 60 * 1000));
    return utcTime;
  }

  /**
   * Formatea una fecha a string YYYY-MM-DD en horario argentino
   */
  formatDateToLocalString(date: Date): string {
    // CORRECCIÓN CRÍTICA: Manejar zona horaria para Vercel vs Local
    const isVercel = window.location.hostname.includes('vercel.app') || 
                     window.location.hostname.includes('vercel.com') ||
                     window.location.hostname.includes('localhost') === false;
    
    let fechaAjustada = date;
    
    if (isVercel) {
      // En Vercel, ajustar a zona horaria de Argentina
      const offsetArgentina = -3; // UTC-3
      const offsetLocal = date.getTimezoneOffset() / 60; // Offset local en horas
      const diferencia = offsetLocal - offsetArgentina;
      
      // Ajustar fecha para compensar diferencia de zona horaria
      fechaAjustada = new Date(date.getTime() + (diferencia * 60 * 60 * 1000));
    }
    
    // Usar métodos locales para mantener zona horaria de Argentina
    const year = fechaAjustada.getFullYear();
    const month = String(fechaAjustada.getMonth() + 1).padStart(2, '0');
    const day = String(fechaAjustada.getDate()).padStart(2, '0');
    
    console.log('🇦🇷 formatDateToLocalString:', {
      original: date,
      ajustada: fechaAjustada,
      resultado: `${year}-${month}-${day}`,
      isVercel,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    
    return `${year}-${month}-${day}`;
  }

  /**
   * Formatea una fecha para mostrar en la UI (DD/MM/YYYY)
   */
  formatDateForDisplay(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Formatea una fecha y hora para mostrar en la UI (DD/MM/YYYY HH:mm)
   */
  formatDateTimeForDisplay(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  /**
   * Formatea solo la hora para mostrar en la UI
   */
  formatTimeForDisplay(date: Date): string {
    return date.toLocaleTimeString('es-AR', {
      timeZone: this.ARGENTINA_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Crea una fecha en horario argentino
   */
  createArgentinaDate(year: number, month: number, day: number, hour: number = 0, minute: number = 0): Date {
    // Crear fecha en horario local (que debería ser argentino)
    const date = new Date(year, month - 1, day, hour, minute, 0, 0);
    return date;
  }

  /**
   * Obtiene el primer día del mes en horario argentino
   */
  getFirstDayOfMonth(year: number, month: number): Date {
    return new Date(year, month - 1, 1);
  }

  /**
   * Obtiene el último día del mes en horario argentino
   */
  getLastDayOfMonth(year: number, month: number): Date {
    return new Date(year, month, 0);
  }

  /**
   * Verifica si una fecha es hoy en horario argentino
   */
  isToday(date: Date): boolean {
    const today = new Date();
    const todayStr = this.formatDateToLocalString(today);
    const dateStr = this.formatDateToLocalString(date);
    return todayStr === dateStr;
  }

  /**
   * Verifica si una fecha está en un rango (inclusive)
   */
  isDateInRange(date: Date, startDate: string, endDate: string): boolean {
    const dateStr = this.formatDateToLocalString(date);
    const startStr = startDate.split('T')[0];
    const endStr = endDate.split('T')[0];
    return dateStr >= startStr && dateStr <= endStr;
  }

  /**
   * Verifica si una fecha es la fecha de check-in
   */
  isCheckInDate(date: Date, checkInDate: string): boolean {
    const dateStr = this.formatDateToLocalString(date);
    const checkInStr = checkInDate.split('T')[0];
    return dateStr === checkInStr;
  }

  /**
   * Verifica si una fecha es la fecha de check-out
   */
  isCheckOutDate(date: Date, checkOutDate: string): boolean {
    const dateStr = this.formatDateToLocalString(date);
    const checkOutStr = checkOutDate.split('T')[0];
    return dateStr === checkOutStr;
  }

  /**
   * Calcula la diferencia en días entre dos fechas
   */
  calculateDaysDifference(startDate: Date, endDate: Date): number {
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Obtiene el nombre del mes en español
   */
  getMonthName(month: number): string {
    const nombresMeses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return nombresMeses[month];
  }

  /**
   * Obtiene el nombre del día de la semana en español
   */
  getDayName(day: number): string {
    const nombresDias = [
      'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
    ];
    return nombresDias[day];
  }

  /**
   * Verifica si una fecha es fin de semana
   */
  isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Domingo, 6 = Sábado
  }

  /**
   * Obtiene la hora actual en formato HH:MM
   */
  getCurrentTimeString(): string {
    const now = new Date();
    return this.formatTimeForDisplay(now);
  }

  /**
   * Obtiene la hora actual en formato HH:MM garantizado
   */
  getCurrentTimeStringFormatted(): string {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Convierte una hora en formato HH:MM a minutos desde medianoche
   */
  timeStringToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Convierte minutos desde medianoche a formato HH:MM
   */
  minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  /**
   * Valida si una hora está en formato HH:MM válido
   */
  isValidTimeFormat(timeString: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeString);
  }

  /**
   * Obtiene la fecha y hora actual para usar en logs
   */
  getCurrentDateTimeForLogs(): string {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Parsea una fecha desde string evitando problemas de zona horaria
   * @param dateString String de fecha en formato YYYY-MM-DD
   * @returns Date object en zona horaria local de Argentina
   */
  parseDateFromString(dateString: string): Date {
    // CORRECCIÓN CRÍTICA: Manejar zona horaria para Vercel vs Local
    const isVercel = window.location.hostname.includes('vercel.app') || 
                     window.location.hostname.includes('vercel.com') ||
                     window.location.hostname.includes('localhost') === false;
    
    // Si el string ya está en formato YYYY-MM-DD, crear la fecha directamente
    // para evitar problemas de zona horaria
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Los meses en JS van de 0-11
      const day = parseInt(parts[2], 10);
      
      // Crear fecha en zona horaria local de Argentina
      let fecha = new Date(year, month, day);
      fecha.setHours(0, 0, 0, 0); // Establecer a medianoche local
      
      if (isVercel) {
        // En Vercel, ajustar a zona horaria de Argentina
        const offsetArgentina = -3; // UTC-3
        const offsetLocal = fecha.getTimezoneOffset() / 60; // Offset local en horas
        const diferencia = offsetLocal - offsetArgentina;
        
        // Ajustar fecha para compensar diferencia de zona horaria
        fecha = new Date(fecha.getTime() - (diferencia * 60 * 60 * 1000));
      }
      
      console.log('🇦🇷 parseDateFromString:', {
        input: dateString,
        output: fecha,
        isVercel,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
      
      return fecha;
    }
    
    // Fallback: usar el constructor normal
    let fecha = new Date(dateString);
    fecha.setHours(0, 0, 0, 0); // Establecer a medianoche local
    
    if (isVercel) {
      // En Vercel, ajustar a zona horaria de Argentina
      const offsetArgentina = -3; // UTC-3
      const offsetLocal = fecha.getTimezoneOffset() / 60; // Offset local en horas
      const diferencia = offsetLocal - offsetArgentina;
      
      // Ajustar fecha para compensar diferencia de zona horaria
      fecha = new Date(fecha.getTime() - (diferencia * 60 * 60 * 1000));
    }
    
    return fecha;
  }
}




