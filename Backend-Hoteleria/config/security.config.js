// Configuración de seguridad centralizada
module.exports = {
    // Configuración de rate limiting
    rateLimit: {
        // Rate limiting general
        general: {
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 50000, // máximo 50000 requests por ventana (aumentado para desarrollo)
            message: {
                success: false,
                message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo en 15 minutos'
            },
            standardHeaders: true,
            legacyHeaders: false,
        },
        // Rate limiting para autenticación (más restrictivo)
        auth: {
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: process.env.NODE_ENV === 'production' ? 5 : 50, // 5 en producción, 50 en desarrollo
            message: {
                success: false,
                message: 'Demasiados intentos de inicio de sesión, intenta de nuevo en 15 minutos'
            },
            standardHeaders: true,
            legacyHeaders: false,
            skipSuccessfulRequests: true, // No contar requests exitosos
        },
        // Rate limiting para creación de reservas
        reservas: {
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 2000, // máximo 2000 reservas por ventana (aumentado)
            message: {
                success: false,
                message: 'Demasiadas reservas desde esta IP, intenta de nuevo en 15 minutos'
            },
            standardHeaders: true,
            legacyHeaders: false,
        }
    },

    // Configuración de Helmet
    helmet: {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
            },
        },
        crossOriginEmbedderPolicy: false
    },

    // Configuración de CORS
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:4200',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token'],
        credentials: true
    },

    // Límites de tamaño de archivos
    limits: {
        json: '10mb',
        urlencoded: '10mb'
    },

    // Configuración de validación
    validation: {
        // Longitudes máximas
        maxLengths: {
            nombre: 50,
            apellido: 50,
            email: 100,
            telefono: 20,
            documento: 20,
            observaciones: 500,
            password: 128
        },
        // Longitudes mínimas
        minLengths: {
            nombre: 2,
            apellido: 2,
            telefono: 7,
            documento: 5,
            password: 8
        },
        // Patrones de validación
        patterns: {
            nombre: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
            telefono: /^[\d\s\-\+\(\)]+$/,
            hora: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
            password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
        }
    },

    // Configuración de JWT
    jwt: {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    },

    // Configuración de sesiones
    session: {
        secret: process.env.SESSION_SECRET || 'your-secret-key',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 24 horas
        }
    }
};
