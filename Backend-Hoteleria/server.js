const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const dotenv = require('dotenv');
const path = require('path');
const securityMiddleware = require('./middlewares/security.middleware');

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Configurar zona horaria para Argentina (UTC-3)
process.env.TZ = 'America/Argentina/Buenos_Aires';

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar trust proxy para Render
app.set('trust proxy', 1);

// Aplicar middleware de seguridad
// ⚠️ REDUCCIÓN DE MEMORIA: Deshabilitar algunos middlewares en producción
if (process.env.NODE_ENV !== 'production') {
    app.use(securityMiddleware.helmet); // Helmet agrega headers en CADA request
}
app.use(securityMiddleware.sanitizeInput); // Siempre sanitizar
app.use(securityMiddleware.validateContentType); // Siempre validar
app.use(securityMiddleware.limitPayload); // Siempre limitar
// ⚠️ CRITICAL: Deshabilitar security logger en producción (corre en CADA request)
if (process.env.NODE_ENV === 'development') {
    app.use(securityMiddleware.securityLogger);
}
app.use(securityMiddleware.additionalHeaders);
// ⚠️ CRITICAL: Usar compression solo para responses grandes (>1KB)
app.use(compression({ threshold: 1024 }));

// ⚠️ Aplicar rate limiting general (solo en producción para ahorrar memoria)
if (process.env.NODE_ENV === 'production') {
    app.use('/api/', securityMiddleware.generalLimiter);
}

// Middleware
const allowedOrigins = [
    'http://localhost:4200',
    'https://sistema-de-hoteleria-tilcara.vercel.app',
    'https://sistema-de-hoteleria-tilcara-3gxiv0prb-enj23s-projects.vercel.app',
    'https://sistema-de-hoteleria-tilcara-ph88hmdim-enj23s-projects.vercel.app'
];

// ⚠️ REDUCCIÓN DE MEMORIA: CORS estático en producción
const corsOptions = process.env.NODE_ENV === 'production' 
    ? {
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token'],
        credentials: true,
        maxAge: 86400 // Cache preflight requests for 24 hours
    }
    : {
        origin: function (origin, callback) {
            // Permitir requests sin origin (como mobile apps o curl)
            if (!origin) return callback(null, true);
            
            // Permitir localhost en desarrollo
            if (origin.includes('localhost')) {
                return callback(null, true);
            }
            
            // Permitir ngrok en desarrollo
            if (origin.includes('ngrok.io') || origin.includes('ngrok-free.app')) {
                console.log(`🌐 Permitido origen ngrok: ${origin}`);
                return callback(null, true);
            }
            
            // Permitir IPs locales (para desarrollo móvil)
            if (origin.match(/^http:\/\/192\.168\.\d+\.\d+:\d+$/) || 
                origin.match(/^http:\/\/10\.\d+\.\d+\.\d+:\d+$/) ||
                origin.match(/^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:\d+$/)) {
                console.log(`📱 Permitido origen móvil: ${origin}`);
                return callback(null, true);
            }
            
            // Permitir todos los subdominios de vercel.app
            if (origin.includes('.vercel.app')) {
                return callback(null, true);
            }
            
            // Verificar si está en la lista de orígenes permitidos
            if (allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                console.warn(`🚨 Origen no permitido por CORS: ${origin}`);
                callback(new Error('No permitido por CORS'));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token'],
        credentials: true,
        preflightContinue: false,
        optionsSuccessStatus: 200
    };

app.use(cors(corsOptions));

// ⚠️ REDUCCIÓN DE MEMORIA: Limitar payload JSON a 1MB (antes 10MB)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Configuración de cabeceras adicionales (solo si es necesario)
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Solo agregar cabeceras si no están ya establecidas por CORS
    if (!res.getHeader('Access-Control-Allow-Origin')) {
        // Permitir localhost en desarrollo
        if (origin && origin.includes('localhost')) {
            res.header('Access-Control-Allow-Origin', origin);
        }
        // Permitir todos los subdominios de vercel.app
        else if (origin && origin.includes('.vercel.app')) {
            res.header('Access-Control-Allow-Origin', origin);
        }
        // Verificar si está en la lista de orígenes permitidos
        else if (origin && allowedOrigins.includes(origin)) {
            res.header('Access-Control-Allow-Origin', origin);
        }
    }
    
    if (!res.getHeader('Access-Control-Allow-Methods')) {
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    }
    if (!res.getHeader('Access-Control-Allow-Headers')) {
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-access-token, Authorization');
    }
    if (!res.getHeader('Access-Control-Allow-Credentials')) {
        res.header('Access-Control-Allow-Credentials', 'true');
    }
    
    next();
});

// ======== MONITOREO DE MEMORIA Y RECURSOS ========
// Forzar garbage collection cada 10 minutos
if (global.gc) {
    setInterval(() => {
        console.log('🧹 Ejecutando garbage collection...');
        global.gc();
        const used = process.memoryUsage();
        const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
        const heapPercentage = Math.round((used.heapUsed / used.heapTotal) * 100);
        console.log(`📊 Después de GC - Used: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapPercentage}%)`);
    }, 10 * 60 * 1000);
}

// Logger periódico de memoria (cada 5 minutos) - SOLO EN DESARROLLO
if (process.env.NODE_ENV !== 'production') {
    setInterval(() => {
        const used = process.memoryUsage();
        const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
        const heapPercentage = Math.round((used.heapUsed / used.heapTotal) * 100);
        
        console.log(`📊 Memory Monitor - Used: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapPercentage}%) | Uptime: ${Math.round(process.uptime() / 60)}m`);
        
        // Alerta si el uso de memoria es crítico (>80% para permitir GC)
        if (heapPercentage > 80) {
            console.warn(`⚠️ MEMORY WARNING: Heap usage at ${heapPercentage}%! Potential memory leak detected.`);
        }
    }, 5 * 60 * 1000); // Cada 5 minutos

    // Logger de conexiones activas cada 10 minutos
    setInterval(() => {
        console.log(`🔌 Active Connections - DB State: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    }, 10 * 60 * 1000);
}

// ======== CONEXIÓN A MONGODB ========
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hoteleria';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 1, // ⚠️ AGGRESSIVE: Minimal connection pooling to save memory
    minPoolSize: 0, // ⚠️ AGGRESSIVE: Allow closing idle connections
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxIdleTimeMS: 5000 // ⚠️ AGGRESSIVE: Close idle connections faster (was 30000)
})
.then(() => console.log('✅ Conectado a MongoDB'))
.catch(err => console.error('❌ Error conectando a MongoDB:', err));

// Manejo de desconexión de MongoDB
mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB reconnected');
});

// Rutas de API
const apiRouter = express.Router();

// Importar rutas
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const reservasRoutes = require('./routes/reservas');
const habitacionesRoutes = require('./routes/habitaciones');
const clientesRoutes = require('./routes/clientes');
const tareasRoutes = require('./routes/tareas');

// Configurar rutas con rate limiting específico
apiRouter.use('/health', healthRoutes); // Sin rate limiting para health checks
apiRouter.use('/auth', securityMiddleware.authLimiter, authRoutes);
apiRouter.use('/reservas', securityMiddleware.reservasLimiter, reservasRoutes);
apiRouter.use('/habitaciones', habitacionesRoutes);
apiRouter.use('/clientes', clientesRoutes);
apiRouter.use('/tareas', tareasRoutes);

// Ruta de prueba de la API
apiRouter.get('/', (req, res) => {
    res.json({ 
        message: 'API del Sistema de Hotelería funcionando correctamente',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Prefijo /api para todas las rutas de la API
app.use('/api', apiRouter);

// Ruta raíz
app.get('/', (req, res) => {
    res.json({ 
        message: 'Bienvenido al Sistema de Gestión Hotelera',
        api: '/api',
        docs: '/api-docs' // Futura documentación de la API
    });
});

// Manejo de errores 404
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada',
        path: req.originalUrl
    });
});

// Manejador de errores global con middleware de seguridad
app.use(securityMiddleware.securityErrorHandler);

// Iniciar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`🌐 Accesible desde red local en: http://[TU_IP]:${PORT}`);
    console.log(`📡 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 MongoDB: ${MONGODB_URI}`);
    console.log(`🔒 Seguridad: Habilitada`);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
    console.log('👋 SIGTERM recibido. Cerrando servidor...');
    server.close(() => {
        console.log('Servidor cerrado');
        process.exit(0);
    });
});

module.exports = server;