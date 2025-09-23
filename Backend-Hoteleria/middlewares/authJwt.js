const jwt = require('jsonwebtoken');
const { JWT_SECRET, ROLES } = require('../config/auth.config');
const Usuario = require('../models/Usuario');

// Middleware para verificar el token JWT
exports.verifyToken = (req, res, next) => {
    // Obtener el token del header 'x-access-token' o de los headers de autorización
    let token = req.headers['x-access-token'] || req.headers['authorization'];
    
    // Si no hay token, retornar error 403 (No autorizado)
    if (!token) {
        return res.status(403).json({
            message: 'No se proporcionó un token de autenticación'
        });
    }

    // Eliminar 'Bearer ' del token si está presente
    if (token.startsWith('Bearer ')) {
        token = token.slice(7, token.length);
    }

    // Verificar el token
    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(401).json({
                message: 'No autorizado - Token inválido o expirado',
                error: err
            });
        }

        try {
            // Obtener información completa del usuario
            const usuario = await Usuario.findById(decoded.id);
            if (!usuario) {
                return res.status(401).json({
                    message: 'Usuario no encontrado'
                });
            }

            // Guardar información completa del usuario en la solicitud
            req.userId = {
                id: usuario._id,
                email: usuario.email,
                rol: usuario.rol,
                nombre: usuario.nombre
            };
            next();
        } catch (error) {
            return res.status(500).json({
                message: 'Error al obtener información del usuario'
            });
        }
    });
};

// Middleware para verificar si el usuario es encargado
exports.isEncargado = async (req, res, next) => {
    try {
        console.log('🔐 Verificando rol de encargado...');
        console.log('👤 Usuario en req.userId:', req.userId);
        console.log('🎭 Rol esperado (ENCARGADO):', ROLES.ENCARGADO);
        
        if (req.userId && req.userId.rol === ROLES.ENCARGADO) {
            console.log('✅ Usuario tiene rol de encargado, permitiendo acceso');
            next();
            return;
        }

        console.log('❌ Usuario no tiene rol de encargado, denegando acceso');
        res.status(403).json({
            message: 'Se requieren privilegios de encargado para esta acción'
        });
    } catch (error) {
        console.error('❌ Error al verificar el rol de encargado:', error);
        res.status(500).json({ message: 'Error al verificar el rol de encargado' });
    }
};

// Middleware para verificar si el usuario es encargado o limpieza
exports.isEncargadoOLimpieza = async (req, res, next) => {
    try {
        if (req.userId && (req.userId.rol === ROLES.ENCARGADO || req.userId.rol === ROLES.LIMPIEZA)) {
            next();
            return;
        }

        res.status(403).json({
            message: 'Se requiere autenticación de encargado o limpieza para esta acción'
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al verificar los permisos del usuario' });
    }
};

// Middleware para verificar si el usuario es encargado o mantenimiento
exports.isEncargadoOMantenimiento = async (req, res, next) => {
    try {
        if (req.userId && (req.userId.rol === ROLES.ENCARGADO || req.userId.rol === ROLES.MANTENIMIENTO)) {
            next();
            return;
        }

        res.status(403).json({
            message: 'Se requiere autenticación de encargado o mantenimiento para esta acción'
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al verificar los permisos del usuario' });
    }
};

// Middleware para verificar si el usuario tiene cualquier rol válido
exports.isUsuarioValido = async (req, res, next) => {
    try {
        if (req.userId && Object.values(ROLES).includes(req.userId.rol)) {
            next();
            return;
        }

        res.status(403).json({
            message: 'Se requiere autenticación válida para esta acción'
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al verificar los permisos del usuario' });
    }
};
