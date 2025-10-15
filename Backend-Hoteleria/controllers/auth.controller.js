const Usuario = require('../models/Usuario');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_SECRET } = require('../config/auth.config');
const { validationResult } = require('express-validator');

// Generar token JWT
const generateToken = (id, rol) => {
    return jwt.sign(
        { id, rol },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

// Registrar un nuevo usuario (solo administradores)
exports.registro = async (req, res) => {
    try {
        // Validar campos
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { nombre, email, password, rol } = req.body;

        // Verificar si el correo ya está en uso
        const usuarioExistente = await Usuario.findOne({ email });
        if (usuarioExistente) {
            return res.status(400).json({ message: 'El correo electrónico ya está en uso' });
        }

        // Crear nuevo usuario
        const usuario = new Usuario({
            nombre,
            email,
            password,
            rol: rol || 'empleado' // Por defecto es empleado si no se especifica
        });

        // Guardar usuario en la base de datos
        await usuario.save();

        // Generar token
        const token = generateToken(usuario._id, usuario.rol);

        // Devolver respuesta exitosa
        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            usuario: {
                id: usuario._id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol
            },
            token
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ message: 'Error al registrar el usuario', error: error.message });
    }
};

// Iniciar sesión
exports.login = async (req, res) => {
    try {
        console.log('Solicitud de inicio de sesión recibida:', { email: req.body.email });
        const { email, password } = req.body;

        // Validar campos
        if (!email || !password) {
            console.log('Campos faltantes en la solicitud');
            return res.status(400).json({ message: 'Por favor ingresa correo y contraseña' });
        }

        // Buscar usuario por correo
        const usuario = await Usuario.findOne({ email });
        console.log('Usuario encontrado en la base de datos:', usuario ? 'Sí' : 'No');
        
        if (!usuario) {
            console.log('No se encontró ningún usuario con el correo:', email);
            return res.status(401).json({ 
                message: 'Credenciales inválidas',
                details: 'Usuario no encontrado'
            });
        }

        // Verificar contraseña
        console.log('Verificando contraseña...');
        const esContraseñaValida = await usuario.compararPassword(password);
        console.log('Contraseña válida:', esContraseñaValida);
        
        if (!esContraseñaValida) {
            console.log('Contraseña incorrecta para el usuario:', email);
            return res.status(401).json({ 
                message: 'Credenciales inválidas',
                details: 'Contraseña incorrecta'
            });
        }

        // Verificar si el usuario está activo
        console.log('Usuario activo:', usuario.activo);
        if (!usuario.activo) {
            console.log('Cuenta inactiva para el usuario:', email);
            return res.status(403).json({ 
                message: 'Tu cuenta ha sido desactivada. Contacta al administrador.'
            });
        }

        // Generar tokens
        const accessToken = generateToken(usuario._id, usuario.rol);
        const refreshToken = usuario.generateRefreshToken();

        // Devolver respuesta exitosa
        res.json({
            message: 'Inicio de sesión exitoso',
            usuario: {
                id: usuario._id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol
            },
            accessToken,
            refreshToken
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ message: 'Error al iniciar sesión', error: error.message });
    }
};

// Obtener perfil del usuario actual
exports.obtenerPerfil = async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.userId).select('-password');
        
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json(usuario);
    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({ message: 'Error al obtener el perfil del usuario', error: error.message });
    }
};

// Verificar token (para rutas protegidas)
exports.verificarToken = (req, res) => {
    // Si el middleware de autenticación pasa, el token es válido
    res.json({ message: 'Token válido', usuario: req.userId });
};

// Refresh token
exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token requerido' });
        }

        // Verificar refresh token
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        
        if (decoded.type !== 'refresh') {
            return res.status(401).json({ message: 'Token inválido' });
        }

        // Buscar usuario
        const usuario = await Usuario.findById(decoded.id);
        if (!usuario || !usuario.activo) {
            return res.status(401).json({ message: 'Usuario no encontrado o inactivo' });
        }

        // Generar nuevo access token
        const newAccessToken = generateToken(usuario._id, usuario.rol);

        res.json({
            message: 'Token renovado exitosamente',
            accessToken: newAccessToken
        });

    } catch (error) {
        console.error('Error en refresh token:', error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Refresh token expirado' });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Refresh token inválido' });
        }
        
        res.status(500).json({ message: 'Error al renovar token', error: error.message });
    }
};
