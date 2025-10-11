#!/usr/bin/env node

const http = require('http');
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

// Función para probar conexión al backend
function testBackend(ip, port = 3000) {
  return new Promise((resolve, reject) => {
    console.log(`🔍 Probando conexión a ${ip}:${port}...`);
    
    const options = {
      hostname: ip,
      port: port,
      path: '/api/auth/verificar-token',
      method: 'GET',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`✅ Backend responde correctamente`);
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Headers: ${JSON.stringify(res.headers, null, 2)}`);
        resolve(true);
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Error de conexión: ${err.message}`);
      console.log(`   Código: ${err.code}`);
      reject(err);
    });

    req.on('timeout', () => {
      console.log(`⏰ Timeout - El backend no responde`);
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.setTimeout(10000);
    req.end();
  });
}

// Función para probar el frontend
function testFrontend(ip, port = 4200) {
  return new Promise((resolve, reject) => {
    console.log(`🔍 Probando conexión a ${ip}:${port}...`);
    
    const options = {
      hostname: ip,
      port: port,
      path: '/',
      method: 'GET',
      timeout: 10000
    };

    const req = http.request(options, (res) => {
      console.log(`✅ Frontend accesible`);
      console.log(`   Status: ${res.statusCode}`);
      resolve(true);
    });

    req.on('error', (err) => {
      console.log(`❌ Frontend no accesible: ${err.message}`);
      reject(err);
    });

    req.on('timeout', () => {
      console.log(`⏰ Frontend timeout`);
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.setTimeout(10000);
    req.end();
  });
}

// Función principal
async function testConnections() {
  const ip = getLocalIP();
  
  console.log('🧪 PRUEBA DE CONECTIVIDAD MÓVIL');
  console.log('==============================');
  console.log(`📱 IP local: ${ip}`);
  console.log('');
  
  try {
    // Probar backend
    await testBackend(ip);
    console.log('');
    
    // Probar frontend
    await testFrontend(ip);
    console.log('');
    
    console.log('🎉 ¡TODAS LAS CONEXIONES FUNCIONAN!');
    console.log('');
    console.log('📱 Para acceder desde el móvil:');
    console.log(`   Frontend: http://${ip}:4200`);
    console.log(`   Backend: http://${ip}:3000/api`);
    console.log('');
    console.log('✅ El problema "failed to fetch" debería estar resuelto');
    
  } catch (error) {
    console.log('');
    console.log('🚨 PROBLEMAS DETECTADOS:');
    console.log('');
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('❌ Backend no está corriendo');
      console.log('💡 Solución: cd Backend-Hoteleria && npm start');
    } else if (error.message.includes('Timeout')) {
      console.log('❌ Timeout de conexión');
      console.log('💡 Solución: Verificar firewall de Windows');
    } else {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('');
    console.log('🔧 PASOS PARA SOLUCIONAR:');
    console.log('1. Verificar que el backend esté corriendo');
    console.log('2. Verificar firewall de Windows');
    console.log('3. Verificar que ambos dispositivos estén en la misma red');
    console.log('4. Reiniciar ambos servidores');
  }
}

// Ejecutar pruebas
testConnections();
