#!/usr/bin/env node

const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Función para obtener la IP local
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Función para actualizar el environment.mobile.ts
function updateMobileEnvironment(ip) {
  const envPath = path.join(__dirname, '..', 'src', 'environments', 'environment.mobile.ts');
  
  const content = `export const environment = {
  production: false,
  // Para desarrollo móvil - usar IP local en lugar de localhost
  apiUrl: 'http://${ip}:3000/api', // IP detectada automáticamente
  appName: 'Sistema de Hostal - Desarrollo Móvil',
  version: '1.0.0',
  // Configuración específica para móvil
  enableLogging: true,
  enableDebug: true,
  // Configuración de timeout más largo para móvil
  requestTimeout: 30000,
  // Configuración de retry para conexiones móviles
  maxRetries: 3
};`;

  fs.writeFileSync(envPath, content);
  console.log(`✅ Environment móvil actualizado con IP: ${ip}`);
}

// Función principal
function setupMobile() {
  const ip = getLocalIP();
  
  console.log('🚀 Configurando desarrollo móvil...');
  console.log(`📱 IP local detectada: ${ip}`);
  
  // Actualizar environment
  updateMobileEnvironment(ip);
  
  console.log('');
  console.log('📋 Instrucciones:');
  console.log('   1. Inicia el backend:');
  console.log('      cd Backend-Hoteleria && npm start');
  console.log('');
  console.log('   2. Inicia el frontend móvil:');
  console.log('      npm run start:mobile');
  console.log('');
  console.log('   3. Para ngrok:');
  console.log('      npm run start:ngrok');
  console.log('      # En otra terminal: ngrok http 4200');
  console.log('');
  console.log(`   4. Accede desde tu móvil: http://${ip}:4200`);
  console.log('');
  console.log('🎯 ¡Listo para desarrollo móvil!');
}

// Ejecutar
setupMobile();
