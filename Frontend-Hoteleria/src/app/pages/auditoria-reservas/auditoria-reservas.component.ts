import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

import { AuditoriaService, RegistroAuditoria, FiltrosAuditoria } from '../../services/auditoria.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auditoria-reservas',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatSortModule,
    MatTooltipModule
  ],
  templateUrl: './auditoria-reservas.component.html',
  styleUrls: ['./auditoria-reservas.component.scss']
})
export class AuditoriaReservasComponent implements OnInit {
  registros: RegistroAuditoria[] = [];
  loading = false;
  totalRegistros = 0;
  
  // Filtros
  filtrosForm: FormGroup;
  
  // Tabla
  displayedColumns: string[] = [
    'fecha',
    'accion',
    'usuario',
    'reserva',
    'detalles',
    'acciones'
  ];
  
  // Paginación
  pageSize = 20;
  pageIndex = 0;
  pageSizeOptions = [10, 20, 50, 100];

  // Tipos de acciones para filtro
  tiposAccion = [
    'Creación',
    'Modificación Manual',
    'Movimiento de Reserva (Drag & Drop)',
    'Cambio de Estado',
    'Check-In',
    'Check-Out',
    'Cancelación',
    'Registro de Pago',
    'Edición de Pago',
    'Reembolso'
  ];

  constructor(
    private auditoriaService: AuditoriaService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    public router: Router,
    private authService: AuthService
  ) {
    this.filtrosForm = this.fb.group({
      accion: [''],
      usuario: [''],
      fechaInicio: [''],
      fechaFin: ['']
    });
  }

  ngOnInit(): void {
    console.log('🎯 AuditoriaReservasComponent inicializado');
    
    // Verificar autenticación
    const token = this.authService.getToken();
    const user = this.authService.currentUserValue;
    console.log('🔐 Token disponible:', !!token);
    console.log('👤 Usuario actual:', user);
    
    // Cargar datos iniciales (últimos 7 días)
    const hoy = new Date();
    const hace7Dias = new Date();
    hace7Dias.setDate(hace7Dias.getDate() - 7);
    
    this.filtrosForm.patchValue({
      fechaInicio: hace7Dias,
      fechaFin: hoy
    });
    
    this.cargarHistorial();
  }

  cargarHistorial(): void {
    this.loading = true;
    
    const filtros: FiltrosAuditoria = {
      page: this.pageIndex + 1,
      limit: this.pageSize
    };

    const formValue = this.filtrosForm.value;
    
    if (formValue.accion) {
      filtros.accion = formValue.accion;
    }
    
    if (formValue.usuario) {
      filtros.usuario = formValue.usuario;
    }
    
    if (formValue.fechaInicio) {
      const fecha = new Date(formValue.fechaInicio);
      filtros.fechaInicio = fecha.toISOString();
    }
    
    if (formValue.fechaFin) {
      const fecha = new Date(formValue.fechaFin);
      filtros.fechaFin = fecha.toISOString();
    }
    
    console.log('📋 Cargando historial con filtros:', filtros);
    
    this.auditoriaService.getHistorialAuditoria(filtros).subscribe({
      next: (response) => {
        this.registros = response.historial;
        this.totalRegistros = response.total;
        this.loading = false;
        console.log('✅ Historial cargado:', response);
      },
      error: (error) => {
        console.error('❌ Error al cargar historial:', error);
        
        if (error.status === 401) {
          this.snackBar.open('🔐 Sesión expirada. Por favor, inicia sesión nuevamente', 'Cerrar', {
            duration: 5000
          });
        } else if (error.status === 403) {
          this.snackBar.open('🔐 No tienes permisos para acceder a esta información', 'Cerrar', {
            duration: 5000
          });
        } else if (error.status === 404) {
          this.snackBar.open('⚠️ Endpoint no disponible. Verifica que el backend esté actualizado', 'Cerrar', {
            duration: 5000
          });
        } else {
          this.snackBar.open('❌ Error al cargar historial de auditoría', 'Cerrar', {
            duration: 3000
          });
        }
        
        this.loading = false;
      }
    });
  }

  aplicarFiltros(): void {
    this.pageIndex = 0; // Resetear a primera página
    this.cargarHistorial();
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset();
    this.pageIndex = 0;
    
    // Establecer valores por defecto (últimos 7 días)
    const hoy = new Date();
    const hace7Dias = new Date();
    hace7Dias.setDate(hace7Dias.getDate() - 7);
    
    this.filtrosForm.patchValue({
      fechaInicio: hace7Dias,
      fechaFin: hoy
    });
    
    this.cargarHistorial();
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.cargarHistorial();
  }

  verDetalleReserva(reservaId: string): void {
    this.router.navigate(['/reservas'], {
      queryParams: { highlight: reservaId }
    });
  }

  getColorAccion(accion: string): string {
    if (accion.includes('Creación')) return 'primary';
    if (accion.includes('Drag & Drop')) return 'warn';
    if (accion.includes('Cancelación')) return 'accent';
    if (accion.includes('Check-In') || accion.includes('Check-Out')) return 'primary';
    if (accion.includes('Pago')) return 'accent';
    return '';
  }

  getIconoAccion(accion: string): string {
    if (accion.includes('Creación')) return 'add_circle';
    if (accion.includes('Drag & Drop')) return 'open_with';
    if (accion.includes('Modificación')) return 'edit';
    if (accion.includes('Cancelación')) return 'cancel';
    if (accion.includes('Check-In')) return 'login';
    if (accion.includes('Check-Out')) return 'logout';
    if (accion.includes('Pago')) return 'payment';
    if (accion.includes('Estado')) return 'sync_alt';
    return 'history';
  }

  formatearFecha(fecha: Date | string): string {
    const date = new Date(fecha);
    return date.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  exportarCSV(): void {
    this.snackBar.open('⏳ Preparando exportación...', '', { duration: 2000 });
    
    const filtros: FiltrosAuditoria = {};
    const formValue = this.filtrosForm.value;
    
    if (formValue.accion) filtros.accion = formValue.accion;
    if (formValue.usuario) filtros.usuario = formValue.usuario;
    if (formValue.fechaInicio) {
      filtros.fechaInicio = new Date(formValue.fechaInicio).toISOString();
    }
    if (formValue.fechaFin) {
      filtros.fechaFin = new Date(formValue.fechaFin).toISOString();
    }

    // Por ahora, generar CSV en el cliente
    this.generarCSVLocal();
  }

  private generarCSVLocal(): void {
    const headers = ['Fecha', 'Acción', 'Usuario', 'Rol', 'Reserva', 'Cliente', 'Habitación', 'Detalles'];
    const rows = this.registros.map(r => [
      this.formatearFecha(r.cambio.fecha),
      r.cambio.accion,
      r.cambio.usuario,
      r.cambio.rol || 'N/A',
      r.reservaId,
      `${r.cliente.nombre} ${r.cliente.apellido}`,
      `Hab ${r.habitacion?.numero || 'N/A'}`,
      r.cambio.detalles
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `auditoria_reservas_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.snackBar.open('✅ Archivo CSV descargado', 'Cerrar', { duration: 3000 });
  }
}
