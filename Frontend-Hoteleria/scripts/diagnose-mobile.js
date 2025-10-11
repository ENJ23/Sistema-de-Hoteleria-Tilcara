#!/usr/bin/env node

const { exec } = require('child_process');
const os = require('os');
const http = require('http');

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

// Función para probar conectividad al backend
function testBackendConnection(ip, port = 3000) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: ip,
      port: port,
      path: '/api/auth/verificar-token',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      console.log(`✅ Backend accesible en ${ip}:${port} (Status: ${res.statusCode})`);
      resolve(true);
    });

    req.on('error', (err) => {
      console.log(`❌ Backend NO accesible en ${ip}:${port}`);
      console.log(`   Error: ${err.message}`);
      reject(err);
    });

    req.on('timeout', () => {
      console.log(`⏰ Timeout al conectar con ${ip}:${port}`);
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.setTimeout(5000);
    req.end();
  });
}

// Función para verificar puertos abiertos
function checkOpenPorts(ip) {
  const ports = [3000, 4200];
  
  console.log('🔍 Verificando puertos abiertos...');
  
  ports.forEach(port => {
    const options = {
      hostname: ip,
      port: port,
      timeout: 2000
    };

    const req = http.request(options, (res) => {
      console.log(`✅ Puerto ${port} abierto`);
    });

    req.on('error', (err) => {
      console.log(`❌ Puerto ${port} cerrado o bloqueado`);
    });

    req.on('timeout', () => {
      console.log(`⏰ Puerto ${port} - timeout`);
    });

    req.setTimeout(2000);
    req.end();
  });
}

// Función principal de diagnóstico
async function diagnoseMobile() {
  const ip = getLocalIP();
  
  console.log('🔍 DIAGNÓSTICO DE DESARROLLO MÓVIL');
  console.log('================================');
  console.log(`📱 IP local detectada: ${ip}`);
  console.log('');
  
  // Verificar puertos
  checkOpenPorts(ip);
  
  console.log('');
  console.log('🔧 SOLUCIONES POSIBLES:');
  console.log('');
  console.log('1. Verificar que el backend esté corriendo:');
  console.log('   cd Backend-Hoteleria && npm start');
  console.log('');
  console.log('2. Verificar firewall de Windows:');
  console.log('   - Abrir "Windows Defender Firewall"');
  console.log('   - Permitir aplicación a través del firewall');
  console.log('   - Agregar Node.js y puerto 3000');
  console.log('');
  console.log('3. Verificar que ambos dispositivos estén en la misma red:');
  console.log(`   - Computadora: ${ip}`);
  console.log('   - Móvil: Misma red WiFi');
  console.log('');
  console.log('4. Probar conectividad desde la computadora:');
  console.log(`   - Abrir: http://${ip}:3000/api/auth/verificar-token`);
  console.log(`   - Abrir: http://${ip}:4200`);
  console.log('');
  console.log('5. Verificar configuración del móvil:');
  console.log(`   - URL correcta: http://${ip}:4200`);
  console.log('   - Mismo navegador que funciona en desktop');
  console.log('');
  
  // Probar backend
  try {
    await testBackendConnection(ip);
  } catch (error) {
    console.log('');
    console.log('🚨 PROBLEMA DETECTADO:');
    console.log('   El backend no es accesible desde la red local');
    console.log('');
    console.log('💡 SOLUCIONES:');
    console.log('   1. Reiniciar el backend');
    console.log('   2. Verificar firewall');
    console.log('   3. Verificar que esté en 0.0.0.0:3000');
  }
}

// Ejecutar diagnóstico
diagnoseMobile();
