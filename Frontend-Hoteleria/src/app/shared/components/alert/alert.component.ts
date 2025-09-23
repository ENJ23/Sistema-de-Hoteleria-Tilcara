import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type AlertType = 'success' | 'danger' | 'warning' | 'info';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="message" class="alert" [ngClass]="alertClasses" role="alert">
      <div class="d-flex align-items-center">
        <i [ngClass]="iconClass" class="me-2"></i>
        <div>
          <strong *ngIf="title" class="d-block">{{ title }}</strong>
          {{ message }}
        </div>
      </div>
      <button *ngIf="dismissible" type="button" class="btn-close" (click)="onDismiss()" aria-label="Cerrar"></button>
    </div>
  `,
  styles: [`
    .alert {
      border-radius: 0.5rem;
      padding: 1rem;
      margin-bottom: 1rem;
      border: 1px solid transparent;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    
    .alert-success {
      color: #0f5132;
      background-color: #d1e7dd;
      border-color: #badbcc;
    }
    
    .alert-danger {
      color: #842029;
      background-color: #f8d7da;
      border-color: #f5c2c7;
    }
    
    .alert-warning {
      color: #664d03;
      background-color: #fff3cd;
      border-color: #ffecb5;
    }
    
    .alert-info {
      color: #055160;
      background-color: #cff4fc;
      border-color: #b6effb;
    }
    
    .btn-close {
      padding: 0.5rem 0.5rem;
      margin: -0.5rem -0.5rem -0.5rem auto;
    }
  `]
})
export class AlertComponent {
  @Input() type: AlertType = 'info';
  @Input() message: string | null = null;
  @Input() title: string | null = null;
  @Input() dismissible = false;
  @Input() dismissOnTimeout: number | null = null;
  
  private timeoutId: any = null;
  
  get alertClasses(): { [key: string]: boolean } {
    return {
      'alert-success': this.type === 'success',
      'alert-danger': this.type === 'danger',
      'alert-warning': this.type === 'warning',
      'alert-info': this.type === 'info',
      'alert-dismissible': this.dismissible
    };
  }
  
  get iconClass(): string {
    const icons: { [key in AlertType]: string } = {
      'success': 'bi bi-check-circle-fill',
      'danger': 'bi bi-exclamation-triangle-fill',
      'warning': 'bi bi-exclamation-triangle-fill',
      'info': 'bi bi-info-circle-fill'
    };
    return icons[this.type] || '';
  }
  
  ngOnInit() {
    if (this.dismissOnTimeout && this.message) {
      this.setupDismissTimer();
    }
  }
  
  ngOnChanges() {
    if (this.dismissOnTimeout && this.message) {
      this.setupDismissTimer();
    }
  }
  
  onDismiss() {
    this.message = null;
    this.clearTimer();
  }
  
  private setupDismissTimer() {
    this.clearTimer();
    if (this.dismissOnTimeout) {
      this.timeoutId = setTimeout(() => {
        this.message = null;
      }, this.dismissOnTimeout);
    }
  }
  
  private clearTimer() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
  
  ngOnDestroy() {
    this.clearTimer();
  }
}
