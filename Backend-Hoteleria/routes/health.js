const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Endpoint de salud del servidor
router.get('/', async (req, res) => {
  try {
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: 'unknown',
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
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

module.exports = router;





