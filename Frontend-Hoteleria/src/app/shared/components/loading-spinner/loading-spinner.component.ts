import { Component, Input } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  template: `
    <div class="loading-spinner" *ngIf="isLoading">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
      <p class="mt-2" *ngIf="message">{{ message }}</p>
    </div>
  `,
  styles: [`
    .loading-spinner {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 2rem;
      text-align: center;
    }
    .spinner-border {
      width: 3rem;
      height: 3rem;
    }
  `],
  standalone: true,
  imports: [CommonModule, NgIf]
})
export class LoadingSpinnerComponent {
  @Input() isLoading: boolean = true;
  @Input() message: string = 'Cargando...';
}
