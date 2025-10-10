const express = require('express');
const router = express.Router();
const Habitacion = require('../models/Habitacion');
const { body, validationResult } = require('express-validator');
const { verifyToken, isEncargado, isUsuarioValido } = require('../middlewares/authJwt');

// GET - Obtener todas las habitaciones (acceso público, pero con datos limitados si no está autenticado)
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, estado = '', tipo = '', activa } = req.query;
        
        let query = {};
        
        // CORREGIDO: Solo filtrar por activa si se especifica explícitamente
        if (activa !== undefined) {
            query.activa = activa === 'true';
        }
        
        if (estado) {
            query.estado = estado;
        }
        
        if (tipo) {
            query.tipo = tipo;
        }
        
        const habitaciones = await Habitacion.find(query)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ numero: 1 });
            
        const total = await Habitacion.countDocuments(query);
        
        res.json({
            habitaciones,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener habitaciones', error: error.message });
    }
});

// GET - Obtener habitaciones disponibles (acceso público)
router.get('/disponibles', async (req, res) => {
    try {
        const { fechaEntrada, fechaSalida } = req.query;
        
        let query = { 
            activa: true, 
            estado: { $in: ['Disponible', 'Reservada'] } 
        };
        
        const habitaciones = await Habitacion.find(query).sort({ numero: 1 });
        res.json(habitaciones);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener habitaciones disponibles', error: error.message });
    }
});

// GET - Obtener habitaciones con estado dinámico
router.get('/estado-dinamico', async (req, res) => {
    try {
        const { fecha } = req.query;
        const fechaConsulta = fecha ? new Date(fecha) : new Date();
        
        const habitaciones = await Habitacion.find({ activa: true }).sort({ numero: 1 });
        
        // Calcular estado dinámico para cada habitación
        const habitacionesConEstado = await Promise.all(
            habitaciones.map(async (habitacion) => {
                const estadoDinamico = await habitacion.obtenerEstadoDinamico(fechaConsulta);
                return {
                    ...habitacion.toObject(),
                    estadoDinamico: estadoDinamico
                };
            })
        );
        
        res.json(habitacionesConEstado);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener habitaciones con estado dinámico', error: error.message });
    }
});

// GET - Obtener una habitación por ID (acceso público, pero con datos limitados si no está autenticado)
router.get('/:id', async (req, res) => {
    try {
        const habitacion = await Habitacion.findById(req.params.id);
        if (!habitacion) {
            return res.status(404).json({ message: 'Habitación no encontrada' });
        }
        res.json(habitacion);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener habitación', error: error.message });
    }
});

// POST - Crear una nueva habitación (solo encargado)
router.post('/', [
    verifyToken,
    isEncargado,
    body('numero').notEmpty().withMessage('El número de habitación es obligatorio'),
    body('tipo').isIn(['Individual', 'Doble', 'Triple', 'Suite', 'Familiar']).withMessage('Tipo de habitación inválido'),
    body('capacidad').isInt({ min: 1, max: 10 }).withMessage('La capacidad debe estar entre 1 y 10'),
    body('precioBase').isFloat({ min: 0, max: 500000 }).withMessage('El precio base debe estar entre 0 y 500000'),
    body('precioActual').isFloat({ min: 0, max: 500000 }).withMessage('El precio actual debe estar entre 0 y 500000'),
    body('piso').isInt({ min: 1 }).withMessage('El piso debe ser mayor a 0')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const habitacion = new Habitacion(req.body);
        await habitacion.save();
        res.status(201).json(habitacion);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Ya existe una habitación con ese número' });
        }
        res.status(500).json({ message: 'Error al crear habitación', error: error.message });
    }
});

// PUT - Actualizar una habitación (solo encargado)
router.put('/:id', [
    verifyToken,
    isEncargado,
    body('numero').notEmpty().withMessage('El número de habitación es obligatorio'),
    body('tipo').isIn(['Individual', 'Doble', 'Triple', 'Suite', 'Familiar']).withMessage('Tipo de habitación inválido'),
    body('capacidad').isInt({ min: 1, max: 10 }).withMessage('La capacidad debe estar entre 1 y 10'),
    body('precioBase').isFloat({ min: 0, max: 500000 }).withMessage('El precio base debe estar entre 0 y 500000'),
    body('precioActual').isFloat({ min: 0, max: 500000 }).withMessage('El precio actual debe estar entre 0 y 500000'),
    body('piso').isInt({ min: 1 }).withMessage('El piso debe ser mayor a 0')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const habitacion = await Habitacion.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!habitacion) {
            return res.status(404).json({ message: 'Habitación no encontrada' });
        }
        
        res.json(habitacion);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Ya existe una habitación con ese número' });
        }
        res.status(500).json({ message: 'Error al actualizar habitación', error: error.message });
    }
});

// PATCH - Actualizar precio de una habitación (solo encargado)
router.patch('/:id/precio', [
    verifyToken,
    isEncargado,
    body('precioActual').isFloat({ min: 0, max: 500000 }).withMessage('El precio debe estar entre 0 y 500000')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const habitacion = await Habitacion.findById(req.params.id);
        if (!habitacion) {
            return res.status(404).json({ message: 'Habitación no encontrada' });
        }
        
        habitacion.precioActual = req.body.precioActual;
        await habitacion.save();
        
        res.json(habitacion);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar precio', error: error.message });
    }
});

// PATCH - Cambiar estado de una habitación (encargado o personal autorizado)
router.patch('/:id/estado', [
    verifyToken,
    isUsuarioValido,
    body('estado').isIn(['Disponible', 'Ocupada', 'Mantenimiento', 'Reservada', 'Fuera de servicio']).withMessage('Estado inválido')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const habitacion = await Habitacion.findById(req.params.id);
        if (!habitacion) {
            return res.status(404).json({ message: 'Habitación no encontrada' });
        }
        
        habitacion.estado = req.body.estado;
        await habitacion.save();
        
        res.json(habitacion);
    } catch (error) {
        res.status(500).json({ message: 'Error al cambiar estado', error: error.message });
    }
});

// GET - Verificar si existe una habitación por número
router.get('/check-numero', [
    verifyToken,
    isEncargado
], async (req, res) => {
    try {
        const { numero, excludeId } = req.query;
        
        if (!numero) {
            return res.status(400).json({ message: 'El número de habitación es requerido' });
        }
        
        let query = { numero: numero, activa: true };
        
        // Excluir la habitación actual si se está editando
        if (excludeId) {
            query._id = { $ne: excludeId };
        }
        
        const habitacionExistente = await Habitacion.findOne(query);
        
        res.json({ exists: !!habitacionExistente });
    } catch (error) {
        res.status(500).json({ message: 'Error al verificar número de habitación', error: error.message });
    }
});

// GET - Verificar reservas activas de una habitación
router.get('/:id/reservas-activas', [
    verifyToken,
    isEncargado
], async (req, res) => {
    try {
        const habitacion = await Habitacion.findById(req.params.id);
        
        if (!habitacion) {
            return res.status(404).json({ message: 'Habitación no encontrada' });
        }
        
        const Reserva = require('../models/Reserva');
        const reservasActivas = await Reserva.find({
            habitacion: req.params.id,
            estado: { $nin: ['Cancelada', 'Completada', 'Finalizada'] }
        }).populate('cliente', 'nombre apellido email');
        
        res.json({
            habitacion: {
                id: habitacion._id,
                numero: habitacion.numero,
                tipo: habitacion.tipo
            },
            reservasActivas: reservasActivas.length,
            reservas: reservasActivas.map(r => ({
                id: r._id,
                estado: r.estado,
                fechaEntrada: r.fechaEntrada,
                fechaSalida: r.fechaSalida,
                cliente: r.cliente,
                precioTotal: r.precioTotal
            }))
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al verificar reservas activas', error: error.message });
    }
});

// DELETE - Eliminar una habitación (marcar como inactiva) - Solo encargado
router.delete('/:id', [
    verifyToken,
    isEncargado
], async (req, res) => {
    try {
        const habitacion = await Habitacion.findById(req.params.id);
        
        if (!habitacion) {
            return res.status(404).json({ message: 'Habitación no encontrada' });
        }
        
        // CORREGIDO: Validar que no tenga reservas activas
        const Reserva = require('../models/Reserva');
        const reservasActivas = await Reserva.find({
            habitacion: req.params.id,
            estado: { $nin: ['Cancelada', 'Completada', 'Finalizada'] }
        });
        
        if (reservasActivas.length > 0) {
            return res.status(400).json({ 
                message: 'No se puede eliminar la habitación porque tiene reservas activas',
                reservasActivas: reservasActivas.length,
                detalles: reservasActivas.map(r => ({
                    id: r._id,
                    estado: r.estado,
                    fechaEntrada: r.fechaEntrada,
                    fechaSalida: r.fechaSalida,
                    cliente: r.cliente.nombre
                }))
            });
        }
        
        // Si no hay reservas activas, marcar como inactiva
        const habitacionActualizada = await Habitacion.findByIdAndUpdate(
            req.params.id,
            { activa: false },
            { new: true }
        );
        
        res.json({ 
            message: 'Habitación eliminada correctamente',
            habitacion: habitacionActualizada
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar habitación', error: error.message });
    }
});

module.exports = router; 