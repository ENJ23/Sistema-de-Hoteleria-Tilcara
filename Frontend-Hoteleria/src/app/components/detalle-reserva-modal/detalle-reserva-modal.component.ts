import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ReservaService } from '../../services/reserva.service';
import { DateTimeService } from '../../services/date-time.service';
import { PagoDialogComponent } from '../pago-dialog/pago-dialog.component';
import { AuthService } from '../../services/auth.service';

export interface DetalleReservaData {
  reserva: any;
}

@Component({
  selector: 'app-detalle-reserva-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule
  ],
  template: `
    <div class="detalle-reserva-modal">
      <div class="modal-header">
        <h2 mat-dialog-title>
          <mat-icon>hotel</mat-icon>
          Detalle de Reserva
        </h2>
        <button mat-icon-button (click)="cerrar()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="modal-content">
        <div class="reserva-info">
          <!-- Información del Cliente -->
          <mat-card class="info-card">
            <mat-card-header>
              <mat-icon mat-card-avatar>person</mat-icon>
              <mat-card-title>Información del Cliente</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="info-row">
                <span class="label">Nombre:</span>
                <span class="value">{{ data.reserva.cliente?.nombre }} {{ data.reserva.cliente?.apellido }}</span>
              </div>
              <div class="info-row">
                <span class="label">Email:</span>
                <span class="value">{{ data.reserva.cliente?.email }}</span>
              </div>
              <div class="info-row">
                <span class="label">Teléfono:</span>
                <span class="value">{{ data.reserva.cliente?.telefono }}</span>
              </div>
              <div class="info-row" *ngIf="data.reserva.cliente?.documento">
                <span class="label">Documento:</span>
                <span class="value">{{ data.reserva.cliente?.documento }}</span>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Información de la Habitación -->
          <mat-card class="info-card">
            <mat-card-header>
              <mat-icon mat-card-avatar>bed</mat-icon>
              <mat-card-title>Información de la Habitación</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="info-row">
                <span class="label">Número:</span>
                <span class="value">{{ data.reserva.habitacion?.numero }}</span>
              </div>
              <div class="info-row">
                <span class="label">Tipo:</span>
                <span class="value">{{ data.reserva.habitacion?.tipo }}</span>
              </div>
              <div class="info-row">
                <span class="label">Capacidad:</span>
                <span class="value">{{ data.reserva.habitacion?.capacidad }} personas</span>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Fechas y Horarios -->
          <mat-card class="info-card">
            <mat-card-header>
              <mat-icon mat-card-avatar>schedule</mat-icon>
              <mat-card-title>Fechas y Horarios</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="info-row">
                <span class="label">Entrada:</span>
                <span class="value">{{ data.reserva.fechaEntrada | date:'dd/MM/yyyy' }} a las {{ data.reserva.horaEntrada }}</span>
              </div>
              <div class="info-row">
                <span class="label">Salida:</span>
                <span class="value">{{ data.reserva.fechaSalida | date:'dd/MM/yyyy' }} a las {{ data.reserva.horaSalida }}</span>
              </div>
            </mat-card-content>
          </mat-card>

                     <!-- Estado y Pago -->
           <mat-card class="info-card">
             <mat-card-header>
               <mat-icon mat-card-avatar>info</mat-icon>
               <mat-card-title>Estado y Pago</mat-card-title>
             </mat-card-header>
             <mat-card-content>
               <div class="info-row">
                 <span class="label">Estado:</span>
                 <mat-chip [ngClass]="'estado-' + data.reserva.estado?.toLowerCase()" class="estado-chip">
                   {{ data.reserva.estado }}
                 </mat-chip>
               </div>
               <div class="info-row">
                 <span class="label">Estado de Pago:</span>
                 <mat-chip [ngClass]="isCompletamentePagado() ? 'pagado' : 'pendiente'" class="pago-chip">
                   {{ getEstadoPagoText() }}
                 </mat-chip>
               </div>
               <div class="info-row" *ngIf="data.reserva.montoPagado !== undefined">
                 <span class="label">Monto Pagado:</span>
                 <span class="value precio">{{ data.reserva.montoPagado }}€</span>
               </div>
               <div class="info-row" *ngIf="data.reserva.montoRestante !== undefined">
                 <span class="label">Monto Restante:</span>
                 <span class="value precio restante">{{ data.reserva.montoRestante }}€</span>
               </div>
               <div class="info-row" *ngIf="data.reserva.totalPagos > 0">
                 <span class="label">Total de Pagos:</span>
                 <span class="value">{{ data.reserva.totalPagos }} pago(s)</span>
               </div>
             </mat-card-content>
           </mat-card>

           <!-- Historial de Pagos -->
           <mat-card class="info-card" *ngIf="data.reserva.historialPagos && data.reserva.historialPagos.length > 0">
             <mat-card-header>
               <mat-icon mat-card-avatar>receipt</mat-icon>
               <mat-card-title>Historial de Pagos</mat-card-title>
             </mat-card-header>
             <mat-card-content>
               <div class="historial-pagos">
                 <div class="pago-item" *ngFor="let pago of data.reserva.historialPagos; let i = index">
                   <div class="pago-header">
                     <span class="pago-numero">Pago #{{ i + 1 }}</span>
                     <span class="pago-fecha">{{ pago.fechaPago | date:'dd/MM/yyyy HH:mm' }}</span>
                   </div>
                   <div class="pago-details">
                     <div class="pago-monto">
                       <strong>{{ pago.monto }}€</strong>
                     </div>
                     <div class="pago-metodo">
                       <mat-chip class="metodo-chip">{{ pago.metodoPago }}</mat-chip>
                     </div>
                     <div class="pago-registrado" *ngIf="pago.registradoPor">
                       <small>Registrado por: {{ pago.registradoPor }}</small>
                     </div>
                     <div class="pago-observaciones" *ngIf="pago.observaciones">
                       <small>{{ pago.observaciones }}</small>
                     </div>
                   </div>
                 </div>
               </div>
             </mat-card-content>
           </mat-card>

          <!-- Precios -->
          <mat-card class="info-card">
            <mat-card-header>
              <mat-icon mat-card-avatar>euro</mat-icon>
              <mat-card-title>Información de Precios</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="info-row">
                <span class="label">Precio por noche:</span>
                <span class="value precio">{{ data.reserva.precioPorNoche }}€</span>
              </div>
              <div class="info-row">
                <span class="label">Precio total:</span>
                <span class="value precio total">{{ data.reserva.precioTotal }}€</span>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Observaciones -->
          <mat-card class="info-card" *ngIf="data.reserva.observaciones">
            <mat-card-header>
              <mat-icon mat-card-avatar>note</mat-icon>
              <mat-card-title>Observaciones</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p class="observaciones">{{ data.reserva.observaciones }}</p>
            </mat-card-content>
          </mat-card>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions class="modal-actions">
        <!-- Botones principales de acción -->
        <div class="action-buttons-primary">
          <!-- Check-in -->
          <button 
            mat-fab 
            color="primary" 
            class="action-btn-primary checkin"
            [disabled]="data.reserva.estado !== 'Confirmada' && data.reserva.estado !== 'Pendiente'"
            (click)="realizarCheckIn()"
            title="Realizar Check-in">
            <mat-icon>login</mat-icon>
          </button>

          <!-- Check-out -->
          <button 
            mat-fab 
            color="accent" 
            class="action-btn-primary checkout"
            [disabled]="data.reserva.estado !== 'En curso'"
            (click)="realizarCheckOut()"
            title="Realizar Check-out">
            <mat-icon>logout</mat-icon>
          </button>

          <!-- Registrar Pago -->
          <button 
            mat-fab 
            color="warn" 
            class="action-btn-primary pago"
            [disabled]="isCompletamentePagado()"
            (click)="registrarPago()"
            [title]="isCompletamentePagado() ? 'Reserva completamente pagada' : 'Registrar Pago'">
            <mat-icon>payment</mat-icon>
          </button>
        </div>

        <!-- Botones secundarios -->
        <div class="action-buttons-secondary">
          <!-- Editar -->
          <button 
            mat-stroked-button 
            class="action-btn-secondary editar"
            (click)="editarReserva()">
            <mat-icon>edit</mat-icon>
            <span class="btn-text">Editar</span>
          </button>

          <!-- Imprimir -->
          <button 
            mat-stroked-button 
            class="action-btn-secondary imprimir"
            (click)="imprimirReserva()">
            <mat-icon>print</mat-icon>
            <span class="btn-text">Imprimir</span>
          </button>

          <!-- Eliminar -->
          <button 
            mat-stroked-button 
            class="action-btn-secondary eliminar"
            (click)="eliminarReserva()">
            <mat-icon>delete</mat-icon>
            <span class="btn-text">Eliminar</span>
          </button>
        </div>

        <!-- Botón de cerrar -->
        <div class="close-section">
          <button mat-button class="btn-close" (click)="cerrar()">
            <mat-icon>close</mat-icon>
            <span>Cerrar</span>
          </button>
        </div>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .detalle-reserva-modal {
      max-width: 800px;
      width: 100%;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid #e0e0e0;
    }

    .modal-header h2 {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #1976d2;
    }

    .modal-content {
      max-height: 70vh;
      overflow-y: auto;
      padding: 24px;
    }

    .reserva-info {
      display: grid;
      gap: 16px;
    }

    .info-card {
      margin-bottom: 16px;
    }

    .info-card mat-card-header {
      margin-bottom: 16px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .info-row:last-child {
      border-bottom: none;
    }

    .label {
      font-weight: 600;
      color: #666;
      min-width: 120px;
    }

    .value {
      color: #333;
      text-align: right;
    }

    .precio {
      font-weight: 600;
      color: #1976d2;
    }

    .precio.total {
      font-size: 1.1em;
      color: #2e7d32;
    }

    .observaciones {
      font-style: italic;
      color: #666;
      margin: 0;
      padding: 8px;
      background-color: #f9f9f9;
      border-radius: 4px;
    }

    .estado-chip {
      font-weight: 600;
    }

    .estado-pendiente {
      background-color: #ff9800;
      color: white;
    }

    .estado-en-curso {
      background-color: #2196f3;
      color: white;
    }

    .estado-completada {
      background-color: #4caf50;
      color: white;
    }

    .estado-cancelada {
      background-color: #f44336;
      color: white;
    }

    .pago-chip {
      font-weight: 600;
    }

    .pagado {
      background-color: #4caf50;
      color: white;
    }

         .pendiente {
       background-color: #ff9800;
       color: white;
     }

     .precio.restante {
       color: #f44336;
       font-weight: 700;
     }

     .historial-pagos {
       display: flex;
       flex-direction: column;
       gap: 12px;
     }

     .pago-item {
       border: 1px solid #e0e0e0;
       border-radius: 8px;
       padding: 12px;
       background-color: #f9f9f9;
     }

     .pago-header {
       display: flex;
       justify-content: space-between;
       align-items: center;
       margin-bottom: 8px;
       padding-bottom: 8px;
       border-bottom: 1px solid #e0e0e0;
     }

     .pago-numero {
       font-weight: 600;
       color: #1976d2;
     }

     .pago-fecha {
       font-size: 0.9em;
       color: #666;
     }

     .pago-details {
       display: grid;
       gap: 8px;
     }

     .pago-monto {
       font-size: 1.1em;
       color: #2e7d32;
     }

     .metodo-chip {
       background-color: #1976d2;
       color: white;
       font-size: 0.8em;
     }

     .pago-registrado {
       color: #666;
       font-style: italic;
     }

     .pago-observaciones {
       color: #666;
       font-style: italic;
       padding: 4px 8px;
       background-color: #f0f0f0;
       border-radius: 4px;
     }

    .modal-actions {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 24px;
      border-top: 1px solid #e0e0e0;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    }

    /* Botones principales (FAB) */
    .action-buttons-primary {
      display: flex;
      justify-content: center;
      gap: 20px;
      padding: 16px 0;
    }

    .action-btn-primary {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .action-btn-primary::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(45deg, rgba(255,255,255,0.2), transparent);
      border-radius: 50%;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .action-btn-primary:hover::before {
      opacity: 1;
    }

    .action-btn-primary:hover {
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
    }

    .action-btn-primary:active {
      transform: translateY(0) scale(0.95);
    }

    .action-btn-primary.checkin {
      background: linear-gradient(135deg, #4caf50, #45a049);
    }

    .action-btn-primary.checkout {
      background: linear-gradient(135deg, #ff9800, #f57c00);
    }

    .action-btn-primary.pago {
      background: linear-gradient(135deg, #2196f3, #1976d2);
    }

    .action-btn-primary:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .action-btn-primary:disabled:hover {
      transform: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    /* Botones secundarios */
    .action-buttons-secondary {
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .action-btn-secondary {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      border-radius: 25px;
      font-weight: 500;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      min-width: 120px;
      justify-content: center;
    }

    .action-btn-secondary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .action-btn-secondary.editar {
      border-color: #9c27b0;
      color: #9c27b0;
    }

    .action-btn-secondary.editar:hover {
      background-color: #9c27b0;
      color: white;
    }

    .action-btn-secondary.imprimir {
      border-color: #607d8b;
      color: #607d8b;
    }

    .action-btn-secondary.imprimir:hover {
      background-color: #607d8b;
      color: white;
    }

    .action-btn-secondary.eliminar {
      border-color: #f44336;
      color: #f44336;
    }

    .action-btn-secondary.eliminar:hover {
      background-color: #f44336;
      color: white;
    }

    /* Botón de cerrar */
    .close-section {
      display: flex;
      justify-content: center;
      padding-top: 8px;
      border-top: 1px solid #dee2e6;
    }

    .btn-close {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      color: #6c757d;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .btn-close:hover {
      color: #495057;
      background-color: rgba(108, 117, 125, 0.1);
      border-radius: 20px;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .detalle-reserva-modal {
        max-width: 95vw;
        max-height: 95vh;
      }

      .modal-content {
        max-height: 60vh;
        padding: 16px;
      }

      .modal-actions {
        padding: 16px;
        gap: 16px;
      }

      .action-buttons-primary {
        gap: 16px;
        padding: 12px 0;
      }

      .action-btn-primary {
        width: 56px;
        height: 56px;
      }

      .action-buttons-secondary {
        flex-direction: column;
        gap: 8px;
      }

      .action-btn-secondary {
        width: 100%;
        min-width: auto;
        padding: 14px 20px;
      }

      .info-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }

      .value {
        text-align: left;
      }

      .historial-pagos {
        gap: 8px;
      }

      .pago-item {
        padding: 8px;
      }
    }

    @media (max-width: 480px) {
      .detalle-reserva-modal {
        max-width: 100vw;
        max-height: 100vh;
        border-radius: 0;
      }

      .modal-header {
        padding: 12px 16px;
      }

      .modal-header h2 {
        font-size: 1.2em;
      }

      .modal-content {
        padding: 12px;
        max-height: 65vh;
      }

      .modal-actions {
        padding: 12px;
        gap: 12px;
      }

      .action-btn-primary {
        width: 48px;
        height: 48px;
      }

      .action-btn-primary mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .action-btn-secondary {
        padding: 12px 16px;
        font-size: 0.9em;
      }

      .btn-text {
        font-size: 0.9em;
      }
    }
  `]
})
export class DetalleReservaModalComponent {
  constructor(
    public dialogRef: MatDialogRef<DetalleReservaModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DetalleReservaData,
    private reservaService: ReservaService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router,
    private dateTimeService: DateTimeService,
    private authService: AuthService
  ) {}

  realizarCheckIn(): void {
    // Verificar autenticación antes de proceder
    if (!this.authService.isAuthenticated()) {
      this.snackBar.open('❌ Debe iniciar sesión para realizar check-in', 'Cerrar', {
        duration: 4000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    const horaCheckIn = this.dateTimeService.getCurrentTimeStringFormatted();
    
    console.log('Realizando check-in:', {
      reservaId: this.data.reserva._id,
      horaCheckIn: horaCheckIn
    });
    
    this.reservaService.checkIn(this.data.reserva._id, horaCheckIn).subscribe({
      next: (reservaActualizada) => {
        this.snackBar.open(`✅ Check-in realizado exitosamente para ${this.data.reserva.cliente?.nombre} ${this.data.reserva.cliente?.apellido}`, 'Cerrar', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        
        // Actualizar los datos de la reserva en el modal
        this.data.reserva = reservaActualizada;
        
        this.dialogRef.close({ 
          action: 'checkin', 
          reserva: reservaActualizada,
          horaCheckIn: horaCheckIn
        });
      },
      error: (error) => {
        console.error('Error al procesar check-in:', error);
        
        let mensajeError = '❌ Error al procesar el check-in. Intente nuevamente.';
        
        if (error.status === 401) {
          mensajeError = '❌ Sesión expirada. Debe iniciar sesión nuevamente.';
          this.authService.logout();
        } else if (error.status === 403) {
          mensajeError = '❌ No tiene permisos para realizar check-in.';
        } else if (error.status === 404) {
          mensajeError = '❌ Reserva no encontrada.';
        } else if (error.status === 0) {
          mensajeError = '❌ Error de conexión. Verifique que el servidor esté ejecutándose.';
        }
        
        this.snackBar.open(mensajeError, 'Cerrar', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  realizarCheckOut(): void {
    // Verificar autenticación antes de proceder
    if (!this.authService.isAuthenticated()) {
      this.snackBar.open('❌ Debe iniciar sesión para realizar check-out', 'Cerrar', {
        duration: 4000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    const horaCheckOut = this.dateTimeService.getCurrentTimeStringFormatted();
    
    console.log('Realizando check-out:', {
      reservaId: this.data.reserva._id,
      horaCheckOut: horaCheckOut
    });
    
    this.reservaService.checkOut(this.data.reserva._id, horaCheckOut).subscribe({
      next: (reservaActualizada) => {
        this.snackBar.open(`✅ Check-out realizado exitosamente para ${this.data.reserva.cliente?.nombre} ${this.data.reserva.cliente?.apellido}`, 'Cerrar', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        
        // Actualizar los datos de la reserva en el modal
        this.data.reserva = reservaActualizada;
        
        this.dialogRef.close({ 
          action: 'checkout', 
          reserva: reservaActualizada,
          horaCheckOut: horaCheckOut
        });
      },
      error: (error) => {
        console.error('Error al procesar check-out:', error);
        
        let mensajeError = '❌ Error al procesar el check-out. Intente nuevamente.';
        
        if (error.status === 401) {
          mensajeError = '❌ Sesión expirada. Debe iniciar sesión nuevamente.';
          this.authService.logout();
        } else if (error.status === 403) {
          mensajeError = '❌ No tiene permisos para realizar check-out.';
        } else if (error.status === 404) {
          mensajeError = '❌ Reserva no encontrada.';
        } else if (error.status === 0) {
          mensajeError = '❌ Error de conexión. Verifique que el servidor esté ejecutándose.';
        }
        
        this.snackBar.open(mensajeError, 'Cerrar', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  registrarPago(): void {
    // Verificar autenticación antes de proceder
    if (!this.authService.isAuthenticated()) {
      this.snackBar.open('❌ Debe iniciar sesión para registrar pagos', 'Cerrar', {
        duration: 4000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    const dialogRef = this.dialog.open(PagoDialogComponent, {
      width: '500px',
      data: {
        reserva: this.data.reserva,
        montoTotal: this.data.reserva.precioTotal || this.data.reserva.precioPorNoche
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.confirmado) {
        console.log('Registrando pago:', {
          reservaId: this.data.reserva._id,
          metodoPago: result.metodoPago,
          monto: result.monto,
          observaciones: result.observaciones
        });

        this.reservaService.registrarPago(
          this.data.reserva._id, 
          result.metodoPago, 
          result.monto,
          result.observaciones
        ).subscribe({
          next: (reservaActualizada) => {
            const mensaje = reservaActualizada.estaCompletamentePagado ? 
              `✅ Pago completado exitosamente por $${result.monto}` :
              `✅ Pago parcial registrado por $${result.monto}. Restante: $${reservaActualizada.montoRestante}`;
            
            this.snackBar.open(mensaje, 'Cerrar', {
              duration: 4000,
              panelClass: ['success-snackbar']
            });
            
            // Actualizar los datos de la reserva en el modal
            this.data.reserva = reservaActualizada;
            
            this.dialogRef.close({ 
              action: 'pago', 
              reserva: reservaActualizada,
              metodoPago: result.metodoPago,
              monto: result.monto,
              observaciones: result.observaciones
            });
          },
          error: (error) => {
            console.error('Error al registrar pago:', error);
            
            let mensajeError = '❌ Error al registrar el pago. Intente nuevamente.';
            
            if (error.status === 401) {
              mensajeError = '❌ Sesión expirada. Debe iniciar sesión nuevamente.';
              this.authService.logout();
            } else if (error.status === 403) {
              mensajeError = '❌ No tiene permisos para registrar pagos.';
            } else if (error.status === 404) {
              mensajeError = '❌ Reserva no encontrada.';
            } else if (error.status === 400 && error.error?.message) {
              mensajeError = `❌ ${error.error.message}`;
            } else if (error.status === 0) {
              mensajeError = '❌ Error de conexión. Verifique que el servidor esté ejecutándose.';
            }
            
            this.snackBar.open(mensajeError, 'Cerrar', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        });
      }
    });
  }

  editarReserva(): void {
    // Cerrar el modal actual y navegar a la página de edición
    this.dialogRef.close({ action: 'editar', reserva: this.data.reserva });
    
    // Navegar a la página de nueva reserva con los datos precargados
    this.router.navigate(['/nueva-reserva'], {
      queryParams: {
        modo: 'editar',
        reservaId: this.data.reserva._id
      }
    });
  }

  imprimirReserva(): void {
    // Mostrar opciones de impresión
    const opciones = [
      { texto: 'Descargar PDF', accion: 'pdf' },
      { texto: 'Imprimir con navegador', accion: 'navegador' },
      { texto: 'Cancelar', accion: 'cancelar' }
    ];

    const seleccion = prompt(
      'Seleccione el método de impresión:\n\n' +
      '1. Descargar PDF (recomendado)\n' +
      '2. Imprimir con navegador\n' +
      '3. Cancelar\n\n' +
      'Ingrese el número de la opción deseada:'
    );

    if (!seleccion || seleccion === '3' || seleccion.toLowerCase() === 'cancelar') {
      return;
    }

    if (seleccion === '1' || seleccion.toLowerCase() === 'pdf') {
      this.descargarPDF();
    } else if (seleccion === '2' || seleccion.toLowerCase() === 'navegador') {
      this.imprimirConNavegador();
    } else {
      this.snackBar.open('❌ Opción no válida', 'Cerrar', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    }
  }

  private descargarPDF(): void {
    this.snackBar.open('📄 Generando PDF...', 'Cerrar', {
      duration: 2000
    });

    // Generar PDF de la reserva
    this.reservaService.generarPDF(this.data.reserva._id).subscribe({
      next: (blob) => {
        // Verificar que el blob sea válido
        if (!blob || blob.size === 0) {
          this.snackBar.open('❌ Error: El PDF generado está vacío', 'Cerrar', {
            duration: 4000,
            panelClass: ['error-snackbar']
          });
          return;
        }

        // Verificar que sea un PDF válido
        if (blob.type !== 'application/pdf') {
          this.snackBar.open('❌ Error: El archivo no es un PDF válido', 'Cerrar', {
            duration: 4000,
            panelClass: ['error-snackbar']
          });
          return;
        }

        // Crear URL del blob y descargar
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reserva-${this.data.reserva._id}.pdf`;
        link.style.display = 'none';
        
        // Agregar al DOM, hacer clic y remover
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpiar la URL
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 1000);
        
        this.snackBar.open('✅ PDF descargado exitosamente', 'Cerrar', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        console.error('Error al generar PDF:', error);
        
        let mensajeError = '❌ Error al generar el PDF. Intente nuevamente.';
        
        if (error.status === 401) {
          mensajeError = '❌ Sesión expirada. Debe iniciar sesión nuevamente.';
          this.authService.logout();
        } else if (error.status === 403) {
          mensajeError = '❌ No tiene permisos para generar PDFs.';
        } else if (error.status === 404) {
          mensajeError = '❌ Reserva no encontrada.';
        } else if (error.status === 0) {
          mensajeError = '❌ Error de conexión. Verifique que el servidor esté ejecutándose.';
        }
        
        this.snackBar.open(mensajeError, 'Cerrar', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  private imprimirConNavegador(): void {
    // Crear contenido HTML para impresión
    const contenidoImpresion = this.generarContenidoImpresion();
    
    // Abrir ventana de impresión
    const ventanaImpresion = window.open('', '_blank', 'width=800,height=600');
    
    if (!ventanaImpresion) {
      this.snackBar.open('❌ No se pudo abrir la ventana de impresión. Verifique que los pop-ups estén habilitados.', 'Cerrar', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    ventanaImpresion.document.write(contenidoImpresion);
    ventanaImpresion.document.close();
    
    // Esperar a que se cargue el contenido y luego imprimir
    ventanaImpresion.onload = () => {
      setTimeout(() => {
        ventanaImpresion.print();
        ventanaImpresion.close();
      }, 500);
    };
    
    this.snackBar.open('🖨️ Abriendo ventana de impresión...', 'Cerrar', {
      duration: 2000
    });
  }

  private generarContenidoImpresion(): string {
    const reserva = this.data.reserva;
    const fechaEntrada = new Date(reserva.fechaEntrada);
    const fechaSalida = new Date(reserva.fechaSalida);
    const dias = Math.ceil((fechaSalida.getTime() - fechaEntrada.getTime()) / (1000 * 60 * 60 * 24));

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reserva ${reserva._id}</title>
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
          }
          
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
            line-height: 1.6;
          }
          
          .header {
            text-align: center;
            border-bottom: 3px solid #1976d2;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          
          .header h1 {
            color: #1976d2;
            margin: 0;
            font-size: 28px;
          }
          
          .header h2 {
            color: #666;
            margin: 10px 0 0 0;
            font-size: 18px;
            font-weight: normal;
          }
          
          .reserva-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          
          .section {
            margin-bottom: 25px;
          }
          
          .section h3 {
            color: #1976d2;
            border-bottom: 2px solid #e0e0e0;
            padding-bottom: 5px;
            margin-bottom: 15px;
          }
          
          .info-row {
            display: flex;
            margin-bottom: 8px;
          }
          
          .info-label {
            font-weight: bold;
            min-width: 150px;
            color: #555;
          }
          
          .info-value {
            flex: 1;
          }
          
          .precio {
            font-weight: bold;
            color: #2e7d32;
          }
          
          .precio-total {
            font-size: 18px;
            color: #1976d2;
          }
          
          .estado {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-weight: bold;
            color: white;
            background-color: ${this.getColorEstado(reserva.estado)};
          }
          
          .pago-status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-weight: bold;
            color: white;
            background-color: ${reserva.pagado ? '#4caf50' : '#ff9800'};
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          
          .historial-pagos {
            background: #f0f8ff;
            padding: 15px;
            border-radius: 5px;
            margin-top: 10px;
          }
          
          .pago-item {
            background: white;
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 5px;
            border-left: 4px solid #1976d2;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>HOSTAL DEL CENTRO</h1>
          <h2>Sistema de Gestión Hotelera</h2>
          <h2>COMPROBANTE DE RESERVA</h2>
        </div>
        
        <div class="reserva-info">
          <div class="info-row">
            <span class="info-label">Número de Reserva:</span>
            <span class="info-value">${reserva._id}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Fecha de Emisión:</span>
            <span class="info-value">${new Date().toLocaleDateString('es-ES')}</span>
          </div>
        </div>
        
        <div class="section">
          <h3>📋 INFORMACIÓN DEL CLIENTE</h3>
          <div class="info-row">
            <span class="info-label">Nombre:</span>
            <span class="info-value">${reserva.cliente.nombre} ${reserva.cliente.apellido}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Email:</span>
            <span class="info-value">${reserva.cliente.email}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Teléfono:</span>
            <span class="info-value">${reserva.cliente.telefono}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Documento:</span>
            <span class="info-value">${reserva.cliente.documento}</span>
          </div>
          ${reserva.cliente.direccion ? `
          <div class="info-row">
            <span class="info-label">Dirección:</span>
            <span class="info-value">${reserva.cliente.direccion}</span>
          </div>
          ` : ''}
          ${reserva.cliente.nacionalidad ? `
          <div class="info-row">
            <span class="info-label">Nacionalidad:</span>
            <span class="info-value">${reserva.cliente.nacionalidad}</span>
          </div>
          ` : ''}
        </div>
        
        <div class="section">
          <h3>🏨 INFORMACIÓN DE LA HABITACIÓN</h3>
          <div class="info-row">
            <span class="info-label">Número:</span>
            <span class="info-value">${reserva.habitacion?.numero || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Tipo:</span>
            <span class="info-value">${reserva.habitacion?.tipo || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Capacidad:</span>
            <span class="info-value">${reserva.habitacion?.capacidad || 'N/A'} personas</span>
          </div>
        </div>
        
        <div class="section">
          <h3>📅 FECHAS Y HORARIOS</h3>
          <div class="info-row">
            <span class="info-label">Fecha de Entrada:</span>
            <span class="info-value">${fechaEntrada.toLocaleDateString('es-ES')} a las ${reserva.horaEntrada}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Fecha de Salida:</span>
            <span class="info-value">${fechaSalida.toLocaleDateString('es-ES')} a las ${reserva.horaSalida}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Duración:</span>
            <span class="info-value">${dias} días</span>
          </div>
        </div>
        
        <div class="section">
          <h3>💰 INFORMACIÓN DE PRECIOS</h3>
          <div class="info-row">
            <span class="info-label">Precio por Noche:</span>
            <span class="info-value precio">$${reserva.precioPorNoche}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Total:</span>
            <span class="info-value precio precio-total">$${reserva.precioTotal}</span>
          </div>
        </div>
        
        <div class="section">
          <h3>📊 ESTADO Y PAGOS</h3>
          <div class="info-row">
            <span class="info-label">Estado:</span>
            <span class="info-value"><span class="estado">${reserva.estado}</span></span>
          </div>
          <div class="info-row">
            <span class="info-label">Estado de Pago:</span>
            <span class="info-value"><span class="pago-status">${reserva.pagado ? 'PAGADO' : 'PENDIENTE'}</span></span>
          </div>
          ${reserva.montoPagado !== undefined ? `
          <div class="info-row">
            <span class="info-label">Monto Pagado:</span>
            <span class="info-value precio">$${reserva.montoPagado}</span>
          </div>
          ` : ''}
          ${reserva.montoRestante !== undefined ? `
          <div class="info-row">
            <span class="info-label">Monto Restante:</span>
            <span class="info-value precio">$${reserva.montoRestante}</span>
          </div>
          ` : ''}
          ${reserva.metodoPago ? `
          <div class="info-row">
            <span class="info-label">Método de Pago:</span>
            <span class="info-value">${reserva.metodoPago}</span>
          </div>
          ` : ''}
        </div>
        
        ${reserva.historialPagos && reserva.historialPagos.length > 0 ? `
        <div class="section">
          <h3>💳 HISTORIAL DE PAGOS</h3>
          <div class="historial-pagos">
            ${reserva.historialPagos.map((pago: any, index: number) => `
              <div class="pago-item">
                <strong>Pago #${index + 1}</strong><br>
                Monto: $${pago.monto} | Método: ${pago.metodoPago}<br>
                Fecha: ${new Date(pago.fechaPago).toLocaleString('es-ES')}<br>
                ${pago.observaciones ? `Observaciones: ${pago.observaciones}<br>` : ''}
                Registrado por: ${pago.registradoPor}
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
        
        ${reserva.observaciones ? `
        <div class="section">
          <h3>📝 OBSERVACIONES</h3>
          <p>${reserva.observaciones}</p>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>Este documento es generado automáticamente por el Sistema de Gestión Hotelera</p>
          <p>Para consultas contactar al hostal al +54 11 1234-5678</p>
          <p>Generado el ${new Date().toLocaleString('es-ES')}</p>
        </div>
      </body>
      </html>
    `;
  }

  private getColorEstado(estado: string): string {
    const colores: { [key: string]: string } = {
      'Pendiente': '#ff9800',
      'Confirmada': '#4caf50',
      'En curso': '#2196f3',
      'Completada': '#4caf50',
      'Cancelada': '#f44336',
      'No Show': '#9c27b0'
    };
    return colores[estado] || '#666';
  }

  // Método para verificar si la reserva está completamente pagada
  isCompletamentePagado(): boolean {
    // Usar el campo calculado del backend si está disponible
    if (this.data.reserva.estaCompletamentePagado !== undefined) {
      return this.data.reserva.estaCompletamentePagado;
    }
    
    // Calcular manualmente si no está disponible
    if (this.data.reserva.montoPagado !== undefined && this.data.reserva.precioTotal !== undefined) {
      return this.data.reserva.montoPagado >= this.data.reserva.precioTotal;
    }
    
    // Fallback al campo pagado original
    return this.data.reserva.pagado || false;
  }

  // Método para obtener el texto del estado de pago
  getEstadoPagoText(): string {
    if (this.isCompletamentePagado()) {
      return 'Completamente Pagado';
    }
    
    if (this.data.reserva.montoPagado && this.data.reserva.montoPagado > 0) {
      return 'Pago Parcial';
    }
    
    return 'Pago Pendiente';
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  eliminarReserva(): void {
    // Confirmación simple y directa
    const confirmacion = confirm(
      `¿Está seguro de que desea eliminar la reserva de ${this.data.reserva.cliente?.nombre} ${this.data.reserva.cliente?.apellido}?\n\n` +
      `Habitación: ${this.data.reserva.habitacion?.numero}\n` +
      `Fechas: ${this.dateTimeService.formatDateForDisplay(new Date(this.data.reserva.fechaEntrada))} - ${this.dateTimeService.formatDateForDisplay(new Date(this.data.reserva.fechaSalida))}\n\n` +
      `Esta acción NO se puede deshacer.`
    );

    if (!confirmacion) {
      return;
    }

    // Proceder con la eliminación
    this.procesarEliminacion();
  }

  private procesarEliminacion(): void {
    console.log('Eliminando reserva:', this.data.reserva._id);
    
    this.snackBar.open('Eliminando reserva...', 'Cerrar', {
      duration: 2000
    });

    this.reservaService.deleteReserva(this.data.reserva._id).subscribe({
      next: (response) => {
        console.log('Reserva eliminada exitosamente:', response);
        
        this.snackBar.open('✅ Reserva eliminada exitosamente', 'Cerrar', {
          duration: 4000,
          panelClass: ['snackbar-success']
        });

        // Cerrar el modal y retornar resultado para actualizar la vista
        this.dialogRef.close({
          action: 'eliminada',
          reserva: this.data.reserva
        });
      },
      error: (error) => {
        console.error('Error al eliminar reserva:', error);
        
        let mensajeError = 'Error al eliminar la reserva';
        
        if (error.status === 404) {
          mensajeError = 'La reserva no fue encontrada';
        } else if (error.status === 403) {
          mensajeError = 'No tiene permisos para eliminar esta reserva';
        } else if (error.status === 400) {
          mensajeError = 'No se puede eliminar esta reserva en su estado actual';
        } else if (error.status === 401) {
          mensajeError = 'Sesión expirada. Debe iniciar sesión nuevamente';
          this.authService.logout();
        } else if (error.status === 0) {
          mensajeError = 'Error de conexión. Verifique que el servidor esté ejecutándose';
        } else if (error.error?.message) {
          mensajeError = error.error.message;
        }

        this.snackBar.open(`❌ ${mensajeError}`, 'Cerrar', {
          duration: 5000,
          panelClass: ['snackbar-error']
        });
      }
    });
  }
}

