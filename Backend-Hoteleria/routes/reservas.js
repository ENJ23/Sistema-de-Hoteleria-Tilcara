const express = require('express');
const router = express.Router();
const Reserva = require('../models/Reserva');
const Habitacion = require('../models/Habitacion');
const Cliente = require('../models/Cliente');
const { body, validationResult, query } = require('express-validator');
const { verifyToken, isEncargado, isUsuarioValido } = require('../middlewares/authJwt');
const { 
    validateEditPayment, 
    validateAddPayment, 
    checkPaymentPermissions, 
    validatePaymentLimits, 
    logPaymentOperation 
} = require('../middlewares/paymentValidation.middleware');
const mongoose = require('mongoose'); // Importar mongoose para transacciones
const pdfService = require('../services/pdf.service'); // Importar servicio de PDF

// Validaciones mejoradas para crear/actualizar reservas
const validarReserva = [
    body('cliente.nombre', 'El nombre del cliente es obligatorio')
        .notEmpty()
        .trim()
        .escape()
        .isLength({ min: 2, max: 50 })
        .withMessage('El nombre debe tener entre 2 y 50 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('El nombre solo puede contener letras y espacios'),
    
    body('cliente.apellido', 'El apellido del cliente es obligatorio')
        .notEmpty()
        .trim()
        .escape()
        .isLength({ min: 2, max: 50 })
        .withMessage('El apellido debe tener entre 2 y 50 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
        .withMessage('El apellido solo puede contener letras y espacios'),
    
    body('cliente.email', 'El email del cliente es obligatorio')
        .isEmail()
        .normalizeEmail()
        .isLength({ max: 100 })
        .withMessage('El email no puede exceder 100 caracteres'),
    
    body('cliente.telefono', 'El teléfono del cliente es obligatorio')
        .notEmpty()
        .trim()
        .isLength({ min: 7, max: 20 })
        .withMessage('El teléfono debe tener entre 7 y 20 caracteres')
        .matches(/^[\d\s\-\+\(\)]+$/)
        .withMessage('El teléfono solo puede contener números, espacios, guiones y paréntesis'),
    
    body('cliente.documento', 'El documento del cliente es obligatorio')
        .notEmpty()
        .trim()
        .isLength({ min: 5, max: 20 })
        .withMessage('El documento debe tener entre 5 y 20 caracteres'),
    
    body('habitacion', 'La habitación es obligatoria')
        .notEmpty()
        .isMongoId()
        .withMessage('ID de habitación inválido'),
    
    body('fechaEntrada', 'La fecha de entrada es obligatoria')
        .notEmpty()
        .isISO8601()
        .withMessage('Formato de fecha inválido')
        .custom((value) => {
            const fecha = new Date(value);
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            if (fecha < hoy) {
                throw new Error('La fecha de entrada no puede ser anterior a hoy');
            }
            return true;
        }),
    
    body('fechaSalida', 'La fecha de salida es obligatoria')
        .notEmpty()
        .isISO8601()
        .withMessage('Formato de fecha inválido')
        .custom((value, { req }) => {
            const fechaSalida = new Date(value);
            const fechaEntrada = new Date(req.body.fechaEntrada);
            if (fechaSalida <= fechaEntrada) {
                throw new Error('La fecha de salida debe ser posterior a la fecha de entrada');
            }
            return true;
        }),
    
    body('horaEntrada', 'Formato de hora inválido')
        .optional()
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Formato de hora debe ser HH:MM'),
    
    body('horaSalida', 'Formato de hora inválido')
        .optional()
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Formato de hora debe ser HH:MM'),
    
    body('precioPorNoche', 'El precio por noche es obligatorio')
        .isFloat({ min: 0 })
        .withMessage('El precio debe ser un número positivo'),
    
    body('estado', 'Estado inválido')
        .optional()
        .isIn(['Confirmada', 'Pendiente', 'En curso', 'Cancelada', 'Completada', 'No Show'])
        .withMessage('Estado de reserva inválido'),
    
    body('metodoPago', 'Método de pago inválido')
        .optional()
        .isIn(['Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia', 'Otro'])
        .withMessage('Método de pago inválido'),
    
    body('observaciones', 'Las observaciones son muy largas')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Las observaciones no pueden exceder 500 caracteres')
];

// Validaciones para consultas
const validarConsultaReservas = [
    query('page', 'Página debe ser un número positivo')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Página debe ser un número positivo'),
    
    query('limit', 'Límite debe ser un número entre 1 y 100')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Límite debe ser un número entre 1 y 100'),
    
    query('estado', 'Estado inválido')
        .optional()
        .custom((value) => {
            if (!value) return true;
            
            // Si es un string con múltiples estados separados por comas
            if (typeof value === 'string' && value.includes(',')) {
                const estados = value.split(',').map(e => e.trim());
                const estadosValidos = ['Confirmada', 'Pendiente', 'En curso', 'Cancelada', 'Completada', 'No Show'];
                const estadosInvalidos = estados.filter(e => !estadosValidos.includes(e));
                if (estadosInvalidos.length > 0) {
                    throw new Error(`Estados inválidos: ${estadosInvalidos.join(', ')}`);
                }
                return true;
            }
            
            // Si es un solo estado
            const estadosValidos = ['Confirmada', 'Pendiente', 'En curso', 'Cancelada', 'Completada', 'No Show'];
            if (!estadosValidos.includes(value)) {
                throw new Error('Estado de reserva inválido');
            }
            return true;
        }),
    
    query('fechaInicio', 'Formato de fecha inválido')
        .optional()
        .isISO8601()
        .withMessage('Formato de fecha inválido'),
    
    query('fechaFin', 'Formato de fecha inválido')
        .optional()
        .isISO8601()
        .withMessage('Formato de fecha inválido')
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

// GET - Obtener todas las reservas (solo usuarios autenticados)
router.get('/', [
    verifyToken,
    isUsuarioValido,
    ...validarConsultaReservas,
    manejarErroresValidacion
], async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            estado = '', 
            fechaInicio = '', 
            fechaFin = '',
            cliente = ''
        } = req.query;
        
        let query = {};
        
        if (estado) {
            // Si el estado contiene comas, es una lista de estados
            if (typeof estado === 'string' && estado.includes(',')) {
                const estados = estado.split(',').map(e => e.trim());
                query.estado = { $in: estados };
            } else {
                query.estado = estado;
            }
        }
        
        if (fechaInicio && fechaFin) {
            query.fechaEntrada = {
                $gte: new Date(fechaInicio),
                $lte: new Date(fechaFin)
            };
        }
        
        const populateOptions = [
            { path: 'habitacion', select: 'numero tipo precioActual' }
        ];
        
        const reservas = await Reserva.find(query)
            .populate(populateOptions)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ fechaCreacion: -1 });
            
        const total = await Reserva.countDocuments(query);
        
        // Agregar campos calculados para cada reserva
        const reservasConCalculos = reservas.map(reserva => {
            const reservaObj = reserva.toObject();
            reservaObj.estaCompletamentePagado = reserva.estaCompletamentePagado();
            reservaObj.montoRestante = reserva.calcularMontoRestante();
            reservaObj.totalPagos = reserva.historialPagos ? 
                reserva.historialPagos.reduce((sum, pago) => sum + pago.monto, 0) : 
                reserva.montoPagado || 0;
            return reservaObj;
        });
        
        res.json({
            reservas: reservasConCalculos,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener reservas', error: error.message });
    }
});

// GET - Obtener reservas por cliente (el propio cliente o empleados/administradores)
router.get('/cliente/:clienteId', [
    verifyToken,
    // Middleware para verificar si el usuario es el dueño de las reservas o un empleado/administrador
    (req, res, next) => {
        // Si el usuario es encargado, limpieza o mantenimiento, permitir
        if (req.userId.rol === 'encargado' || req.userId.rol === 'limpieza' || req.userId.rol === 'mantenimiento') {
            return next();
        }
        // Si el usuario es el dueño de las reservas, permitir
        if (req.params.clienteId === req.userId.id) {
            return next();
        }
        // Si no, denegar acceso
        return res.status(403).json({ message: 'No tienes permiso para ver estas reservas' });
    }
], async (req, res) => {
    try {
        const reservas = await Reserva.find({ cliente: req.params.clienteId })
            .populate('habitacion', 'numero tipo precioActual')
            .sort({ fechaCreacion: -1 });
        
        res.json(reservas);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener reservas del cliente', error: error.message });
    }
});

// GET - Obtener reservas por habitación (solo empleados y administradores)
router.get('/habitacion/:habitacionId', [
    verifyToken,
    isEncargado
], async (req, res) => {
    try {
        const reservas = await Reserva.find({ habitacion: req.params.habitacionId })
            .populate('habitacion', 'numero tipo precioActual')
            .sort({ fechaEntrada: 1 });
        
        res.json(reservas);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener reservas de la habitación', error: error.message });
    }
});

// GET - Obtener una reserva por ID (el propio cliente o empleados/administradores)
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const reserva = await Reserva.findById(req.params.id)
            .populate('habitacion');
            
        if (!reserva) {
            return res.status(404).json({ message: 'Reserva no encontrada' });
        }
        
        // Agregar campos calculados
        const reservaObj = reserva.toObject();
        reservaObj.estaCompletamentePagado = reserva.estaCompletamentePagado();
        reservaObj.montoRestante = reserva.calcularMontoRestante();
        reservaObj.totalPagos = reserva.historialPagos ? 
            reserva.historialPagos.reduce((sum, pago) => sum + pago.monto, 0) : 
            reserva.montoPagado || 0;
        
        // Si el usuario es encargado, limpieza o mantenimiento, permitir acceso completo
        if (req.userId.rol === 'encargado' || req.userId.rol === 'limpieza' || req.userId.rol === 'mantenimiento') {
            console.log('✅ Usuario autorizado (rol:', req.userId.rol, ') - permitiendo acceso a reserva');
            return res.json(reservaObj);
        }
        
        // Si el usuario es el dueño de la reserva, permitir
        if (reserva.cliente.email === req.userId.email) {
            console.log('✅ Usuario es dueño de la reserva - permitiendo acceso');
            return res.json(reservaObj);
        }
        
        // Si no, denegar acceso
        console.log('❌ Usuario no autorizado - rol:', req.userId.rol, 'email:', req.userId.email);
        console.log('❌ Reserva cliente email:', reserva.cliente.email);
        return res.status(403).json({ message: 'No tienes permiso para ver esta reserva' });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener reserva', error: error.message });
    }
});

// POST - Crear una nueva reserva (cualquiera puede crear una reserva, pero se requiere autenticación para ciertos campos)
router.post('/', [
    // Autenticación requerida solo para ciertos campos o para usuarios autenticados
    (req, res, next) => {
        // Si el usuario está autenticado, verificar si es empleado/administrador
        if (req.headers.authorization) {
            return verifyToken(req, res, next);
        }
        next();
    },
    // Si el usuario está autenticado, verificar permisos
    (req, res, next) => {
        if (req.userId) {
            // Si el usuario es encargado, puede crear reservas para cualquier cliente
            if (req.userId.rol === 'encargado') {
                return next();
            }
            // Si es limpieza o mantenimiento, también puede crear reservas
            if (req.userId.rol === 'limpieza' || req.userId.rol === 'mantenimiento') {
                return next();
            }
            // Para otros roles, verificar que solo pueda crear reservas para sí mismo
            if (req.body.cliente && req.body.cliente.email !== req.userId.email) {
                return res.status(403).json({ message: 'Solo puedes crear reservas para tu propia cuenta' });
            }
            // Si no se especifica cliente, asignar el email del usuario autenticado
            if (!req.body.cliente) {
                req.body.cliente = { email: req.userId.email };
            }
        }
        next();
    },
    ...validarReserva,
    manejarErroresValidacion
], async (req, res) => {
    try {
        const { cliente, habitacion, fechaEntrada, fechaSalida, ...otrosDatos } = req.body;
        
        console.log('=== CREANDO RESERVA ===');
        console.log('Cliente:', cliente);
        console.log('Habitación ID:', habitacion);
        console.log('Fechas:', { entrada: fechaEntrada, salida: fechaSalida });
        console.log('Otros datos:', otrosDatos);
        
        // Verificar que la habitación existe y está disponible
        const habitacionDoc = await Habitacion.findById(habitacion);
        if (!habitacionDoc) {
            console.log('❌ Habitación no encontrada:', habitacion);
            return res.status(404).json({ message: 'Habitación no encontrada' });
        }
        
        console.log('✅ Habitación encontrada:', habitacionDoc.numero, 'Estado:', habitacionDoc.estado);
        
        // NO verificar el estado de la habitación aquí, solo verificar conflictos de fechas
        // El estado de la habitación se maneja dinámicamente basado en las reservas activas
        
        // Verificar conflictos de fechas
        const reservasExistentes = await Reserva.find({
            habitacion: habitacion,
            estado: { $nin: ['Cancelada'] }, // Excluir reservas canceladas
            $or: [
                {
                    fechaEntrada: { $lt: new Date(fechaSalida) },
                    fechaSalida: { $gt: new Date(fechaEntrada) }
                }
            ]
        });
        
        console.log('🔍 Reservas existentes encontradas:', reservasExistentes.length);
        
        if (reservasExistentes.length > 0) {
            console.log('❌ Conflicto de fechas detectado');
            return res.status(400).json({ 
                message: 'La habitación ya está reservada para esas fechas',
                conflictos: reservasExistentes.map(r => ({
                    fechaEntrada: r.fechaEntrada,
                    fechaSalida: r.fechaSalida,
                    estado: r.estado
                }))
            });
        }
        
        // Crear la reserva
        const reserva = new Reserva({
            cliente,
            habitacion,
            fechaEntrada: new Date(fechaEntrada),
            fechaSalida: new Date(fechaSalida),
            ...otrosDatos,
            creadoPor: req.userId ? req.userId.nombre : 'Cliente'
        });
        
        console.log('💾 Guardando reserva...');
        await reserva.save();
        
        // NO actualizar el estado de la habitación aquí
        // El estado se maneja dinámicamente basado en las reservas activas
        
        // Populate y retornar respuesta
        await reserva.populate('habitacion', 'numero tipo precioActual');
        
        console.log('✅ Reserva creada exitosamente:', reserva._id);
        
        res.status(201).json({
            message: 'Reserva creada exitosamente',
            reserva
        });
        
    } catch (error) {
        console.error('❌ Error al crear reserva:', error);
        res.status(500).json({ 
            message: 'Error al crear la reserva', 
            error: error.message 
        });
    }
});

// PUT - Actualizar una reserva (solo empleados y administradores)
router.put('/:id', [
    verifyToken,
    isEncargado,
    body('fechaEntrada').isISO8601().withMessage('Fecha de entrada inválida'),
    body('fechaSalida').isISO8601().withMessage('Fecha de salida inválida'),
    body('precioPorNoche').isFloat({ min: 0 }).withMessage('El precio por noche debe ser mayor a 0'),
    body('horaEntrada').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de hora inválido'),
    body('horaSalida').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de hora inválido')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const reserva = await Reserva.findById(req.params.id);
        if (!reserva) {
            return res.status(404).json({ message: 'Reserva no encontrada' });
        }
        
        const { fechaEntrada, fechaSalida, habitacion } = req.body;
        
        // Verificar conflictos de fechas (excluyendo la reserva actual)
        const reservasExistentes = await Reserva.find({
            habitacion: habitacion || reserva.habitacion,
            _id: { $ne: req.params.id },
            estado: { $nin: ['Cancelada'] },
            $or: [
                {
                    fechaEntrada: { $lt: new Date(fechaSalida) },
                    fechaSalida: { $gt: new Date(fechaEntrada) }
                }
            ]
        });
        
        if (reservasExistentes.length > 0) {
            return res.status(400).json({ 
                message: 'La habitación ya tiene una reserva para esas fechas',
                reservasConflictivas: reservasExistentes
            });
        }
        
        // Actualizar la reserva
        const reservaActualizada = await Reserva.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('habitacion');
        
        res.json(reservaActualizada);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar reserva', error: error.message });
    }
});

// PATCH - Actualizar estado de una reserva (solo empleados y administradores)
router.patch('/:id/estado', [
    verifyToken,
    isEncargado,
    body('estado').isIn(['Confirmada', 'Pendiente', 'En curso', 'Cancelada', 'Completada', 'No Show']).withMessage('Estado inválido')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const reserva = await Reserva.findById(req.params.id);
        if (!reserva) {
            return res.status(404).json({ message: 'Reserva no encontrada' });
        }
        
        const nuevoEstado = req.body.estado;
        reserva.estado = nuevoEstado;
        
        // Si se cancela la reserva, liberar la habitación
        if (nuevoEstado === 'Cancelada') {
            await Habitacion.findByIdAndUpdate(reserva.habitacion, { estado: 'Disponible' });
        }
        
        await reserva.save();
        
        await reserva.populate('cliente');
        await reserva.populate('habitacion');
        
        res.json(reserva);
    } catch (error) {
        res.status(500).json({ message: 'Error al cambiar estado', error: error.message });
    }
});

// PATCH - Actualizar estado de pago de una reserva (solo empleados y administradores)
router.patch('/:id/pago', [
    verifyToken,
    isEncargado,
    body('pagado').optional().isBoolean().withMessage('El valor de pago debe ser true o false'),
    body('metodoPago').optional().isIn(['Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia', 'PayPal']).withMessage('Método de pago inválido'),
    body('monto').optional().isFloat({ min: 0 }).withMessage('El monto debe ser mayor a 0'),
    body('observaciones').optional().isString().withMessage('Las observaciones deben ser texto')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const reserva = await Reserva.findById(req.params.id);
        if (!reserva) {
            return res.status(404).json({ message: 'Reserva no encontrada' });
        }
        
        // Si se proporciona método de pago y monto, registrar pago en el historial
        if (req.body.metodoPago && req.body.monto) {
            const monto = parseFloat(req.body.monto);
            const metodoPago = req.body.metodoPago;
            const observaciones = req.body.observaciones || '';
            const registradoPor = req.userId ? req.userId.nombre : 'Encargado';
            
            // Verificar que el monto no exceda el total restante
            const montoRestante = reserva.calcularMontoRestante();
            if (monto > montoRestante) {
                return res.status(400).json({ 
                    message: `El monto excede el total restante. Restante: $${montoRestante}`,
                    montoRestante: montoRestante
                });
            }
            
            // Agregar pago al historial
            await reserva.agregarPago(monto, metodoPago, observaciones, registradoPor);
            
            console.log('💰 Pago registrado:', {
                reservaId: reserva._id,
                monto: monto,
                metodoPago: metodoPago,
                montoPagado: reserva.montoPagado,
                montoRestante: reserva.calcularMontoRestante(),
                pagado: reserva.pagado
            });
            
        } else if (req.body.pagado !== undefined) {
            // Solo actualizar estado de pago (para compatibilidad)
            reserva.pagado = req.body.pagado;
            await reserva.save();
        }
        
        await reserva.populate('cliente');
        await reserva.populate('habitacion');
        
        // Incluir información adicional de pagos
        const respuesta = {
            ...reserva.toObject(),
            montoRestante: reserva.calcularMontoRestante(),
            estaCompletamentePagado: reserva.estaCompletamentePagado(),
            totalPagos: reserva.historialPagos.length
        };
        
        res.json(respuesta);
    } catch (error) {
        console.error('Error al actualizar estado de pago:', error);
        res.status(500).json({ message: 'Error al actualizar estado de pago', error: error.message });
    }
});

// DELETE - Eliminar una reserva (usuarios autenticados)
router.delete('/:id', [
    verifyToken,
    isUsuarioValido, // Cualquier usuario autenticado puede eliminar reservas
    async (req, res, next) => {
        try {
            console.log('🔍 Verificando permisos para eliminar reserva:', req.params.id);
            console.log('👤 Usuario actual:', req.userId);
            
            const reserva = await Reserva.findById(req.params.id);
            if (!reserva) {
                console.log('❌ Reserva no encontrada:', req.params.id);
                return res.status(404).json({ message: 'Reserva no encontrada' });
            }
            
            console.log('✅ Reserva encontrada:', reserva.numero);
            console.log('🔐 Usuario rol:', req.userId.rol);
            
            // Cualquier usuario autenticado puede eliminar reservas
            // (ya verificado por el middleware isUsuarioValido)
            return next();
        } catch (error) {
            console.error('❌ Error al verificar la reserva:', error);
            return res.status(500).json({ message: 'Error al verificar la reserva', error: error.message });
        }
    }
], async (req, res) => {
    try {
        const reserva = await Reserva.findById(req.params.id);
        if (!reserva) {
            return res.status(404).json({ message: 'Reserva no encontrada' });
        }
        
        // NO liberar la habitación automáticamente
        // El estado de la habitación se maneja dinámicamente basado en las reservas activas
        
        await Reserva.findByIdAndDelete(req.params.id);
        
        res.json({ message: 'Reserva eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar reserva', error: error.message });
    }
});

// PATCH - Check-in de una reserva
router.patch('/:id/checkin', [
    verifyToken,
    isEncargado,
    body('horaCheckIn').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de hora inválido')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const reserva = await Reserva.findById(req.params.id);
        if (!reserva) {
            return res.status(404).json({ message: 'Reserva no encontrada' });
        }
        
        if (reserva.estado !== 'Confirmada' && reserva.estado !== 'Pendiente') {
            return res.status(400).json({ message: 'Solo se puede hacer check-in a reservas confirmadas o pendientes' });
        }
        
        // Actualizar estado y agregar hora de check-in
        reserva.estado = 'En curso';
        reserva.horaCheckIn = req.body.horaCheckIn || new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        reserva.fechaCheckIn = new Date();
        
        await reserva.save();
        
        // Actualizar estado de la habitación
        await Habitacion.findByIdAndUpdate(reserva.habitacion, { estado: 'Ocupada' });
        
        await reserva.populate('habitacion');
        
        res.json(reserva);
    } catch (error) {
        res.status(500).json({ message: 'Error al realizar check-in', error: error.message });
    }
});

// PATCH - Check-out de una reserva
router.patch('/:id/checkout', [
    verifyToken,
    isEncargado,
    body('horaCheckOut').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de hora inválido')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const reserva = await Reserva.findById(req.params.id);
        if (!reserva) {
            return res.status(404).json({ message: 'Reserva no encontrada' });
        }
        
        if (reserva.estado !== 'En curso') {
            return res.status(400).json({ message: 'Solo se puede hacer check-out a reservas en curso' });
        }
        
        // Actualizar estado y agregar hora de check-out
        reserva.estado = 'Finalizada';
        reserva.horaCheckOut = req.body.horaCheckOut || new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        reserva.fechaCheckOut = new Date();
        
        await reserva.save();
        
        // Actualizar estado de la habitación
        await Habitacion.findByIdAndUpdate(reserva.habitacion, { estado: 'Disponible' });
        
        await reserva.populate('habitacion');
        
        res.json(reserva);
    } catch (error) {
        res.status(500).json({ message: 'Error al realizar check-out', error: error.message });
    }
});



// GET - Obtener reservas para check-in hoy
router.get('/checkin/hoy', [
    verifyToken,
    isEncargado
], async (req, res) => {
    try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);
        
        const reservas = await Reserva.find({
            fechaEntrada: {
                $gte: hoy,
                $lt: manana
            },
            estado: { $in: ['Confirmada', 'Pendiente'] }
        }).populate('habitacion', 'numero tipo');
        
        res.json(reservas);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener reservas para check-in', error: error.message });
    }
});

// GET - Obtener reservas para check-out hoy
router.get('/checkout/hoy', [
    verifyToken,
    isEncargado
], async (req, res) => {
    try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);
        
        const reservas = await Reserva.find({
            fechaSalida: {
                $gte: hoy,
                $lt: manana
            },
            estado: 'En curso'
        }).populate('habitacion', 'numero tipo');
        
        res.json(reservas);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener reservas para check-out', error: error.message });
    }
});

// GET - Obtener reservas en curso
router.get('/en-curso', [
    verifyToken,
    isEncargado
], async (req, res) => {
    try {
        const reservas = await Reserva.find({
            estado: 'En curso'
        }).populate('habitacion', 'numero tipo');
        
        res.json(reservas);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener reservas en curso', error: error.message });
    }
});

// GET - Ruta de prueba para PDF (sin autenticación para testing)
router.get('/test/pdf', async (req, res) => {
    try {
        console.log('=== PRUEBA DE GENERACIÓN DE PDF ===');
        
        // Crear una reserva de prueba
        const reservaPrueba = {
            _id: 'test-123',
            cliente: {
                nombre: 'Juan',
                apellido: 'Pérez',
                email: 'juan@test.com',
                telefono: '123456789',
                documento: '12345678',
                direccion: 'Calle Test 123',
                nacionalidad: 'Argentina'
            },
            habitacion: {
                numero: '101',
                tipo: 'Individual',
                capacidad: 1,
                descripcion: 'Habitación de prueba'
            },
            fechaEntrada: new Date('2024-01-15'),
            fechaSalida: new Date('2024-01-17'),
            horaEntrada: '14:00',
            horaSalida: '11:00',
            precioPorNoche: 100,
            precioTotal: 200,
            estado: 'Confirmada',
            pagado: true,
            montoPagado: 200,
            montoRestante: 0,
            metodoPago: 'Efectivo',
            historialPagos: [{
                monto: 200,
                metodoPago: 'Efectivo',
                fechaPago: new Date(),
                observaciones: 'Pago completo',
                registradoPor: 'Encargado'
            }],
            observaciones: 'Reserva de prueba para verificar PDF'
        };
        
        console.log('🔄 Generando PDF de prueba...');
        
        // Generar PDF usando el servicio
        const pdfBuffer = await pdfService.generarPDFReserva(reservaPrueba);
        
        console.log('✅ PDF de prueba generado exitosamente, tamaño:', pdfBuffer.length, 'bytes');
        
        // Configurar headers para descarga de PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="test-reserva.pdf"');
        res.setHeader('Content-Length', pdfBuffer.length);
        
        // Enviar el PDF
        res.send(pdfBuffer);
        
        console.log('📤 PDF de prueba enviado');
    } catch (error) {
        console.error('❌ Error al generar PDF de prueba:', error);
        res.status(500).json({ 
            message: 'Error al generar PDF de prueba', 
            error: error.message,
            stack: error.stack
        });
    }
});

// GET - Generar PDF de reserva
router.get('/:id/pdf', [
    verifyToken,
    isEncargado
], async (req, res) => {
    try {
        console.log('=== INICIANDO GENERACIÓN DE PDF ===');
        console.log('ID de reserva:', req.params.id);
        
        const reserva = await Reserva.findById(req.params.id).populate('habitacion');
        if (!reserva) {
            console.log('❌ Reserva no encontrada');
            return res.status(404).json({ message: 'Reserva no encontrada' });
        }
        
        console.log('✅ Reserva encontrada:', {
            id: reserva._id,
            cliente: `${reserva.cliente.nombre} ${reserva.cliente.apellido}`,
            habitacion: reserva.habitacion?.numero || 'N/A'
        });
        
        console.log('🔄 Generando PDF...');
        
        // Generar PDF usando el servicio
        const pdfBuffer = await pdfService.generarPDFReserva(reserva);
        
        console.log('✅ PDF generado exitosamente, tamaño:', pdfBuffer.length, 'bytes');
        
        // Configurar headers para descarga de PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="reserva-${reserva._id}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        // Enviar el PDF
        res.send(pdfBuffer);
        
        console.log('📤 PDF enviado al cliente');
    } catch (error) {
        console.error('❌ Error al generar PDF:', error);
        res.status(500).json({ 
            message: 'Error al generar PDF', 
            error: error.message,
            stack: error.stack
        });
    }
});

// GET - Generar comprobante de pago
router.get('/:id/comprobante', [
    verifyToken,
    isEncargado
], async (req, res) => {
    try {
        const reserva = await Reserva.findById(req.params.id).populate('habitacion');
        if (!reserva) {
            return res.status(404).json({ message: 'Reserva no encontrada' });
        }
        
        if (!reserva.pagado && (!reserva.montoPagado || reserva.montoPagado === 0)) {
            return res.status(400).json({ message: 'La reserva no ha sido pagada' });
        }
        
        console.log('Generando comprobante de pago para reserva:', reserva._id);
        
        // Generar comprobante usando el servicio
        const pdfBuffer = await pdfService.generarComprobantePago(reserva);
        
        // Configurar headers para descarga de PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="comprobante-${reserva._id}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        // Enviar el PDF
        res.send(pdfBuffer);
        
        console.log('Comprobante generado exitosamente para reserva:', reserva._id);
    } catch (error) {
        console.error('Error al generar comprobante:', error);
        res.status(500).json({ 
            message: 'Error al generar comprobante', 
            error: error.message 
        });
    }
});

// PUT - Editar un pago específico de una reserva
router.put('/:id/pagos/:pagoId', [
    verifyToken,
    checkPaymentPermissions,
    validateEditPayment,
    validatePaymentLimits,
    logPaymentOperation('editar-pago')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const reserva = await Reserva.findById(req.params.id);
        if (!reserva) {
            return res.status(404).json({ message: 'Reserva no encontrada' });
        }
        
        const pagoId = req.params.pagoId;
        const nuevosDatos = req.body;
        const modificadoPor = req.userId ? req.userId.nombre : 'Encargado';
        const motivoModificacion = req.body.motivo || 'Edición de pago por usuario autorizado';
        
        // Editar el pago usando el método del modelo
        await reserva.editarPago(pagoId, nuevosDatos, modificadoPor, motivoModificacion);
        
        await reserva.populate('cliente');
        await reserva.populate('habitacion');
        
        console.log('💰 Pago editado:', {
            reservaId: reserva._id,
            pagoId: pagoId,
            nuevosDatos: nuevosDatos,
            montoPagado: reserva.montoPagado,
            montoRestante: reserva.calcularMontoRestante(),
            pagado: reserva.pagado
        });
        
        // Incluir información adicional de pagos
        const respuesta = {
            ...reserva.toObject(),
            montoRestante: reserva.calcularMontoRestante(),
            estaCompletamentePagado: reserva.estaCompletamentePagado(),
            totalPagos: reserva.historialPagos.length
        };
        
        res.json(respuesta);
    } catch (error) {
        console.error('Error al editar pago:', error);
        res.status(400).json({ 
            message: error.message || 'Error al editar pago', 
            error: error.message 
        });
    }
});

// DELETE - Eliminar un pago específico de una reserva
router.delete('/:id/pagos/:pagoId', [
    verifyToken,
    checkPaymentPermissions,
    logPaymentOperation('eliminar-pago')
], async (req, res) => {
    try {
        const reserva = await Reserva.findById(req.params.id);
        if (!reserva) {
            return res.status(404).json({ message: 'Reserva no encontrada' });
        }
        
        const pagoId = req.params.pagoId;
        const eliminadoPor = req.userId ? req.userId.nombre : 'Encargado';
        
        // Obtener información del pago antes de eliminarlo para logging
        const pagoAEliminar = reserva.historialPagos.find(pago => pago._id.toString() === pagoId);
        if (!pagoAEliminar) {
            return res.status(404).json({ message: 'Pago no encontrado' });
        }
        
        // Eliminar el pago usando el método del modelo
        await reserva.eliminarPago(pagoId, eliminadoPor);
        
        await reserva.populate('cliente');
        await reserva.populate('habitacion');
        
        console.log('💰 Pago eliminado:', {
            reservaId: reserva._id,
            pagoId: pagoId,
            pagoEliminado: {
                monto: pagoAEliminar.monto,
                metodoPago: pagoAEliminar.metodoPago,
                fechaPago: pagoAEliminar.fechaPago
            },
            montoPagado: reserva.montoPagado,
            montoRestante: reserva.calcularMontoRestante(),
            pagado: reserva.pagado
        });
        
        // Incluir información adicional de pagos
        const respuesta = {
            ...reserva.toObject(),
            montoRestante: reserva.calcularMontoRestante(),
            estaCompletamentePagado: reserva.estaCompletamentePagado(),
            totalPagos: reserva.historialPagos.length
        };
        
        res.json(respuesta);
    } catch (error) {
        console.error('Error al eliminar pago:', error);
        res.status(400).json({ 
            message: error.message || 'Error al eliminar pago', 
            error: error.message 
        });
    }
});

// POST - Recalcular totales de pagos (útil para correcciones)
router.post('/:id/recalcular-pagos', [
    verifyToken,
    checkPaymentPermissions,
    logPaymentOperation('recalcular-pagos')
], async (req, res) => {
    try {
        const reserva = await Reserva.findById(req.params.id);
        if (!reserva) {
            return res.status(404).json({ message: 'Reserva no encontrada' });
        }
        
        const montoAnterior = reserva.montoPagado;
        
        // Recalcular totales usando el método del modelo
        await reserva.recalcularPagos();
        
        await reserva.populate('cliente');
        await reserva.populate('habitacion');
        
        console.log('💰 Pagos recalculados:', {
            reservaId: reserva._id,
            montoAnterior: montoAnterior,
            montoNuevo: reserva.montoPagado,
            diferencia: reserva.montoPagado - montoAnterior,
            pagado: reserva.pagado
        });
        
        // Incluir información adicional de pagos
        const respuesta = {
            ...reserva.toObject(),
            montoRestante: reserva.calcularMontoRestante(),
            estaCompletamentePagado: reserva.estaCompletamentePagado(),
            totalPagos: reserva.historialPagos.length
        };
        
        res.json(respuesta);
    } catch (error) {
        console.error('Error al recalcular pagos:', error);
        res.status(500).json({ 
            message: 'Error al recalcular pagos', 
            error: error.message 
        });
    }
});

module.exports = router; 