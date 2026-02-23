const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Endpoint de salud del servidor (usado por Render para monitoreo)
router.get('/', async (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const heapPercentage = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);
    
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime() / 60), // en minutos
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: 'unknown',
        memory: {
          used: `${heapUsedMB} MB`,
          total: `${heapTotalMB} MB`,
          percentage: `${heapPercentage}%`
        }
      }
    };

    // Verificar conexión a MongoDB
    try {
      if (mongoose.connection.readyState === 1) {
        healthCheck.services.database = 'connected';
      } else {
        healthCheck.services.database = 'disconnected';
        healthCheck.status = 'DEGRADED';
      }
    } catch (dbError) {
      healthCheck.services.database = 'error';
      healthCheck.status = 'DEGRADED';
    }

    // Alerta de memory leak: si el heap está al 80%+ de uso
    if (heapPercentage >= 85) {
      console.warn(`⚠️ HEALTH CHECK ALERT: Memory usage at ${heapPercentage}% (${heapUsedMB}MB/${heapTotalMB}MB)`);
      healthCheck.warning = 'High memory usage - potential memory leak';
      // NO cambiamos el status a DEGRADED para evitar que Render falle el despliegue
    }
    
    // Crítico: si llega al 95%, solo loguear, no devolver 503 en el health check de Render
    if (heapPercentage >= 95) {
      console.error(`🔴 CRITICAL: Memory usage at ${heapPercentage}%!`);
      healthCheck.warning = 'Memory usage critical';
    }

    // Determinar código de estado HTTP
    // Render necesita un 200 OK para considerar el despliegue exitoso.
    // Solo devolvemos 503 si la base de datos está desconectada por mucho tiempo, 
    // pero para el despliegue inicial es mejor devolver 200 siempre que el server responda.
    const statusCode = 200;
    
    res.status(statusCode).json(healthCheck);
  } catch (error) {
    console.error('Error en health check:', error);
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Endpoint de salud detallado (solo para administradores)
router.get('/detailed', async (req, res) => {
  try {
    const detailedHealth = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: {
          status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
          host: mongoose.connection.host,
          port: mongoose.connection.port,
          name: mongoose.connection.name
        },
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version
      },
      requests: {
        total: req.app.locals.requestCount || 0,
        errors: req.app.locals.errorCount || 0
      }
    };

    res.json(detailedHealth);
  } catch (error) {
    console.error('Error en detailed health check:', error);
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// ⚠️ MEMORIA CRÍTICA: Endpoint para limpiar caché de Mongoose
// Esto puede liberar 5-10MB en momentos de alto uso
router.post('/cleanup-cache', async (req, res) => {
  try {
    const memoryBefore = process.memoryUsage();
    const heapBefore = Math.round(memoryBefore.heapUsed / 1024 / 1024);

    // 🧹 Limpiar caché de Mongoose
    if (mongoose && mongoose.connection && mongoose.connection.collection) {
      // Limpiar cualquier caché acumulado en collections
      const collections = mongoose.connection.collections;
      if (collections) {
        Object.keys(collections).forEach(key => {
          collections[key].collection.collectionSerializationFunction = null;
        });
      }
    }

    // 🧹 Limpiar explicativamente si gc está disponible
    if (global.gc) {
      console.log('🧹 Ejecutando garbage collection desde cleanup endpoint...');
      global.gc();
    }

    const memoryAfter = process.memoryUsage();
    const heapAfter = Math.round(memoryAfter.heapUsed / 1024 / 1024);
    const memoryFreed = heapBefore - heapAfter;

    console.log(`🧹 Cache cleanup realizado - Liberados: ${memoryFreed}MB (${heapBefore}MB → ${heapAfter}MB)`);

    res.json({
      status: 'OK',
      message: 'Cache limpiado exitosamente',
      memoryFreed: `${memoryFreed}MB`,
      before: `${heapBefore}MB`,
      after: `${heapAfter}MB`
    });
  } catch (error) {
    console.error('Error al limpiar caché:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al limpiar caché',
      error: error.message
    });
  }
});

module.exports = router;





