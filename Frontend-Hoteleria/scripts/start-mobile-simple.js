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
  console.log('');
  console.log('📋 Instrucciones:');
  console.log('   1. Asegúrate de que el backend esté corriendo en el puerto 3000');
  console.log('   2. Conecta tu celular a la misma red WiFi');
  console.log('   3. Abre el navegador en tu celular');
  console.log(`   4. Ve a: http://${ip}:${port}`);
  console.log('');
  console.log('🔧 Si tienes problemas:');
  console.log('   - Verifica que el firewall permita conexiones en el puerto 4200');
  console.log('   - Asegúrate de que ambos dispositivos estén en la misma red');
  console.log('   - Prueba primero desde la computadora: http://localhost:4200');
  console.log('');
  
  // Comando simplificado sin configuraciones complejas
  const command = `ng serve --host 0.0.0.0 --port ${port} --disable-host-check`;
  
  console.log(`⚡ Ejecutando: ${command}`);
  console.log('');
  
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
