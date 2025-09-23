import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterByHabitacion',
  standalone: true
})
export class FilterByHabitacionPipe implements PipeTransform {
  transform(ocupaciones: any[], habitacionId: string): any[] {
    if (!ocupaciones || !habitacionId) {
      return [];
    }
    
    return ocupaciones.filter(ocupacion => ocupacion.habitacionId === habitacionId);
  }
}
