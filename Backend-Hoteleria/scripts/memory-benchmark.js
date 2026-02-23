#!/usr/bin/env node

/**
 * Script para medir impacto de optimizaciones de memoria
 * Uso: node memory-benchmark.js
 */

const http = require('http');

// Colores para terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function getHealthCheck(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function triggerCleanup(url) {
  return new Promise((resolve, reject) => {
    const options = new URL(url);
    options.method = 'POST';
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
    
    req.end();
  });
}

async function main() {
  const baseUrl = process.argv[2] || 'http://localhost:3000';
  const healthUrl = `${baseUrl}/api/health`;
  const cleanupUrl = `${baseUrl}/api/health/cleanup-cache`;

  log(colors.cyan, '═══════════════════════════════════════════════════════');
  log(colors.cyan, '       MEMORY OPTIMIZATION IMPACT BENCHMARK');
  log(colors.cyan, '═══════════════════════════════════════════════════════\n');

  console.log(`Testing URL: ${baseUrl}\n`);

  try {
    // Lectura inicial
    log(colors.blue, '📊 [1/4] Obteniendo estado inicial de memoria...');
    const health1 = await getHealthCheck(healthUrl);
    const initialMemory = health1.services.memory;
    log(colors.green, `  ✓ Memoria inicial: ${initialMemory.used}`);

    // Esperar 30 segundos
    log(colors.blue, '\n⏳ [2/4] Esperando 30 segundos (acumulación de basura)...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Lectura después de acumulación
    const health2 = await getHealthCheck(healthUrl);
    const beforeCleanup = health2.services.memory;
    log(colors.yellow, `  ⚠️  Memoria después de acumulación: ${beforeCleanup.used}`);

    // Ejecutar limpieza
    log(colors.blue, '\n🧹 [3/4] Ejecutando limpieza de caché...');
    const cleanup = await triggerCleanup(cleanupUrl);
    if (cleanup.status === 'OK') {
      log(colors.green, `  ✓ Limpieza completada`);
      log(colors.green, `  ✓ Memoria liberada: ${cleanup.memoryFreed}`);
      log(colors.green, `  ✓ ${cleanup.before} → ${cleanup.after}`);
    }

    // Lectura final
    log(colors.blue, '\n📊 [4/4] Obteniendo estado final de memoria...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    const health3 = await getHealthCheck(healthUrl);
    const finalMemory = health3.services.memory;
    log(colors.green, `  ✓ Memoria final: ${finalMemory.used}`);

    // Análisis
    log(colors.cyan, '\n═══════════════════════════════════════════════════════');
    log(colors.cyan, '                      RESULTADOS');
    log(colors.cyan, '═══════════════════════════════════════════════════════\n');

    console.log(`  Inicial:        ${initialMemory.used} (${initialMemory.percentage})`);
    console.log(`  Acumulado:      ${beforeCleanup.used} (${beforeCleanup.percentage})`);
    console.log(`  Después cleanup: ${finalMemory.used} (${finalMemory.percentage})\n`);

    // Parsing de números
    const initialMB = parseInt(initialMemory.used);
    const beforeMB = parseInt(beforeCleanup.used);
    const finalMB = parseInt(finalMemory.used);

    const accumulated = beforeMB - initialMB;
    const freed = beforeMB - finalMB;
    const improvement = ((accumulated - freed) / accumulated * 100).toFixed(1);

    log(colors.green, `  📈 Basura acumulada:  +${accumulated}MB`);
    log(colors.green, `  🧹 Basura limpiada:   -${freed}MB`);
    log(colors.green, `  ✅ Mejora efectiva:   ${improvement}%\n`);

    if (finalMB > 30) {
      log(colors.red, `  ⚠️  ADVERTENCIA: Uso de memoria aún CRÍTICO (${finalMB}MB/35MB)`);
      log(colors.red, `      Considera cambiar a instance con más RAM.`);
    } else if (finalMB > 20) {
      log(colors.yellow, `  ⚠️  ALERTA: Uso de memoria ELEVADO (${finalMB}MB/35MB)`);
      log(colors.yellow, `      Monitor de cerca, próximo paso: upgrade de RAM.`);
    } else {
      log(colors.green, `  ✅ EXCELENTE: Uso de memoria BAJO (${finalMB}MB/35MB)`);
      log(colors.green, `      Sistema estable para producción.`);
    }

  } catch (error) {
    log(colors.red, `\n❌ Error: ${error.message}`);
    log(colors.yellow, '\nAsegúrate de que el servidor esté activo en:');
    console.log(`  ${baseUrl}`);
    process.exit(1);
  }
}

main();
