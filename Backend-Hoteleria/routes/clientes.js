const express = require('express');
const router = express.Router();
const Cliente = require('../models/Cliente');
const { body, validationResult } = require('express-validator');
const { verifyToken, isEncargado, isUsuarioValido } = require('../middlewares/authJwt');

// GET - Obtener todos los clientes (solo personal autorizado)
router.get('/', [
    verifyToken,
    isUsuarioValido
], async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        
        let query = { activo: true };
        
        if (search) {
            query.$or = [
                { nombre: { $regex: search, $options: 'i' } },
                { apellido: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { documento: { $regex: search, $options: 'i' } }
            ];
        }
        
        const clientes = await Cliente.find(query)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });
            
        const total = await Cliente.countDocuments(query);
        
        res.json({
            clientes,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener clientes', error: error.message });
    }
});

// GET - Obtener un cliente por ID (solo personal autorizado)
router.get('/:id', [
    verifyToken,
    isUsuarioValido
], async (req, res) => {
    try {
        const cliente = await Cliente.findById(req.params.id);
        if (!cliente) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }
        res.json(cliente);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener cliente', error: error.message });
    }
});

// POST - Crear un nuevo cliente (cualquiera puede crear un cliente, pero se requiere autenticación para ciertos campos)
router.post('/', [
    // Autenticación requerida solo para ciertos campos
    (req, res, next) => {
        // Si el cliente incluye campos sensibles, requerir autenticación
        const camposSensibles = ['puntos', 'categoria', 'notasInternas'];
        const incluyeCamposSensibles = Object.keys(req.body).some(campo => camposSensibles.includes(campo));
        
        if (incluyeCamposSensibles) {
            return verifyToken(req, res, () => isUsuarioValido(req, res, next));
        }
        next();
    },
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('apellido').notEmpty().withMessage('El apellido es obligatorio'),
    body('email').isEmail().withMessage('Email inválido'),
    body('telefono').notEmpty().withMessage('El teléfono es obligatorio'),
    body('documento').notEmpty().withMessage('El documento es obligatorio')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const cliente = new Cliente(req.body);
        await cliente.save();
        res.status(201).json(cliente);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Ya existe un cliente con ese email o documento' });
        }
        res.status(500).json({ message: 'Error al crear cliente', error: error.message });
    }
});

// PUT - Actualizar un cliente (solo personal autorizado)
router.put('/:id', [
    verifyToken,
    isUsuarioValido,
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    body('apellido').notEmpty().withMessage('El apellido es obligatorio'),
    body('email').isEmail().withMessage('Email inválido'),
    body('telefono').notEmpty().withMessage('El teléfono es obligatorio'),
    body('documento').notEmpty().withMessage('El documento es obligatorio')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const cliente = await Cliente.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!cliente) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }
        
        res.json(cliente);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Ya existe un cliente con ese email o documento' });
        }
        res.status(500).json({ message: 'Error al actualizar cliente', error: error.message });
    }
});

// DELETE - Eliminar un cliente (marcar como inactivo) - Solo encargado
router.delete('/:id', [
    verifyToken,
    isEncargado
], async (req, res) => {
    try {
        const cliente = await Cliente.findByIdAndUpdate(
            req.params.id,
            { activo: false },
            { new: true }
        );
        
        if (!cliente) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }
        
        res.json({ message: 'Cliente eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar cliente', error: error.message });
    }
});

module.exports = router; 