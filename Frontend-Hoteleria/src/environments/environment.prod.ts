export const environment = {
  production: true,
  // URL del backend - se configura desde variables de entorno en Vercel
  apiUrl: 'https://sistema-de-hoteleria-tilcara.onrender.com/api',
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