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
      healthCheck.status = 'DEGRADED';
      healthCheck.warning = 'High memory usage - potential memory leak';
    }
    
    // Crítico: si llega al 90%, responder con error para que Render reinicie
    if (heapPercentage >= 90) {
      console.error(`🔴 CRITICAL: Memory usage at ${heapPercentage}%! Returning 503 to trigger restart.`);
      return res.status(503).json({
        status: 'CRITICAL',
        timestamp: new Date().toISOString(),
        error: 'Memory usage critical - initiating restart',
        memory: healthCheck.services.memory
      });
    }

    // Determinar código de estado HTTP
    const statusCode = healthCheck.status === 'OK' ? 200 : 503;
    
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





