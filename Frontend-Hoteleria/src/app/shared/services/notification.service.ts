import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Notification {
  id?: number;
  type: 'success' | 'danger' | 'warning' | 'info';
  title?: string;
  message: string;
  timeout?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private counter = 0;

  constructor() {}

  get notifications$(): Observable<Notification[]> {
    return this.notificationsSubject.asObservable();
  }

  show(notification: Omit<Notification, 'id'>): number {
    const id = this.counter++;
    const newNotification = { ...notification, id };
    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next([...currentNotifications, newNotification]);

    if (notification.timeout) {
      setTimeout(() => this.remove(id), notification.timeout);
    }

    return id;
  }

  success(message: string, title?: string, timeout: number = 5000): number {
    return this.show({ type: 'success', message, title, timeout });
  }

  error(message: string, title: string = 'Error', timeout: number = 10000): number {
    return this.show({ type: 'danger', message, title, timeout });
  }

  warning(message: string, title?: string, timeout: number = 7000): number {
    return this.show({ type: 'warning', message, title, timeout });
  }

  info(message: string, title?: string, timeout: number = 5000): number {
    return this.show({ type: 'info', message, title, timeout });
  }

  remove(id: number): void {
    const currentNotifications = this.notificationsSubject.value;
    const index = currentNotifications.findIndex(n => n.id === id);
    
    if (index !== -1) {
      const updatedNotifications = [...currentNotifications];
      updatedNotifications.splice(index, 1);
      this.notificationsSubject.next(updatedNotifications);
    }
  }

  clear(): void {
    this.notificationsSubject.next([]);
  }
}
