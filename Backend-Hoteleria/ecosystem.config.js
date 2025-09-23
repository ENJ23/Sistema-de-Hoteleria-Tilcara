module.exports = {
  apps: [{
    name: 'hoteleria-backend',
    script: 'server.js',
    instances: 'max', // Usar todos los CPUs disponibles
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // Configuración de logs
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Configuración de reinicio automático
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    max_memory_restart: '1G',
    
    // Configuración de errores
    min_uptime: '10s',
    max_restarts: 10,
    
    // Configuración de cluster
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    
    // Variables de entorno específicas
    env_file: '.env'
  }]
};
