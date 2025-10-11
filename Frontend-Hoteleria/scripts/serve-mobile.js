#!/usr/bin/env node

const { exec } = require('child_process');
const os = require('os');

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

// Función para iniciar el servidor Angular
function startAngularServer() {
  const ip = getLocalIP();
  const port = 4200;
  
  console.log('🚀 Iniciando servidor Angular para desarrollo móvil...');
  console.log(`📱 IP local detectada: ${ip}`);
  console.log(`🌐 URL para móvil: http://${ip}:${port}`);
  console.log('📋 Instrucciones:');
  console.log('   1. Conecta tu celular a la misma red WiFi');
  console.log('   2. Abre el navegador en tu celular');
  console.log(`   3. Ve a: http://${ip}:${port}`);
  console.log('   4. ¡Listo para probar!');
  console.log('');
  
  // Iniciar Angular con configuración móvil
  const command = `ng serve --host 0.0.0.0 --port ${port} --disable-host-check`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error al iniciar el servidor:', error);
      return;
    }
    if (stderr) {
      console.error('⚠️ Advertencias:', stderr);
    }
    console.log('✅ Servidor iniciado correctamente');
    console.log(stdout);
  });
}

// Ejecutar
startAngularServer();
