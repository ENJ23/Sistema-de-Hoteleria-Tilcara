const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const securityMiddleware = require('./middlewares/security.middleware');

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar trust proxy para Render
app.set('trust proxy', 1);

// Aplicar middleware de seguridad
app.use(securityMiddleware.helmet);
app.use(securityMiddleware.compression);
app.use(securityMiddleware.sanitizeInput);
app.use(securityMiddleware.validateContentType);
app.use(securityMiddleware.limitPayload);
app.use(securityMiddleware.securityLogger);
app.use(securityMiddleware.additionalHeaders);

// Aplicar rate limiting general
app.use('/api/', securityMiddleware.generalLimiter);

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuración de cabeceras adicionales (solo si es necesario)
app.use((req, res, next) => {
    // Solo agregar cabeceras si no están ya establecidas por CORS
    if (!res.getHeader('Access-Control-Allow-Origin')) {
        res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:4200');
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

// Conexión a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hoteleria';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ Conectado a MongoDB'))
.catch(err => console.error('❌ Error conectando a MongoDB:', err));

// Rutas de API
const apiRouter = express.Router();

// Importar rutas
const authRoutes = require('./routes/auth');
const reservasRoutes = require('./routes/reservas');
const habitacionesRoutes = require('./routes/habitaciones');
const clientesRoutes = require('./routes/clientes');

// Configurar rutas con rate limiting específico
apiRouter.use('/auth', securityMiddleware.authLimiter, authRoutes);
apiRouter.use('/reservas', securityMiddleware.reservasLimiter, reservasRoutes);
apiRouter.use('/habitaciones', habitacionesRoutes);
apiRouter.use('/clientes', clientesRoutes);

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
const server = app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
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