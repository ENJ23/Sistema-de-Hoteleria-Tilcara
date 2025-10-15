import { HttpRequest, HttpHandlerFn, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

// Cache global para el interceptor
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export function httpCacheInterceptor(req: HttpRequest<any>, next: HttpHandlerFn): Observable<any> {
  // Solo cachear requests GET
  if (req.method !== 'GET') {
    return next(req);
  }

  const cacheKey = getCacheKey(req);
  const cached = cache.get(cacheKey);

  // Verificar si el cache es válido
  if (cached && isCacheValid(cached.timestamp)) {
    console.log('📦 Cache hit para:', req.url);
    return of(new HttpResponse({ body: cached.data }));
  }

  // Si no hay cache o es inválido, hacer la petición
  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse) {
        console.log('💾 Guardando en cache:', req.url);
        cache.set(cacheKey, {
          data: event.body,
          timestamp: Date.now()
        });
      }
    })
  );
}

function getCacheKey(req: HttpRequest<any>): string {
  return `${req.url}?${req.params.toString()}`;
}

function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_DURATION;
}

// Funciones de utilidad para limpiar cache
export function clearCache(): void {
  cache.clear();
  console.log('🗑️ Cache limpiado');
}

export function clearCacheForUrl(url: string): void {
  for (const [key, value] of cache.entries()) {
    if (key.includes(url)) {
      cache.delete(key);
    }
  }
  console.log('🗑️ Cache limpiado para:', url);
}
