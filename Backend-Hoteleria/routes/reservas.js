const express = require('express');
const router = express.Router();
const Reserva = require('../models/Reserva');
const Habitacion = require('../models/Habitacion');
const Cliente = require('../models/Cliente');
const Tarea = require('../models/Tarea');
const CancelacionReserva = require('../models/CancelacionReserva');
const { body, validationResult, query } = require('express-validator');
const { verifyToken, isEncargado, isUsuarioValido } = require('../middlewares/authJwt');

// Helper para loguear solo en desarrollo
const devLog = (message, data) => {
    if (process.env.NODE_ENV === 'development') {
        console.log(message, data || '');
    }
};

const {
    validateEditPayment,
    validateAddPayment,
    checkPaymentPermissions,
    validatePaymentLimits,
    logPaymentOperation
} = require('../middlewares/paymentValidation.middleware');
const { requireLock, autoReleaseLock } = require('../middlewares/concurrency.middleware');
const mongoose = require('mongoose'); // Importar mongoose para transacciones
const pdfService = require('../services/pdf.service'); // Importar servicio de PDF

// Función auxiliar para redondear a 2 decimales (evitar problemas de punto flotante)
function redondearMonto(monto) {
    return Math.round(monto * 100) / 100;
}

// ESTÁNDAR: Función helper para parsear fechas de forma consistente
function parseLocalDate(dateString) {
    if (!dateString || typeof dateString !== 'string') {
        throw new Error('Fecha inválida');
    }

    const parts = dateString.split('-');
    if (parts.length !== 3) {
        throw new Error('Formato de fecha inválido');
    }

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
        throw new Error('Fecha inválida');
    }

    // CORREGIDO: Crear fecha en zona horaria local (Argentina UTC-3)
    // Esto asegura consistencia entre localhost y Vercel
    const fecha = new Date(year, month, day, 0, 0, 0, 0);

    return fecha;
}

// Validaciones mejoradas para crear/actualizar reservas
const validarReserva = [
    // Validación de campos obligatorios
    body('habitacion')
        .notEmpty()
        .withMessage('La habitación es obligatoria')
        .isMongoId()
        .withMessage('ID de habitación inválido'),

    body('fechaEntrada')
        .notEmpty()
        .withMessage('La fecha de entrada es obligatoria')
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('Formato de fecha inválido. Use el formato YYYY-MM-DD (ejemplo: 2024-12-25)'),

    body('fechaSalida')
        .notEmpty()
        .withMessage('La fecha de salida es obligatoria')
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('Formato de fecha inválido. Use el formato YYYY-MM-DD (ejemplo: 2024-12-25)'),

    body('horaEntrada')
        .notEmpty()
        .withMessage('La hora de entrada es obligatoria')
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Formato de hora inválido. Use el formato HH:MM (24 horas)'),

    body('horaSalida')
        .notEmpty()
        .withMessage('La hora de salida es obligatoria')
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Formato de hora inválido. Use el formato HH:MM (24 horas)'),

    body('precioPorNoche')
        .notEmpty()
        .withMessage('El precio por noche es obligatorio')
        .isFloat({ min: 0.01 })
        .withMessage('El precio por noche debe ser mayor a 0'),

    body('estado')
        .optional()
        .default('Pendiente')
        .isIn(['Confirmada', 'Pendiente', 'En curso', 'Cancelada', 'No Show', 'Finalizada'])
        .withMessage('Estado de reserva inválido'),

    // Validación de campos obligatorios del cliente
    body('cliente.nombre')
        .notEmpty()
        .withMessage('El nombre del cliente es obligatorio')
        .isLength({ min: 2, max: 50 })
        .withMessage('El nombre debe tener entre 2 y 50 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/)
        .withMessage('El nombre solo puede contener letras y espacios (sin números ni símbolos)'),

    body('cliente.apellido')
        .notEmpty()
        .withMessage('El apellido del cliente es obligatorio')
        .isLength({ min: 2, max: 50 })
        .withMessage('El apellido debe tener entre 2 y 50 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/)
        .withMessage('El apellido solo puede contener letras y espacios (sin números ni símbolos)'),

    body('cliente.email')
        .optional()
        .custom((value) => {
            if (!value || value.trim() === '') {
                return true; // Campo vacío es válido
            }
            const trimmed = value.trim();
            if (trimmed.length > 100) {
                throw new Error('El email no puede exceder 100 caracteres');
            }
            // Validar formato de email solo si hay contenido
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(trimmed)) {
                throw new Error('Formato de email inválido. Ejemplo: usuario@ejemplo.com');
            }
            return true;
        }),

    body('cliente.telefono')
        .notEmpty()
        .withMessage('El teléfono del cliente es obligatorio')
        .isLength({ min: 7, max: 20 })
        .withMessage('El teléfono debe tener entre 7 y 20 caracteres')
        .matches(/^[\d\s\-\+\(\)]*$/)
        .withMessage('El teléfono solo puede contener números, espacios, guiones y paréntesis'),

    body('cliente.documento')
        .optional()
        .custom((value) => {
            if (!value || value.trim() === '') {
                return true; // Campo vacío es válido
            }
            const trimmed = value.trim();
            if (trimmed.length < 5 || trimmed.length > 20) {
                throw new Error('El documento debe tener entre 5 y 20 caracteres');
            }
            return true;
        }),

    body('habitacion', 'La habitación es obligatoria')
        .notEmpty()
        .isMongoId()
        .withMessage('ID de habitación inválido'),

    body('fechaEntrada', 'La fecha de entrada es obligatoria')
        .notEmpty()
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('Formato de fecha inválido. Use el formato YYYY-MM-DD (ejemplo: 2024-12-25)')
        .custom((value) => {
            try {
                const fecha = parseLocalDate(value);
                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);
                if (fecha < hoy) {
                    throw new Error('La fecha de entrada no puede ser anterior a hoy. Seleccione una fecha actual o futura.');
                }
                return true;
            } catch (error) {
                throw new Error('Fecha de entrada inválida: ' + error.message);
            }
        }),

    body('fechaSalida', 'La fecha de salida es obligatoria')
        .notEmpty()
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('Formato de fecha inválido. Use el formato YYYY-MM-DD (ejemplo: 2024-12-25)')
        .custom((value, { req }) => {
            try {
                const fechaSalida = parseLocalDate(value);
                const fechaEntrada = parseLocalDate(req.body.fechaEntrada);
                if (fechaSalida <= fechaEntrada) {
                    throw new Error('La fecha de salida debe ser posterior a la fecha de entrada. Debe haber al menos un día de diferencia.');
                }
                return true;
            } catch (error) {
                throw new Error('Fecha de salida inválida: ' + error.message);
            }
        }),

    body('horaEntrada', 'Formato de hora inválido')
        .optional()
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Formato de hora inválido. Use formato HH:MM (24 horas). Ejemplo: 14:30'),

    body('horaSalida', 'Formato de hora inválido')
        .optional()
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Formato de hora inválido. Use formato HH:MM (24 horas). Ejemplo: 11:00'),

    body('precioPorNoche', 'El precio por noche es obligatorio')
        .isFloat({ min: 0 })
        .withMessage('El precio debe ser un número positivo mayor a 0'),

    body('estado', 'Estado inválido')
        .optional()
        .default('Pendiente')
        .isIn(['Confirmada', 'Pendiente', 'En curso', 'Cancelada', 'No Show', 'Finalizada', 'Completada'])
        .withMessage('Estado de reserva inválido'),

    body('metodoPago', 'Método de pago inválido')
        .optional()
        .isIn(['Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia', 'PayPal', 'Otro'])
        .withMessage('Método de pago inválido'),

    // Pago inicial opcional al crear
    body('pagoInicial')
        .optional()
        .isObject()
        .withMessage('El pago inicial debe enviarse como objeto'),

    body('pagoInicial.monto')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('El monto inicial debe ser mayor a 0'),

    body('pagoInicial.metodoPago')
        .optional()
        .isIn(['Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia', 'PayPal', 'Otro'])
        .withMessage('Método de pago inicial inválido'),

    body('pagoInicial.fechaPago')
        .optional()
        .isISO8601()
        .withMessage('Fecha de pago inicial inválida'),

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

            const estadosValidos = ['Confirmada', 'Pendiente', 'En curso', 'Cancelada', 'No Show', 'Finalizada', 'Completada'];

            // Si es un string con múltiples estados separados por comas
            if (typeof value === 'string' && value.includes(',')) {
                const estados = value.split(',').map(e => e.trim());
                const estadosInvalidos = estados.filter(e => !estadosValidos.includes(e));
                if (estadosInvalidos.length > 0) {
                    throw new Error(`Estados inválidos: ${estadosInvalidos.join(', ')}`);
                }
                return true;
            }

            // Si es un solo estado
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
        // Categorizar errores por tipo
        const erroresRequeridos = errors.array().filter(err => err.msg.includes('obligatorio') || err.msg.includes('requerido'));
        const erroresFormato = errors.array().filter(err => err.msg.includes('formato') || err.msg.includes('inválido'));
        const erroresLongitud = errors.array().filter(err => err.msg.includes('caracteres') || err.msg.includes('longitud'));

        let mensajePrincipal = 'Los datos enviados contienen errores.';
        let sugerencia = 'Verifique que todos los campos requeridos estén completos y con el formato correcto.';

        if (erroresRequeridos.length > 0) {
            mensajePrincipal = 'Faltan campos obligatorios.';
            sugerencia = 'Complete todos los campos marcados como obligatorios.';
        } else if (erroresFormato.length > 0) {
            mensajePrincipal = 'Formato de datos incorrecto.';
            sugerencia = 'Verifique el formato de los datos ingresados.';
        } else if (erroresLongitud.length > 0) {
            mensajePrincipal = 'Longitud de datos incorrecta.';
            sugerencia = 'Ajuste la longitud de los campos según los requisitos.';
        }

        return res.status(400).json({
            success: false,
            message: mensajePrincipal,
            errors: errors.array().map(error => ({
                field: error.path,
                message: error.msg,
                value: error.value,
                location: error.location
            })),
            sugerencia: sugerencia,
            camposFaltantes: erroresRequeridos.map(err => err.path)
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
        devLog('🔍 Backend recibió petición GET /reservas con query:', req.query);

        const {
            page = 1,
            limit = 10,
            estado = '',
            fechaInicio = '',
            fechaFin = '',
            cliente = '',
            habitacion = ''
        } = req.query;

        let query = {};
        let conditions = [];

        // Filtro por estado
        if (estado) {
            // Si el estado contiene comas, es una lista de estados
            if (typeof estado === 'string' && estado.includes(',')) {
                const estados = estado.split(',').map(e => e.trim());
                conditions.push({ estado: { $in: estados } });
                console.log('🔍 Backend - Estados filtrados:', estados);
            } else {
                conditions.push({ estado: estado });
                console.log('🔍 Backend - Estado único:', estado);
            }
        }

        // Filtro por nombre o apellido del cliente
        if (cliente) {
            const clienteRegex = new RegExp(cliente, 'i'); // 'i' para case-insensitive
            conditions.push({
                $or: [
                    { 'cliente.nombre': clienteRegex },
                    { 'cliente.apellido': clienteRegex }
                ]
            });
            console.log('🔍 Backend - Filtro cliente aplicado:', cliente);
        }

        // Filtro por número de habitación
        if (habitacion) {
            // Buscar la habitación por número
            const habitacionNumero = isNaN(habitacion) ? habitacion : parseInt(habitacion);
            const habitacionEncontrada = await Habitacion.findOne({ numero: habitacionNumero });
            if (habitacionEncontrada) {
                conditions.push({ habitacion: habitacionEncontrada._id });
                console.log('🔍 Backend - Filtro habitación aplicado:', habitacionNumero, '(ID:', habitacionEncontrada._id, ')');
            } else {
                // Si no existe la habitación, devolver resultados vacíos
                console.log('🔍 Backend - Habitación no encontrada:', habitacionNumero);
                conditions.push({ habitacion: null }); // Garantiza que no habrá resultados
            }
        }

        // Filtro por rango de fechas
        if (fechaInicio && fechaFin) {
            // CORREGIDO: Buscar reservas que se solapan con el rango de fechas
            // Esto incluye reservas que:
            // 1. Comienzan dentro del rango
            // 2. Terminan dentro del rango
            // 3. Abarcan todo el rango
            // 4. Comienzan antes y terminan después del rango
            const fechaInicioParsed = parseLocalDate(fechaInicio);
            const fechaFinParsed = parseLocalDate(fechaFin);

            conditions.push({
                $or: [
                    // Reservas que comienzan dentro del rango
                    {
                        fechaEntrada: {
                            $gte: fechaInicioParsed,
                            $lte: fechaFinParsed
                        }
                    },
                    // Reservas que terminan dentro del rango
                    {
                        fechaSalida: {
                            $gte: fechaInicioParsed,
                            $lte: fechaFinParsed
                        }
                    },
                    // Reservas que abarcan todo el rango (comienzan antes y terminan después)
                    {
                        fechaEntrada: { $lte: fechaInicioParsed },
                        fechaSalida: { $gte: fechaFinParsed }
                    }
                ]
            });
            devLog('🔍 Backend - Filtro de fechas aplicado (solapamiento):', { fechaInicio, fechaFin });
        }

        // Combinar todas las condiciones con $and
        if (conditions.length > 0) {
            query = { $and: conditions };
        }

        devLog('🔍 Backend - Query final:', Object.keys(query).length > 0 ? 'Applied' : 'None');

        const populateOptions = [
            { path: 'habitacion', select: 'numero tipo precioActual' }
        ];

        // OPTIMIZADO: Usar lean() para mejor rendimiento y campos selectivos
        const reservas = await Reserva.find(query)
            .populate(populateOptions)
            .select('fechaEntrada fechaSalida estado precioTotal precioPorNoche montoPagado historialPagos cliente habitacion fechaCreacion horaEntrada horaSalida observaciones')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ fechaCreacion: -1 })
            .lean(); // Usar lean() para mejor rendimiento

        // OPTIMIZADO: Usar countDocuments con el mismo query para consistencia
        const total = await Reserva.countDocuments(query);

        devLog('🔍 Backend - Reservas encontradas:', reservas.length);
        devLog('🔍 Backend - Total en BD:', total);

        // OPTIMIZADO: Calcular campos en una sola pasada
        const reservasConCalculos = reservas.map(reserva => {
            const totalPagos = reserva.historialPagos ?
                reserva.historialPagos.reduce((sum, pago) => sum + pago.monto, 0) :
                reserva.montoPagado || 0;

            return {
                ...reserva,
                estaCompletamentePagado: redondearMonto(totalPagos) >= reserva.precioTotal,
                montoRestante: redondearMonto(Math.max(0, reserva.precioTotal - totalPagos)),
                totalPagos: redondearMonto(totalPagos)
            };
        });

        devLog('📊 Backend devolviendo:', {
            reservas: reservasConCalculos.length,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
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
            .sort({ fechaCreacion: -1 })
            .lean(); // ⚠️ REDUCCIÓN DE MEMORIA

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
            .sort({ fechaEntrada: 1 })
            .lean(); // ⚠️ REDUCCIÓN DE MEMORIA

        res.json(reservas);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener reservas de la habitación', error: error.message });
    }
});

// GET - Verificar disponibilidad de habitación (DEBE ir ANTES de /:id)
router.get('/check-disponibilidad', [
    verifyToken,
    query('habitacionId').isMongoId().withMessage('ID de habitación inválido'),
    query('fechaInicio').isISO8601().withMessage('Fecha de inicio inválida'),
    query('fechaFin').isISO8601().withMessage('Fecha de fin inválida'),
    query('excludeReservaId').optional().isMongoId().withMessage('ID de reserva a excluir inválido')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { habitacionId, fechaInicio, fechaFin, excludeReservaId } = req.query;

        // Verificar que la habitación existe
        const habitacion = await Habitacion.findById(habitacionId);
        if (!habitacion) {
            return res.status(404).json({ message: 'Habitación no encontrada' });
        }

        // Construir query para buscar reservas conflictivas
        const query = {
            habitacion: habitacionId,
            estado: { $nin: ['Cancelada'] }, // Excluir reservas canceladas
            $or: [
                {
                    fechaEntrada: { $lt: parseLocalDate(fechaFin) },
                    fechaSalida: { $gt: parseLocalDate(fechaInicio) }
                }
            ]
        };

        // Excluir la reserva actual si se está editando
        if (excludeReservaId) {
            query._id = { $ne: excludeReservaId };
        }

        // Buscar reservas que se superponen con el rango de fechas
        const reservasConflictivas = await Reserva.find(query);

        // La habitación está disponible si no hay reservas conflictivas
        const disponible = reservasConflictivas.length === 0;

        console.log('🔍 Verificación de disponibilidad:', {
            habitacionId,
            fechaInicio,
            fechaFin,
            excludeReservaId,
            reservasConflictivas: reservasConflictivas.length,
            disponible
        });

        res.json(disponible);
    } catch (error) {
        console.error('Error al verificar disponibilidad:', error);
        res.status(500).json({
            message: 'Error al verificar disponibilidad',
            error: error.message
        });
    }
});

// ========================================
// ENDPOINTS PARA GESTIÓN DE REEMBOLSOS
// ========================================

// GET - Endpoint de prueba para cancelaciones (sin autenticación)
router.get('/cancelaciones/test', async (req, res) => {
    try {
        console.log('🔍 Endpoint de prueba /cancelaciones/test llamado');
        res.json({
            message: 'Endpoint de cancelaciones funcionando',
            timestamp: new Date().toISOString(),
            modelAvailable: !!CancelacionReserva
        });
    } catch (error) {
        console.error('❌ Error en endpoint de prueba:', error);
        res.status(500).json({
            message: 'Error en endpoint de prueba',
            error: error.message
        });
    }
});

// GET - Obtener historial de auditoría de reservas
router.get('/auditoria/historial', [
    verifyToken,
    isEncargado
], async (req, res) => {
    try {
        console.log('🔍 Endpoint /auditoria/historial llamado');
        console.log('📋 Query params:', req.query);

        const { 
            fechaInicio = '', 
            fechaFin = '', 
            accion = '',
            usuario = '',
            page = 1,
            limit = 50
        } = req.query;

        // Buscar todas las reservas que tengan historial de cambios
        let query = {
            'historialCambios.0': { $exists: true } // Tiene al menos un cambio
        };

        // Construir pipeline de agregación para desplegar el historial
        const pipeline = [
            { $match: query },
            { $unwind: '$historialCambios' },
            // Filtros adicionales
            ...(fechaInicio && fechaFin ? [{
                $match: {
                    'historialCambios.fecha': {
                        $gte: new Date(fechaInicio),
                        $lte: new Date(fechaFin)
                    }
                }
            }] : []),
            ...(accion ? [{
                $match: {
                    'historialCambios.accion': { $regex: accion, $options: 'i' }
                }
            }] : []),
            ...(usuario ? [{
                $match: {
                    'historialCambios.usuario': { $regex: usuario, $options: 'i' }
                }
            }] : []),
            // Proyectar campos relevantes
            {
                $project: {
                    reservaId: '$_id',
                    cliente: 1,
                    habitacion: 1,
                    fechaEntrada: 1,
                    fechaSalida: 1,
                    estado: 1,
                    cambio: '$historialCambios'
                }
            },
            // Ordenar por fecha de cambio (más reciente primero)
            { $sort: { 'cambio.fecha': -1 } },
            // Paginación
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) }
        ];

        const historial = await Reserva.aggregate(pipeline);

        // Población manual de habitación (aggregate no usa populate)
        await Habitacion.populate(historial, { path: 'habitacion', select: 'numero tipo' });

        // Contar total de registros
        const countPipeline = [
            { $match: query },
            { $unwind: '$historialCambios' },
            ...(fechaInicio && fechaFin ? [{
                $match: {
                    'historialCambios.fecha': {
                        $gte: new Date(fechaInicio),
                        $lte: new Date(fechaFin)
                    }
                }
            }] : []),
            ...(accion ? [{
                $match: {
                    'historialCambios.accion': { $regex: accion, $options: 'i' }
                }
            }] : []),
            ...(usuario ? [{
                $match: {
                    'historialCambios.usuario': { $regex: usuario, $options: 'i' }
                }
            }] : []),
            { $count: 'total' }
        ];

        const countResult = await Reserva.aggregate(countPipeline);
        const total = countResult.length > 0 ? countResult[0].total : 0;

        console.log('✅ Historial de auditoría obtenido:', historial.length, 'registros');

        res.json({
            historial,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        console.error('❌ Error al obtener historial de auditoría:', error);
        res.status(500).json({
            message: 'Error al obtener historial de auditoría',
            error: error.message
        });
    }
});

// GET - Obtener cancelaciones con reembolsos pendientes
router.get('/cancelaciones', [
    verifyToken,
    isEncargado
], async (req, res) => {
    try {
        console.log('🔍 Endpoint /cancelaciones llamado');
        console.log('📋 Query params:', req.query);

        const { estadoReembolso = '', fechaInicio = '', fechaFin = '' } = req.query;

        let query = {};

        if (estadoReembolso) {
            query.estadoReembolso = estadoReembolso;
        }

        if (fechaInicio && fechaFin) {
            query.fechaCancelacion = {
                $gte: new Date(fechaInicio),
                $lte: new Date(fechaFin)
            };
        }

        const cancelaciones = await CancelacionReserva.find(query)
            .sort({ fechaCancelacion: -1 })
            .limit(100)
            .lean(); // ⚠️ REDUCCIÓN DE MEMORIA

        res.json({
            cancelaciones,
            total: cancelaciones.length
        });
    } catch (error) {
        console.error('Error al obtener cancelaciones:', error);
        res.status(500).json({
            message: 'Error al obtener cancelaciones',
            error: error.message
        });
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

        // DEBUGGING: Ver qué campos está devolviendo el backend
        console.log('🔍 DEBUGGING BACKEND GET - Configuración de camas:', reservaObj.configuracionCamas);
        console.log('🔍 DEBUGGING BACKEND GET - Información de transporte:', reservaObj.informacionTransporte);
        console.log('🔍 DEBUGGING BACKEND GET - Necesidades especiales:', reservaObj.necesidadesEspeciales);

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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        console.log('🔍 DEBUGGING POST - Datos recibidos:', req.body);
        console.log('🔍 DEBUGGING POST - Configuración de camas:', req.body.configuracionCamas);
        console.log('🔍 DEBUGGING POST - Información de transporte:', req.body.informacionTransporte);
        console.log('🔍 DEBUGGING POST - Necesidades especiales:', req.body.necesidadesEspeciales);

        const { cliente, habitacion, fechaEntrada, fechaSalida, pagoInicial, ...otrosDatos } = req.body;


        // Verificar que la habitación existe y está disponible
        const habitacionDoc = await Habitacion.findById(habitacion);
        if (!habitacionDoc) {
            return res.status(404).json({
                message: 'La habitación seleccionada no existe. Por favor, seleccione una habitación válida.',
                sugerencia: 'Verifique que la habitación esté disponible en el sistema.'
            });
        }

        // NO verificar el estado de la habitación aquí, solo verificar conflictos de fechas
        // El estado de la habitación se maneja dinámicamente basado en las reservas activas

        // Verificar conflictos de fechas usando parseLocalDate
        const fechaEntradaParsed = parseLocalDate(fechaEntrada);
        const fechaSalidaParsed = parseLocalDate(fechaSalida);

        // OPTIMIZADO: Verificar conflictos dentro de la transacción
        const reservasExistentes = await Reserva.find({
            habitacion: habitacion,
            estado: { $nin: ['Cancelada'] }, // Excluir reservas canceladas
            $or: [
                {
                    fechaEntrada: { $lt: fechaSalidaParsed },
                    fechaSalida: { $gt: fechaEntradaParsed }
                }
            ]
        }).session(session);

        if (reservasExistentes.length > 0) {
            return res.status(409).json({
                message: 'La habitación ya está reservada para esas fechas. Por favor, seleccione otras fechas o una habitación diferente.',
                conflictos: reservasExistentes.map(r => ({
                    fechaEntrada: r.fechaEntrada,
                    fechaSalida: r.fechaSalida,
                    estado: r.estado
                })),
                sugerencia: 'Intente con fechas diferentes o seleccione otra habitación disponible.'
            });
        }

        // Crear la reserva usando parseLocalDate para evitar problemas de zona horaria
        const reserva = new Reserva({
            cliente,
            habitacion,
            fechaEntrada: parseLocalDate(fechaEntrada),
            fechaSalida: parseLocalDate(fechaSalida),
            ...otrosDatos,
            estado: 'Pendiente',
            pagado: false,
            metodoPago: pagoInicial?.metodoPago || 'Efectivo',
            creadoPor: req.userId ? req.userId.nombre : 'Cliente',
            historialCambios: [{
                usuario: req.userId ? req.userId.nombre : 'Cliente',
                rol: req.userId ? req.userId.rol : 'Cliente',
                accion: 'Creación',
                detalles: 'Reserva creada inicialmente.',
                estadoNuevo: 'Pendiente'
            }],
            // Nuevos campos opcionales
            configuracionCamas: req.body.configuracionCamas || undefined,
            informacionTransporte: req.body.informacionTransporte || undefined,
            necesidadesEspeciales: req.body.necesidadesEspeciales || undefined
        });

        // Calcular precio total antes de registrar pagos
        const diasReserva = reserva.calcularDias();
        reserva.precioTotal = diasReserva * reserva.precioPorNoche;

        // Registrar pago inicial si se envió
        if (pagoInicial && pagoInicial.monto && pagoInicial.monto > 0) {
            const montoInicial = parseFloat(pagoInicial.monto);
            if (isNaN(montoInicial) || montoInicial <= 0) {
                return res.status(400).json({ message: 'El monto inicial debe ser un número mayor a 0' });
            }

            if (!pagoInicial.metodoPago) {
                return res.status(400).json({ message: 'Debe especificar un método de pago para el pago inicial' });
            }

            // Usar parseLocalDate para evitar desfasajes horarios (UTC vs local)
            const fechaPagoInicial = pagoInicial.fechaPago
                ? parseLocalDate(pagoInicial.fechaPago)
                : (() => { const hoy = new Date(); hoy.setHours(0, 0, 0, 0); return hoy; })();
            const metodoPagoInicial = pagoInicial.metodoPago || 'Efectivo';

            reserva.historialPagos.push({
                monto: montoInicial,
                metodoPago: metodoPagoInicial,
                fechaPago: fechaPagoInicial,
                observaciones: pagoInicial.observaciones || 'Pago inicial',
                registradoPor: req.userId ? req.userId.nombre : 'Cliente'
            });

            reserva.montoPagado = montoInicial;
            reserva.metodoPago = metodoPagoInicial;
            reserva.fechaPago = fechaPagoInicial;
            reserva.pagado = reserva.montoPagado >= reserva.precioTotal;
        }

        console.log('💾 Guardando reserva en transacción...');
        await reserva.save({ session });

        // Confirmar transacción
        await session.commitTransaction();

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
        // OPTIMIZADO: Abortar transacción en caso de error
        await session.abortTransaction();
        console.error('❌ Error al crear reserva:', error);

        // Categorizar el tipo de error para enviar mensaje más específico
        let errorType = 'unknown';
        let errorMessage = 'Error al crear la reserva';

        if (error.name === 'ValidationError') {
            errorType = 'validation';
            errorMessage = 'Error de validación de datos';
        } else if (error.name === 'CastError') {
            errorType = 'type';
            errorMessage = 'Error de tipo de datos';
        } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
            errorType = 'MongoDB';
            errorMessage = 'Error de base de datos';
        } else if (error.message.includes('duplicate')) {
            errorType = 'duplicate';
            errorMessage = 'Ya existe una reserva con estos datos';
        } else if (error.message.includes('required')) {
            errorType = 'required';
            errorMessage = 'Faltan datos obligatorios';
        } else if (error.message.includes('habitacion')) {
            errorType = 'habitacion';
            errorMessage = 'Error con la habitación seleccionada';
        } else if (error.message.includes('fecha')) {
            errorType = 'fecha';
            errorMessage = 'Error con las fechas seleccionadas';
        } else if (error.message.includes('precio')) {
            errorType = 'precio';
            errorMessage = 'Error con el precio';
        } else if (error.message.includes('cliente')) {
            errorType = 'cliente';
            errorMessage = 'Error con los datos del cliente';
        } else if (error.message.includes('estado')) {
            errorType = 'estado';
            errorMessage = 'Error con el estado de la reserva';
        }

        res.status(500).json({
            message: errorMessage,
            error: error.message,
            errorType: errorType,
            details: {
                name: error.name,
                code: error.code,
                keyPattern: error.keyPattern,
                keyValue: error.keyValue
            }
        });
    } finally {
        // OPTIMIZADO: Cerrar sesión de transacción
        await session.endSession();
    }
});

// PUT - Actualizar una reserva (solo empleados y administradores)
router.put('/:id', [
    verifyToken,
    isEncargado,
    body('fechaEntrada').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Formato de fecha de entrada inválido (debe ser YYYY-MM-DD)'),
    body('fechaSalida').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Formato de fecha de salida inválido (debe ser YYYY-MM-DD)'),
    body('precioPorNoche').isFloat({ min: 0 }).withMessage('El precio por noche debe ser mayor a 0'),
    body('horaEntrada').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de hora inválido'),
    body('horaSalida').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de hora inválido')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // CORREGIDO: Poblar habitación para tener acceso al número
        const reserva = await Reserva.findById(req.params.id).populate('habitacion', 'numero tipo');
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
                    fechaEntrada: { $lt: parseLocalDate(fechaSalida) },
                    fechaSalida: { $gt: parseLocalDate(fechaEntrada) }
                }
            ]
        });

        if (reservasExistentes.length > 0) {
            return res.status(400).json({
                message: 'La habitación ya tiene una reserva para esas fechas',
                reservasConflictivas: reservasExistentes
            });
        }

        // Preparar datos de actualización con fechas parseadas correctamente
        const datosActualizacion = { ...req.body };

        // DEBUGGING: Ver qué datos están llegando
        console.log('🔍 DEBUGGING PUT - Datos recibidos:', req.body);
        console.log('🔍 DEBUGGING PUT - Configuración de camas:', req.body.configuracionCamas);
        console.log('🔍 DEBUGGING PUT - Información de transporte:', req.body.informacionTransporte);
        console.log('🔍 DEBUGGING PUT - Necesidades especiales:', req.body.necesidadesEspeciales);

        // ESTÁNDAR: Parsear fechas usando parseLocalDate
        datosActualizacion.fechaEntrada = parseLocalDate(fechaEntrada);
        datosActualizacion.fechaSalida = parseLocalDate(fechaSalida);

        // ✅ INCLUIR EXPLÍCITAMENTE LOS NUEVOS CAMPOS
        if (req.body.configuracionCamas !== undefined) {
            datosActualizacion.configuracionCamas = req.body.configuracionCamas;
        }
        if (req.body.informacionTransporte !== undefined) {
            datosActualizacion.informacionTransporte = req.body.informacionTransporte;
        }
        if (req.body.necesidadesEspeciales !== undefined) {
            datosActualizacion.necesidadesEspeciales = req.body.necesidadesEspeciales;
        }

        // Detectar cambios para auditoría (MEJORADO)
        let cambios = [];
        let detallesCambios = [];
        
        // Detectar cambio de fecha de entrada
        if (fechaEntrada && new Date(fechaEntrada).getTime() !== new Date(reserva.fechaEntrada).getTime()) {
            cambios.push(`Fecha Entrada`);
            const fechaAnterior = new Date(reserva.fechaEntrada).toLocaleDateString('es-AR');
            const fechaNueva = new Date(fechaEntrada).toLocaleDateString('es-AR');
            detallesCambios.push(`Fecha Entrada: ${fechaAnterior} → ${fechaNueva}`);
        }
        
        // Detectar cambio de fecha de salida
        if (fechaSalida && new Date(fechaSalida).getTime() !== new Date(reserva.fechaSalida).getTime()) {
            cambios.push(`Fecha Salida`);
            const fechaAnterior = new Date(reserva.fechaSalida).toLocaleDateString('es-AR');
            const fechaNueva = new Date(fechaSalida).toLocaleDateString('es-AR');
            detallesCambios.push(`Fecha Salida: ${fechaAnterior} → ${fechaNueva}`);
        }
        
        // Detectar cambio de habitación
        if (habitacion && habitacion !== reserva.habitacion.toString()) {
            cambios.push('Habitación');
            // Obtener números de habitación para mejor legibilidad
            const habitacionAnterior = reserva.habitacion.numero || reserva.habitacion.toString();
            // Buscar la nueva habitación para obtener su número
            const nuevaHabitacion = await Habitacion.findById(habitacion);
            const habitacionNueva = nuevaHabitacion ? nuevaHabitacion.numero : habitacion;
            detallesCambios.push(`Habitación: ${habitacionAnterior} → ${habitacionNueva}`);
        }
        
        // Detectar cambio de precio
        if (req.body.precioPorNoche && parseFloat(req.body.precioPorNoche) !== reserva.precioPorNoche) {
            cambios.push('Precio');
            detallesCambios.push(`Precio por noche: $${reserva.precioPorNoche} → $${req.body.precioPorNoche}`);
        }
        
        // Detectar cambio de estado
        if (req.body.estado && req.body.estado !== reserva.estado) {
            cambios.push('Estado');
            detallesCambios.push(`Estado: ${reserva.estado} → ${req.body.estado}`);
        }

        // Si hay cambios, agregar al historial con detalles completos
        if (cambios.length > 0) {
            // Detectar si el cambio fue por drag & drop (cambio de fecha y/o habitación sin otros campos)
            const esDragDrop = (cambios.includes('Fecha Entrada') || cambios.includes('Fecha Salida') || cambios.includes('Habitación')) &&
                              !cambios.includes('Precio') && !req.body.estado;
            
            const accionRealizada = esDragDrop ? 'Movimiento de Reserva (Drag & Drop)' : 'Modificación Manual';
            
            datosActualizacion.$push = {
                historialCambios: {
                    usuario: req.userId ? req.userId.nombre : 'Sistema',
                    rol: req.userId ? req.userId.rol : 'Sistema',
                    accion: accionRealizada,
                    detalles: detallesCambios.join(' | '),
                    fecha: new Date(),
                    estadoAnterior: reserva.estado,
                    estadoNuevo: req.body.estado || reserva.estado
                }
            };
            
            console.log('📝 Registro de auditoría:', {
                accion: accionRealizada,
                cambios: cambios.join(', '),
                detalles: detallesCambios,
                usuario: req.userId ? req.userId.nombre : 'Sistema'
            });
        }

        // Recalcular precio total si cambian las fechas o el precio por noche
        const fechaEntradaActual = datosActualizacion.fechaEntrada;
        const fechaSalidaActual = datosActualizacion.fechaSalida;
        const precioPorNocheActual = parseFloat(req.body.precioPorNoche);

        // Calcular número de noches
        const diferenciaTiempo = fechaSalidaActual.getTime() - fechaEntradaActual.getTime();
        const numeroNoches = Math.ceil(diferenciaTiempo / (1000 * 3600 * 24));

        // Recalcular precio total
        const precioTotal = precioPorNocheActual * numeroNoches;
        datosActualizacion.precioTotal = precioTotal;


        // Actualizar la reserva
        const reservaActualizada = await Reserva.findByIdAndUpdate(
            req.params.id,
            datosActualizacion,
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
        const estadoAnterior = reserva.estado;
        reserva.estado = nuevoEstado;

        // Agregar al historial
        reserva.historialCambios.push({
            usuario: req.userId ? req.userId.nombre : 'Sistema',
            rol: req.userId ? req.userId.rol : 'Sistema',
            accion: 'Cambio de Estado',
            detalles: `Estado cambiado de ${estadoAnterior} a ${nuevoEstado}`,
            estadoAnterior: estadoAnterior,
            estadoNuevo: nuevoEstado
        });

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

// POST - Cancelar una reserva con motivo (crea registro de cancelación)
router.post('/:id/cancelar', [
    verifyToken,
    isEncargado,
    body('motivoCancelacion').notEmpty().withMessage('El motivo de cancelación es obligatorio'),
    body('motivoCancelacion').isLength({ min: 5, max: 500 }).withMessage('El motivo debe tener entre 5 y 500 caracteres')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const reserva = await Reserva.findById(req.params.id).populate('habitacion');
        if (!reserva) {
            return res.status(404).json({ message: 'Reserva no encontrada' });
        }

        // Verificar que la reserva no esté ya cancelada
        if (reserva.estado === 'Cancelada') {
            return res.status(400).json({
                message: 'La reserva ya está cancelada',
                estado: reserva.estado
            });
        }

        console.log('🚫 Cancelando reserva:', {
            reservaId: reserva._id,
            cliente: reserva.cliente,
            montoPagado: reserva.montoPagado,
            motivo: req.body.motivoCancelacion
        });

        // ✅ CREAR REGISTRO DE CANCELACIÓN ANTES DE CAMBIAR ESTADO
        const cancelacionData = {
            reservaId: reserva._id,
            cliente: {
                nombre: reserva.cliente.nombre,
                apellido: reserva.cliente.apellido,
                email: reserva.cliente.email,
                telefono: reserva.cliente.telefono,
                documento: reserva.cliente.documento
            },
            habitacion: {
                numero: reserva.habitacion.numero,
                tipo: reserva.habitacion.tipo
            },
            fechaEntrada: reserva.fechaEntrada,
            fechaSalida: reserva.fechaSalida,
            precioTotal: reserva.precioTotal,
            montoPagado: reserva.montoPagado,
            montoRestante: reserva.calcularMontoRestante(),
            historialPagos: reserva.historialPagos.map(pago => ({
                monto: pago.monto,
                metodoPago: pago.metodoPago,
                fechaPago: pago.fechaPago,
                observaciones: pago.observaciones,
                registradoPor: pago.registradoPor
            })),
            motivoCancelacion: req.body.motivoCancelacion,
            canceladoPor: req.userId ? req.userId.nombre : 'Sistema'
        };

        // ✅ GUARDAR INFORMACIÓN DE CANCELACIÓN
        const cancelacion = new CancelacionReserva(cancelacionData);
        await cancelacion.save();

        // ✅ CAMBIAR ESTADO A CANCELADA
        const estadoAnterior = reserva.estado;
        reserva.estado = 'Cancelada';
        reserva.fechaCancelacion = new Date();

        // Agregar al historial
        reserva.historialCambios.push({
            usuario: req.userId ? req.userId.nombre : 'Sistema',
            rol: req.userId ? req.userId.rol : 'Sistema',
            accion: 'Cancelación',
            detalles: `Reserva cancelada. Motivo: ${req.body.motivoCancelacion}`,
            estadoAnterior: estadoAnterior,
            estadoNuevo: 'Cancelada'
        });

        await reserva.save();

        // Liberar la habitación
        await Habitacion.findByIdAndUpdate(reserva.habitacion, { estado: 'Disponible' });

        console.log('✅ Reserva cancelada exitosamente:', {
            reservaId: reserva._id,
            cancelacionId: cancelacion._id,
            montoPagado: reserva.montoPagado,
            puedeReembolso: cancelacion.puedeProcesarReembolso()
        });

        await reserva.populate('cliente');
        await reserva.populate('habitacion');

        // ✅ RESPUESTA CON INFORMACIÓN DE REEMBOLSO
        const respuesta = {
            message: 'Reserva cancelada correctamente',
            reserva: reserva.toObject(),
            cancelacion: {
                _id: cancelacion._id,
                montoPagado: cancelacion.montoPagado,
                montoRestante: cancelacion.montoRestante,
                puedeReembolso: cancelacion.puedeProcesarReembolso(),
                estadoReembolso: cancelacion.estadoReembolso
            }
        };

        res.json(respuesta);
    } catch (error) {
        console.error('❌ Error al cancelar reserva:', error);
        res.status(500).json({
            message: 'Error al cancelar reserva',
            error: error.message
        });
    }
});

// PATCH - Actualizar estado de pago de una reserva (solo empleados y administradores)
router.patch('/:id/pago', [
    verifyToken,
    isEncargado,
    body('pagado').optional().isBoolean().withMessage('El valor de pago debe ser true o false'),
    body('metodoPago').optional().isIn(['Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia', 'PayPal']).withMessage('Método de pago inválido'),
    body('monto').optional().isFloat({ min: 0 }).withMessage('El monto debe ser mayor a 0'),
    body('fechaPago').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Formato de fecha inválido. Use YYYY-MM-DD'),
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
            
            // ✅ NUEVO: Usar la fecha de pago especificada, o la fecha actual si no se proporciona
            let fechaPago = new Date();
            if (req.body.fechaPago) {
                // Parsear la fecha en formato YYYY-MM-DD como fecha local
                const [año, mes, día] = req.body.fechaPago.split('-');
                fechaPago = new Date(parseInt(año), parseInt(mes) - 1, parseInt(día));
            }

            // Verificar que el monto no exceda el total restante
            const montoRestante = reserva.calcularMontoRestante();
            if (monto > montoRestante) {
                return res.status(400).json({
                    message: `El monto excede el total restante. Restante: $${montoRestante}`,
                    montoRestante: montoRestante
                });
            }

            // Agregar pago al historial con la fecha especificada
            await reserva.agregarPago(monto, metodoPago, observaciones, registradoPor, fechaPago);

            console.log('💰 Pago registrado:', {
                reservaId: reserva._id,
                monto: monto,
                metodoPago: metodoPago,
                fechaPago: fechaPago.toISOString().split('T')[0],
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

// DELETE - Eliminar físicamente una reserva de la base de datos (solo para errores)
// NOTA: Para cancelar correctamente una reserva, usar el endpoint PATCH /:id/estado con estado 'Cancelada'
router.delete('/:id', [
    verifyToken,
    isEncargado, // Solo encargados pueden eliminar físicamente
    require('express-validator').param('id').isMongoId().withMessage('ID de reserva inválido'),
    manejarErroresValidacion
], async (req, res) => {
    try {
        const reserva = await Reserva.findById(req.params.id).populate('habitacion');

        if (!reserva) {
            return res.status(404).json({ message: 'Reserva no encontrada' });
        }

        console.log('🗑️ Eliminando físicamente reserva:', {
            reservaId: reserva._id,
            cliente: `${reserva.cliente.nombre} ${reserva.cliente.apellido}`,
            habitacion: reserva.habitacion?.numero,
            estado: reserva.estado,
            eliminadoPor: req.userId ? req.userId.nombre : 'Sistema'
        });

        // Eliminar físicamente la reserva de la base de datos
        await Reserva.findByIdAndDelete(req.params.id);

        console.log('✅ Reserva eliminada físicamente de la base de datos:', reserva._id);

        res.json({
            message: 'Reserva eliminada correctamente de la base de datos',
            reservaEliminada: {
                _id: reserva._id,
                cliente: `${reserva.cliente.nombre} ${reserva.cliente.apellido}`,
                habitacion: reserva.habitacion?.numero
            }
        });
    } catch (error) {
        console.error('❌ Error al eliminar reserva:', error);
        res.status(500).json({
            message: 'Error al eliminar reserva',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// PATCH - Check-in de una reserva
router.patch('/:id/checkin', [
    verifyToken,
    isEncargado,
    requireLock(10000), // Lock por 10 segundos
    autoReleaseLock,
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
        const estadoAnterior = reserva.estado;
        reserva.estado = 'En curso';
        reserva.horaCheckIn = req.body.horaCheckIn || new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        reserva.fechaCheckIn = new Date();

        // Agregar al historial
        reserva.historialCambios.push({
            usuario: req.userId ? req.userId.nombre : 'Sistema',
            rol: req.userId ? req.userId.rol : 'Sistema',
            accion: 'Check-in',
            detalles: `Check-in realizado a las ${reserva.horaCheckIn}`,
            estadoAnterior: estadoAnterior,
            estadoNuevo: 'En curso'
        });

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
    requireLock(10000), // Lock por 10 segundos
    autoReleaseLock,
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
        const estadoAnteriorCo = reserva.estado;
        reserva.estado = 'Finalizada';
        reserva.horaCheckOut = req.body.horaCheckOut || new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        reserva.fechaCheckOut = new Date();

        // Agregar al historial
        reserva.historialCambios.push({
            usuario: req.userId ? req.userId.nombre : 'Sistema',
            rol: req.userId ? req.userId.rol : 'Sistema',
            accion: 'Check-out',
            detalles: `Check-out realizado a las ${reserva.horaCheckOut}`,
            estadoAnterior: estadoAnteriorCo,
            estadoNuevo: 'Finalizada'
        });

        await reserva.save();

        // Actualizar estado de la habitación
        await Habitacion.findByIdAndUpdate(reserva.habitacion, { estado: 'Disponible' });

        // Crear tarea de limpieza automáticamente
        try {
            const creadoPor = req.userId.nombre || 'Sistema';
            await Tarea.crearTareaLimpieza(reserva.habitacion, creadoPor);
            console.log(`✅ Tarea de limpieza creada para habitación ${reserva.habitacion}`);
        } catch (tareaError) {
            console.error('⚠️ Error al crear tarea de limpieza:', tareaError);
            // No fallar el checkout si hay error en la tarea
        }

        await reserva.populate('habitacion');

        res.json(reserva);
    } catch (error) {
        res.status(500).json({ message: 'Error al realizar check-out', error: error.message });
    }
});

// PATCH - Revertir check-out de una reserva
router.patch('/:id/revertir-checkout', [
    verifyToken,
    isEncargado
], async (req, res) => {
    try {
        const reserva = await Reserva.findById(req.params.id);
        if (!reserva) {
            return res.status(404).json({ message: 'Reserva no encontrada' });
        }

        if (reserva.estado !== 'Finalizada') {
            return res.status(400).json({
                message: 'Solo se puede revertir check-out a reservas finalizadas',
                estadoActual: reserva.estado
            });
        }

        // Verificar que la reserva tenga fecha de check-out (para confirmar que realmente se hizo checkout)
        if (!reserva.fechaCheckOut) {
            return res.status(400).json({
                message: 'Esta reserva no tiene fecha de check-out registrada'
            });
        }

        // Revertir el check-out
        reserva.estado = 'En curso';
        reserva.horaCheckOut = undefined;
        reserva.fechaCheckOut = undefined;

        await reserva.save();

        // Actualizar estado de la habitación a ocupada
        await Habitacion.findByIdAndUpdate(reserva.habitacion, { estado: 'Ocupada' });

        // Eliminar tarea de limpieza si existe (opcional)
        try {
            const Tarea = require('../models/Tarea');
            await Tarea.deleteMany({
                habitacion: reserva.habitacion,
                tipo: 'Limpieza',
                estado: 'Pendiente'
            });
            console.log(`✅ Tarea de limpieza eliminada para habitación ${reserva.habitacion}`);
        } catch (tareaError) {
            console.error('⚠️ Error al eliminar tarea de limpieza:', tareaError);
            // No fallar la reversión si hay error en la tarea
        }

        await reserva.populate('habitacion');

        console.log('🔄 Check-out revertido:', {
            reservaId: reserva._id,
            habitacion: reserva.habitacion.numero,
            nuevoEstado: reserva.estado
        });

        res.json({
            message: 'Check-out revertido exitosamente',
            reserva: reserva
        });
    } catch (error) {
        console.error('❌ Error al revertir check-out:', error);
        res.status(500).json({ message: 'Error al revertir check-out', error: error.message });
    }
});

// POST - Dividir una reserva (Cambio de habitación a mitad de estadía)
router.post('/:id/dividir', [
    verifyToken,
    isEncargado,
    body('fechaCambio').isISO8601().toDate().withMessage('Fecha de cambio inválida'),
    body('nuevaHabitacionId').notEmpty().withMessage('ID de nueva habitación es obligatorio')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { fechaCambio, nuevaHabitacionId } = req.body;
        const reservaOriginal = await Reserva.findById(req.params.id);

        if (!reservaOriginal) {
            return res.status(404).json({ message: 'Reserva no encontrada' });
        }

        // 1. Validar fechas
        const fechaEntrada = new Date(reservaOriginal.fechaEntrada);
        const fechaSalida = new Date(reservaOriginal.fechaSalida);
        const cambio = new Date(fechaCambio);

        // Resetear horas para comparación
        fechaEntrada.setHours(0, 0, 0, 0);
        fechaSalida.setHours(0, 0, 0, 0);
        cambio.setHours(0, 0, 0, 0);

        if (cambio <= fechaEntrada || cambio >= fechaSalida) {
            return res.status(400).json({
                message: 'La fecha de cambio debe estar entre la fecha de entrada y salida de la reserva original.'
            });
        }

        // 2. Verificar disponibilidad de la nueva habitación
        const conflicto = await Reserva.findOne({
            habitacion: nuevaHabitacionId,
            estado: { $nin: ['Cancelada', 'Finalizada'] },
            $or: [
                {
                    fechaEntrada: { $lt: fechaSalida }, // Nueva fecha salida (que es la vieja fecha salida)
                    fechaSalida: { $gt: cambio } // Nueva fecha entrada
                }
            ]
        });

        if (conflicto) {
            return res.status(400).json({ message: 'La nueva habitación no está disponible para las fechas solicitadas.' });
        }

        // 3. Crear la NUEVA reserva
        const nuevaReservaData = {
            cliente: reservaOriginal.cliente,
            habitacion: nuevaHabitacionId,
            fechaEntrada: cambio,
            fechaSalida: reservaOriginal.fechaSalida,
            horaEntrada: '14:00',
            horaSalida: reservaOriginal.horaSalida,
            precioPorNoche: reservaOriginal.precioPorNoche,
            estado: reservaOriginal.estado === 'En curso' ? 'Confirmada' : reservaOriginal.estado,
            metodoPago: reservaOriginal.metodoPago,
            observaciones: `Dividida de reserva ${reservaOriginal._id}. ${reservaOriginal.observaciones || ''}`,
            creadoPor: req.userId ? req.userId.nombre : 'Sistema',
            historialCambios: [{
                usuario: req.userId ? req.userId.nombre : 'Sistema',
                rol: req.userId ? req.userId.rol : 'Sistema',
                accion: 'Creación (División)',
                detalles: 'Creada por división de reserva (Cambio de habitación)'
            }]
        };

        const nuevaReserva = new Reserva(nuevaReservaData);
        await nuevaReserva.save();

        // 4. Modificar la reserva ORIGINAL
        reservaOriginal.fechaSalida = cambio;

        reservaOriginal.historialCambios.push({
            usuario: req.userId ? req.userId.nombre : 'Sistema',
            rol: req.userId ? req.userId.rol : 'Sistema',
            accion: 'División',
            detalles: `Reserva dividida hasta ${cambio.toLocaleDateString()}. Continuación en ${nuevaReserva._id}`,
            estadoAnterior: reservaOriginal.estado,
            estadoNuevo: reservaOriginal.estado
        });

        await reservaOriginal.save(); // Esto recalcula el precioTotal de la original

        // 5. Transferir pagos excedentes (Logica de Negocio)
        // Si lo pagado supera el nuevo precio total, mover el excedente a la nueva reserva
        const montoPagadoOriginal = reservaOriginal.montoPagado;
        const nuevoPrecioTotalOriginal = reservaOriginal.precioTotal;
        const excedente = montoPagadoOriginal - nuevoPrecioTotalOriginal;

        if (excedente > 0) {
            console.log(`💰 Transfiriendo excedente de pago: ${excedente} de ${reservaOriginal._id} a ${nuevaReserva._id}`);

            // Restar de original (Pago negativo)
            await reservaOriginal.agregarPago(
                -excedente,
                'Transferencia',
                `Transferencia por excedente a nueva reserva ${nuevaReserva._id.toString().substring(0, 8)}...`,
                req.userId ? req.userId.nombre : 'Sistema'
            );

            // Sumar a nueva
            await nuevaReserva.agregarPago(
                excedente,
                'Transferencia',
                `Transferencia recibida de reserva ${reservaOriginal._id.toString().substring(0, 8)}...`,
                req.userId ? req.userId.nombre : 'Sistema'
            );
        }

        res.json({
            message: 'Reserva dividida exitosamente',
            reservaOriginal,
            nuevaReserva
        });

    } catch (error) {
        console.error('❌ Error al dividir reserva:', error);
        res.status(500).json({
            message: 'Error al dividir la reserva',
            error: error.message
        });
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


// GET - Obtener una cancelación específica
router.get('/cancelaciones/:id', [
    verifyToken,
    isEncargado
], async (req, res) => {
    try {
        const cancelacion = await CancelacionReserva.findById(req.params.id);

        if (!cancelacion) {
            return res.status(404).json({ message: 'Cancelación no encontrada' });
        }

        res.json(cancelacion);
    } catch (error) {
        console.error('Error al obtener cancelación:', error);
        res.status(500).json({
            message: 'Error al obtener cancelación',
            error: error.message
        });
    }
});

// POST - Procesar reembolso de una cancelación
router.post('/cancelaciones/:id/reembolso', [
    verifyToken,
    isEncargado,
    body('metodoReembolso').notEmpty().withMessage('El método de reembolso es obligatorio'),
    body('metodoReembolso').isIn(['Efectivo', 'Transferencia', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Cheque']).withMessage('Método de reembolso inválido'),
    body('observaciones').optional().isLength({ max: 500 }).withMessage('Las observaciones no pueden exceder 500 caracteres')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const cancelacion = await CancelacionReserva.findById(req.params.id);

        if (!cancelacion) {
            return res.status(404).json({ message: 'Cancelación no encontrada' });
        }

        if (!cancelacion.puedeProcesarReembolso()) {
            return res.status(400).json({
                message: 'No se puede procesar el reembolso',
                estadoActual: cancelacion.estadoReembolso,
                montoPagado: cancelacion.montoPagado
            });
        }

        const { metodoReembolso, observaciones = '' } = req.body;
        const procesadoPor = req.userId ? req.userId.nombre : 'Sistema';

        // Procesar el reembolso
        await cancelacion.procesarReembolso(metodoReembolso, procesadoPor, observaciones);

        console.log('💰 Reembolso procesado:', {
            cancelacionId: cancelacion._id,
            reservaId: cancelacion.reservaId,
            monto: cancelacion.reembolso.monto,
            metodo: cancelacion.reembolso.metodoReembolso,
            procesadoPor: procesadoPor
        });

        res.json({
            message: 'Reembolso procesado correctamente',
            cancelacion: {
                _id: cancelacion._id,
                estadoReembolso: cancelacion.estadoReembolso,
                reembolso: cancelacion.reembolso
            }
        });
    } catch (error) {
        console.error('Error al procesar reembolso:', error);
        res.status(500).json({
            message: 'Error al procesar reembolso',
            error: error.message
        });
    }
});

// PATCH - Completar reembolso
router.patch('/cancelaciones/:id/reembolso/completar', [
    verifyToken,
    isEncargado
], async (req, res) => {
    try {
        const cancelacion = await CancelacionReserva.findById(req.params.id);

        if (!cancelacion) {
            return res.status(404).json({ message: 'Cancelación no encontrada' });
        }

        if (cancelacion.estadoReembolso !== 'Procesado') {
            return res.status(400).json({
                message: 'El reembolso debe estar en estado Procesado para completarlo',
                estadoActual: cancelacion.estadoReembolso
            });
        }

        await cancelacion.completarReembolso();

        console.log('✅ Reembolso completado:', {
            cancelacionId: cancelacion._id,
            monto: cancelacion.reembolso.monto,
            fechaCompletado: new Date()
        });

        res.json({
            message: 'Reembolso completado correctamente',
            cancelacion: {
                _id: cancelacion._id,
                estadoReembolso: cancelacion.estadoReembolso,
                reembolso: cancelacion.reembolso
            }
        });
    } catch (error) {
        console.error('Error al completar reembolso:', error);
        res.status(500).json({
            message: 'Error al completar reembolso',
            error: error.message
        });
    }
});

// PATCH - Cerrar cancelación sin reembolsar (marcar como rechazado)
router.patch('/cancelaciones/:id/cerrar-sin-reembolsar', [
    verifyToken,
    isEncargado,
    body('motivo').notEmpty().withMessage('El motivo es obligatorio'),
    body('motivo').isLength({ max: 500 }).withMessage('El motivo no puede exceder 500 caracteres')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const cancelacion = await CancelacionReserva.findById(req.params.id);

        if (!cancelacion) {
            return res.status(404).json({ message: 'Cancelación no encontrada' });
        }

        if (cancelacion.estadoReembolso !== 'Pendiente') {
            return res.status(400).json({
                message: 'Solo se pueden cerrar cancelaciones con estado Pendiente',
                estadoActual: cancelacion.estadoReembolso
            });
        }

        const procesadoPor = req.userId ? req.userId.nombre : 'Sistema';
        const { motivo } = req.body;

        // Cambiar estado a Rechazado y agregar observaciones
        cancelacion.estadoReembolso = 'Rechazado';
        cancelacion.reembolso = {
            monto: 0,
            metodoReembolso: 'N/A',
            fechaReembolso: new Date(),
            procesadoPor: procesadoPor,
            observaciones: `Cerrado sin reembolsar - Motivo: ${motivo}`
        };

        await cancelacion.save();

        console.log('🚫 Cancelación cerrada sin reembolsar:', {
            cancelacionId: cancelacion._id,
            reservaId: cancelacion.reservaId,
            motivo: motivo,
            procesadoPor: procesadoPor
        });

        res.json({
            message: 'Cancelación cerrada sin reembolsar',
            cancelacion: {
                _id: cancelacion._id,
                estadoReembolso: cancelacion.estadoReembolso,
                reembolso: cancelacion.reembolso
            }
        });
    } catch (error) {
        console.error('Error al cerrar cancelación:', error);
        res.status(500).json({
            message: 'Error al cerrar cancelación sin reembolsar',
            error: error.message
        });
    }
});

// DELETE - Eliminar una cancelación
router.delete('/cancelaciones/:id', [
    verifyToken,
    isEncargado
], async (req, res) => {
    try {
        const cancelacion = await CancelacionReserva.findById(req.params.id);

        if (!cancelacion) {
            return res.status(404).json({ message: 'Cancelación no encontrada' });
        }

        // Solo permitir eliminar cancelaciones que no hayan sido procesadas
        if (cancelacion.estadoReembolso === 'Procesado' || cancelacion.estadoReembolso === 'Completado') {
            return res.status(400).json({
                message: 'No se pueden eliminar cancelaciones con reembolsos procesados o completados',
                estadoActual: cancelacion.estadoReembolso,
                sugerencia: 'Si desea cerrar esta cancelación, use la opción "Cerrar sin reembolsar"'
            });
        }

        const reservaId = cancelacion.reservaId;
        const clienteNombre = `${cancelacion.cliente.nombre} ${cancelacion.cliente.apellido}`;

        await CancelacionReserva.findByIdAndDelete(req.params.id);

        console.log('🗑️ Cancelación eliminada:', {
            cancelacionId: req.params.id,
            reservaId: reservaId,
            cliente: clienteNombre,
            eliminadoPor: req.userId ? req.userId.nombre : 'Sistema'
        });

        res.json({
            message: 'Cancelación eliminada correctamente',
            cancelacionId: req.params.id
        });
    } catch (error) {
        console.error('Error al eliminar cancelación:', error);
        res.status(500).json({
            message: 'Error al eliminar cancelación',
            error: error.message
        });
    }
});

// GET - Estadísticas de reembolsos
router.get('/cancelaciones/estadisticas', [
    verifyToken,
    isEncargado
], async (req, res) => {
    try {
        console.log('🔍 Endpoint /cancelaciones/estadisticas llamado');

        // Verificar si el modelo existe
        if (!CancelacionReserva) {
            console.error('❌ Modelo CancelacionReserva no encontrado');
            return res.status(500).json({
                message: 'Modelo CancelacionReserva no disponible',
                error: 'Model not found'
            });
        }

        const estadisticas = await CancelacionReserva.aggregate([
            {
                $group: {
                    _id: '$estadoReembolso',
                    count: { $sum: 1 },
                    montoTotal: { $sum: '$montoPagado' }
                }
            }
        ]);

        const totalCancelaciones = await CancelacionReserva.countDocuments();
        const totalMontoReembolsos = await CancelacionReserva.aggregate([
            { $match: { estadoReembolso: { $in: ['Procesado', 'Completado'] } } },
            { $group: { _id: null, total: { $sum: '$montoPagado' } } }
        ]);

        console.log('✅ Estadísticas obtenidas:', {
            totalCancelaciones,
            estadisticas: estadisticas.length
        });

        res.json({
            estadisticas,
            totalCancelaciones,
            totalMontoReembolsos: totalMontoReembolsos[0]?.total || 0
        });
    } catch (error) {
        console.error('❌ Error al obtener estadísticas:', error);
        res.status(500).json({
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
});

// ============================================================================
// NUEVO: Endpoint para obtener ingresos agrupados por mes (usando historialPagos)
// ============================================================================
router.get('/ingresos/por-mes', [
    verifyToken,
    isUsuarioValido,
    query('fechaInicio')
        .notEmpty()
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('Formato de fechaInicio inválido (YYYY-MM-DD)'),
    query('fechaFin')
        .notEmpty()
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('Formato de fechaFin inválido (YYYY-MM-DD)'),
    manejarErroresValidacion
], async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query;

        console.log('📊 Backend - GET /ingresos/por-mes:', { fechaInicio, fechaFin });

        // Parsear fechas: el frontend envía YYYY-MM-DD en hora local
        // Necesitamos crear el rango considerando que las fechas en BD tienen offset UTC
        const [añoInicio, mesInicio, diaInicio] = fechaInicio.split('-').map(Number);
        const [añoFin, mesFin, diaFin] = fechaFin.split('-').map(Number);
        
        // Crear fechas en UTC para el rango (inicio del día y fin del día)
        const fechaInicioParsed = new Date(Date.UTC(añoInicio, mesInicio - 1, diaInicio, 0, 0, 0, 0));
        const fechaFinParsed = new Date(Date.UTC(añoFin, mesFin - 1, diaFin, 23, 59, 59, 999));

        console.log('📊 Backend - Fechas parseadas (UTC):', {
            fechaInicioParsed: fechaInicioParsed.toISOString(),
            fechaFinParsed: fechaFinParsed.toISOString(),
            rangoLocal: `${fechaInicioParsed.toLocaleString('es-AR')} - ${fechaFinParsed.toLocaleString('es-AR')}`
        });

        // Agregación: obtener ingresos por mes según fechaPago
        const ingresosPorMes = await Reserva.aggregate([
            {
                $match: {
                    estado: { $nin: ['Cancelada', 'No Show'] },
                    'historialPagos': { $exists: true, $ne: [] }
                }
            },
            {
                // Descomprimir historialPagos
                $unwind: '$historialPagos'
            },
            {
                // Filtrar por rango de fechas de pago
                $match: {
                    'historialPagos.fechaPago': {
                        $gte: fechaInicioParsed,
                        $lte: fechaFinParsed
                    }
                }
            },
            // DEBUG: Ver qué pagos se están incluyendo
            {
                $addFields: {
                    'historialPagos.fechaPagoStr': {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$historialPagos.fechaPago'
                        }
                    }
                }
            },
            {
                // Agrupar por mes
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m',
                            date: '$historialPagos.fechaPago'
                        }
                    },
                    totalIngresos: { $sum: '$historialPagos.monto' },
                    cantidad: { $sum: 1 },
                    // DEBUG: Incluir fechas de ejemplo
                    pagosMuestra: {
                        $push: {
                            fecha: '$historialPagos.fechaPagoStr',
                            monto: '$historialPagos.monto'
                        }
                    }
                }
            },
            {
                // Ordenar por mes ascendente
                $sort: { _id: 1 }
            }
        ]);

        console.log('✅ Ingresos por mes obtenidos:', ingresosPorMes.length, 'meses');
        console.log('📊 DEBUG - Detalle de ingresos:', JSON.stringify(ingresosPorMes, null, 2));

        res.json({
            ingresosPorMes: ingresosPorMes,
            totalIngresos: ingresosPorMes.reduce((sum, item) => sum + item.totalIngresos, 0),
            totalPagos: ingresosPorMes.reduce((sum, item) => sum + item.cantidad, 0)
        });
    } catch (error) {
        console.error('❌ Error al obtener ingresos por mes:', error);
        res.status(500).json({
            message: 'Error al obtener ingresos por mes',
            error: error.message
        });
    }
});

// ============================================================================
// NUEVO: Endpoint para obtener resumen anual de ingresos
// ============================================================================
router.get('/ingresos/anual', [
    verifyToken,
    isUsuarioValido,
    query('year')
        .notEmpty()
        .isInt({ min: 1900, max: 2100 })
        .withMessage('Año inválido'),
    manejarErroresValidacion
], async (req, res) => {
    try {
        const { year } = req.query;
        const yearInt = parseInt(year, 10);

        console.log('📊 Backend - GET /ingresos/anual:', { year: yearInt });

        // Crear rango para todo el año en UTC
        const fechaInicio = new Date(Date.UTC(yearInt, 0, 1, 0, 0, 0, 0));
        const fechaFin = new Date(Date.UTC(yearInt, 11, 31, 23, 59, 59, 999));

        console.log('📊 Backend - Fechas parseadas (UTC):', {
            fechaInicio: fechaInicio.toISOString(),
            fechaFin: fechaFin.toISOString()
        });

        // Agregación: obtener ingresos por mes para el año completo
        const ingresosPorMes = await Reserva.aggregate([
            {
                $match: {
                    estado: { $nin: ['Cancelada', 'No Show'] },
                    'historialPagos': { $exists: true, $ne: [] }
                }
            },
            {
                // Descomprimir historialPagos
                $unwind: '$historialPagos'
            },
            {
                // Filtrar por año
                $match: {
                    'historialPagos.fechaPago': {
                        $gte: fechaInicio,
                        $lte: fechaFin
                    }
                }
            },
            {
                // Agrupar por mes
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m',
                            date: '$historialPagos.fechaPago'
                        }
                    },
                    totalIngresos: { $sum: '$historialPagos.monto' },
                    cantidad: { $sum: 1 }
                }
            },
            {
                // Ordenar por mes ascendente
                $sort: { _id: 1 }
            }
        ]);

        // Calcular totales anuales
        const totalIngresos = ingresosPorMes.reduce((sum, item) => sum + item.totalIngresos, 0);
        const totalReservas = ingresosPorMes.reduce((sum, item) => sum + item.cantidad, 0);
        const promedioMensual = ingresosPorMes.length > 0 ? totalIngresos / 12 : 0;

        console.log('✅ Resumen anual obtenido:', {
            year: yearInt,
            meses: ingresosPorMes.length,
            totalIngresos,
            totalReservas
        });

        res.json({
            year: yearInt,
            totalIngresos,
            totalReservas,
            promedioMensual,
            ingresosPorMes: ingresosPorMes
        });
    } catch (error) {
        console.error('❌ Error al obtener resumen anual:', error);
        res.status(500).json({
            message: 'Error al obtener resumen anual',
            error: error.message
        });
    }
});

module.exports = router; 