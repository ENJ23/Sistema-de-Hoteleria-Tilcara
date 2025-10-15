require('dotenv').config();

module.exports = {
    // Clave secreta para firmar tokens JWT
    JWT_SECRET: process.env.JWT_SECRET || 'clave_secreta_para_desarrollo',
    
    // Clave secreta para refresh tokens (diferente para mayor seguridad)
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'clave_refresh_secreta_para_desarrollo',
    
    // Tiempo de expiración del token (1 hora para mayor seguridad)
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
    
    // Tiempo de expiración del refresh token (7 días)
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    
    // Roles simplificados para hostal
    ROLES: {
        ENCARGADO: 'encargado',
        LIMPIEZA: 'limpieza',
        MANTENIMIENTO: 'mantenimiento'
    }
};
