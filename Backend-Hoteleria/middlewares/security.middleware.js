const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const securityConfig = require('../config/security.config');

// Middleware de seguridad centralizado
const securityMiddleware = {
    // Configurar Helmet para headers de seguridad
    helmet: helmet(securityConfig.helmet),

    // Configurar compresión
    compression: compression(),

    // Rate limiting general
    generalLimiter: rateLimit(securityConfig.rateLimit.general),

    // Rate limiting para autenticación
    authLimiter: rateLimit(securityConfig.rateLimit.auth),

    // Rate limiting para reservas
    reservasLimiter: rateLimit(securityConfig.rateLimit.reservas),

    // Middleware para sanitizar datos de entrada
    sanitizeInput: (req, res, next) => {
        // Sanitizar strings
        const sanitizeString = (str) => {
            if (typeof str !== 'string') return str;
            return str
                .trim()
                .replace(/[<>]/g, '') // Remover caracteres peligrosos
                .replace(/javascript:/gi, '') // Remover javascript: URLs
                .replace(/on\w+=/gi, ''); // Remover event handlers
        };

        // Sanitizar objeto recursivamente
        const sanitizeObject = (obj) => {
            if (typeof obj !== 'object' || obj === null) return obj;
            
            if (Array.isArray(obj)) {
                return obj.map(sanitizeObject);
            }
            
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)) {
                sanitized[key] = typeof value === 'string' ? sanitizeString(value) : sanitizeObject(value);
            }
            return sanitized;
        };

        // Aplicar sanitización a body, query y params
        if (req.body) req.body = sanitizeObject(req.body);
        if (req.query) req.query = sanitizeObject(req.query);
        if (req.params) req.params = sanitizeObject(req.params);

        next();
    },

    // Middleware para validar tipos de contenido
    validateContentType: (req, res, next) => {
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            const contentType = req.headers['content-type'];
            if (!contentType || !contentType.includes('application/json')) {
                return res.status(400).json({
                    success: false,
                    message: 'Content-Type debe ser application/json'
                });
            }
        }
        next();
    },

    // Middleware para limitar tamaño de payload
    limitPayload: (req, res, next) => {
        const contentLength = parseInt(req.headers['content-length'], 10);
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (contentLength > maxSize) {
            return res.status(413).json({
                success: false,
                message: 'Payload demasiado grande. Máximo 10MB permitido.'
            });
        }
        next();
    },

    // Middleware para logging de seguridad
    securityLogger: (req, res, next) => {
        const timestamp = new Date().toISOString();
        const ip = req.ip || req.connection.remoteAddress;
        const method = req.method;
        const url = req.url;
        const userAgent = req.headers['user-agent'];

        // Log de solicitudes sospechosas
        const suspiciousPatterns = [
            /\.\.\//, // Directory traversal
            /<script/i, // XSS attempts
            /javascript:/i, // JavaScript injection
            /union\s+select/i, // SQL injection
            /exec\s*\(/i, // Command injection
        ];

        const isSuspicious = suspiciousPatterns.some(pattern => 
            pattern.test(url) || pattern.test(JSON.stringify(req.body))
        );

        if (isSuspicious) {
            console.warn(`🚨 Solicitud sospechosa detectada:`, {
                timestamp,
                ip,
                method,
                url,
                userAgent,
                body: req.body
            });
        }

        // Solo log de solicitudes en desarrollo
        if (process.env.NODE_ENV === 'development') {
            console.log(`📝 ${timestamp} - ${method} ${url} - IP: ${ip}`);
        }

        next();
    },

    // Middleware para headers de seguridad adicionales
    additionalHeaders: (req, res, next) => {
        // Prevenir clickjacking
        res.setHeader('X-Frame-Options', 'DENY');
        
        // Prevenir MIME type sniffing
        res.setHeader('X-Content-Type-Options', 'nosniff');
        
        // Referrer policy
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        
        // Permissions policy
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
        
        next();
    },

    // Middleware para manejo de errores de seguridad
    securityErrorHandler: (err, req, res, next) => {
        // Errores de rate limiting
        if (err.status === 429) {
            return res.status(429).json({
                success: false,
                message: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
                retryAfter: err.headers?.['retry-after'] || 900
            });
        }

        // Errores de validación de seguridad
        if (err.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Datos de entrada inválidos',
                errors: Object.values(err.errors).map(e => e.message)
            });
        }

        // Errores de JWT
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token de autenticación inválido'
            });
        }

        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token de autenticación expirado'
            });
        }

        // Error por defecto (no exponer detalles en producción)
        const isProduction = process.env.NODE_ENV === 'production';
        const errorMessage = isProduction ? 'Error interno del servidor' : err.message;
        const errorDetails = isProduction ? {} : { stack: err.stack };

        res.status(err.status || 500).json({
            success: false,
            message: errorMessage,
            ...errorDetails
        });
    }
};

module.exports = securityMiddleware;

