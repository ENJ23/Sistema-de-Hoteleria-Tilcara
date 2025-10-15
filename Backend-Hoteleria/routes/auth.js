const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/authJwt');
const { ROLES } = require('../config/auth.config');
const securityMiddleware = require('../middlewares/security.middleware');

// Validaciones mejoradas para registro
const validarRegistro = [
    check('nombre', 'El nombre es obligatorio')
        .not().isEmpty()
        .trim()
        .escape()
        .isLength({ min: 2, max: 50 })
        .withMessage('El nombre debe tener entre 2 y 50 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('El nombre solo puede contener letras y espacios'),
    
    check('email', 'Por favor ingresa un correo válido')
        .isEmail()
        .normalizeEmail()
        .isLength({ max: 100 })
        .withMessage('El email no puede exceder 100 caracteres'),
    
    check('password', 'La contraseña debe tener al menos 8 caracteres')
        .isLength({ min: 8, max: 128 })
        .withMessage('La contraseña debe tener entre 8 y 128 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('La contraseña debe contener al menos una minúscula, una mayúscula, un número y un carácter especial'),
    
    check('rol', 'Rol no válido')
        .optional()
        .isIn(Object.values(ROLES))
        .withMessage(`Los roles válidos son: ${Object.values(ROLES).join(', ')}`)
];

// Validaciones mejoradas para login
const validarLogin = [
    check('email', 'Por favor ingresa un correo válido')
        .isEmail()
        .normalizeEmail()
        .isLength({ max: 100 })
        .withMessage('El email no puede exceder 100 caracteres'),
    
    check('password', 'La contraseña es obligatoria')
        .exists()
        .notEmpty()
        .withMessage('La contraseña no puede estar vacía')
        .isLength({ min: 1, max: 128 })
        .withMessage('La contraseña no puede exceder 128 caracteres')
];

// Middleware para manejar errores de validación
const manejarErroresValidacion = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Error de validación',
            errors: errors.array().map(error => ({
                field: error.path,
                message: error.msg,
                value: error.value
            }))
        });
    }
    next();
};

// Ruta de registro (solo administradores)
router.post(
    '/registro',
    [
        verifyToken,
        ...validarRegistro,
        manejarErroresValidacion
    ],
    authController.registro
);

// Ruta de login con rate limiting
router.post(
    '/login',
    [
        (req, res, next) => {
            // Verificar que el middleware esté disponible
            if (securityMiddleware && securityMiddleware.authLimiter) {
                return securityMiddleware.authLimiter(req, res, next);
            } else {
                console.warn('⚠️ Rate limiting no disponible, continuando sin protección');
                return next();
            }
        },
        ...validarLogin,
        manejarErroresValidacion
    ],
    authController.login
);

// Obtener perfil del usuario actual
router.get('/perfil', verifyToken, authController.obtenerPerfil);

// Verificar token (para rutas protegidas)
router.get('/verificar-token', verifyToken, authController.verificarToken);

// Ruta para refresh token con rate limiting
router.post('/refresh', 
    (req, res, next) => {
        // Verificar que el middleware esté disponible
        if (securityMiddleware && securityMiddleware.authLimiter) {
            return securityMiddleware.authLimiter(req, res, next);
        } else {
            console.warn('⚠️ Rate limiting no disponible, continuando sin protección');
            return next();
        }
    }, 
    authController.refreshToken
);

module.exports = router;
