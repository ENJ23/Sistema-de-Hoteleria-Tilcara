import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class HttpCacheInterceptor implements HttpInterceptor {
  static readonly CACHE_KEY = 'http_cache';
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Solo cachear requests GET
    if (req.method !== 'GET') {
      return next.handle(req);
    }

    const cacheKey = this.getCacheKey(req);
    const cached = this.cache.get(cacheKey);

    // Verificar si el cache es válido
    if (cached && this.isCacheValid(cached.timestamp)) {
      console.log('📦 Cache hit para:', req.url);
      return of(new HttpResponse({ body: cached.data }));
    }

    // Si no hay cache o es inválido, hacer la petición
    return next.handle(req).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          console.log('💾 Guardando en cache:', req.url);
          this.cache.set(cacheKey, {
            data: event.body,
            timestamp: Date.now()
          });
        }
      })
    );
  }

  private getCacheKey(req: HttpRequest<any>): string {
    return `${req.url}?${req.params.toString()}`;
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  // Método para limpiar cache manualmente
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Cache limpiado');
  }

  // Método para limpiar cache de una URL específica
  clearCacheForUrl(url: string): void {
    for (const [key, value] of this.cache.entries()) {
      if (key.includes(url)) {
        this.cache.delete(key);
      }
    }
    console.log('🗑️ Cache limpiado para:', url);
  }
}
