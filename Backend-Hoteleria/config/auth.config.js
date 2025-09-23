require('dotenv').config();

module.exports = {
    // Clave secreta para firmar tokens JWT
    JWT_SECRET: process.env.JWT_SECRET || 'clave_secreta_para_desarrollo',
    
    // Tiempo de expiración del token (24 horas por defecto)
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
    
    // Roles simplificados para hostal
    ROLES: {
        ENCARGADO: 'encargado',
        LIMPIEZA: 'limpieza',
        MANTENIMIENTO: 'mantenimiento'
    }
};
