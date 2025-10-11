export const environment = {
  production: false,
  // Para desarrollo móvil - usar IP local en lugar de localhost
  apiUrl: 'http://192.168.100.22:3000/api', // IP detectada automáticamente
  appName: 'Sistema de Hostal - Desarrollo Móvil',
  version: '1.0.0',
  // Configuración específica para móvil
  enableLogging: true,
  enableDebug: true,
  // Configuración de timeout más largo para móvil
  requestTimeout: 30000,
  // Configuración de retry para conexiones móviles
  maxRetries: 3
};