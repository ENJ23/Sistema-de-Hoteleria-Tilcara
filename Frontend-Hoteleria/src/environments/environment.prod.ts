export const environment = {
  production: true,
  // Para Vercel, usar la URL de la API desplegada
  apiUrl: 'https://tu-proyecto-backend.vercel.app/api',
  // O si usas API routes en el mismo proyecto:
  // apiUrl: '/api',
  appName: 'Sistema de Hostal',
  version: '1.0.0',
  // Configuración adicional para producción
  enableLogging: false,
  enableDebug: false,
  // Configuración de timeout para requests
  requestTimeout: 30000,
  // Configuración de retry para requests fallidos
  maxRetries: 3
};