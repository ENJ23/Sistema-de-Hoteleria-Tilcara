const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Tarea = require('../models/Tarea');
const Habitacion = require('../models/Habitacion');
const authJwt = require('../middlewares/authJwt');
const router = express.Router();

// Middleware de validación
const validarErrores = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: errores.array()
    });
  }
  next();
};

// Validaciones
const validarCrearTarea = [
  body('tipo')
    .isIn(['limpieza', 'mantenimiento', 'otro'])
    .withMessage('Tipo de tarea inválido'),
  body('descripcion')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Descripción debe tener entre 1 y 200 caracteres'),
  body('habitacion')
    .isMongoId()
    .withMessage('ID de habitación inválido'),
  body('creadoPor')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('CreadoPor debe tener máximo 50 caracteres')
];

const validarCompletarTarea = [
  param('id')
    .isMongoId()
    .withMessage('ID de tarea inválido'),
  body('completadoPor')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('CompletadoPor debe tener máximo 50 caracteres'),
  body('observaciones')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Observaciones debe tener máximo 500 caracteres'),
  body('configuracionCamas')
    .optional()
    .isArray()
    .withMessage('configuracionCamas debe ser un array'),
  body('configuracionCamas.*.tipo')
    .optional()
    .isIn(['matrimonial', 'single', 'doble', 'queen', 'king'])
    .withMessage('Tipo de cama inválido'),
  body('configuracionCamas.*.cantidad')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Cantidad debe ser un número mayor a 0')
];

// GET /api/tareas - Obtener todas las tareas
router.get('/', authJwt.verifyToken, async (req, res) => {
  try {
    const { estado, tipo, habitacion } = req.query;
    
    // Construir filtros
    const filtros = {};
    if (estado) filtros.estado = estado;
    if (tipo) filtros.tipo = tipo;
    if (habitacion) filtros.habitacion = habitacion;
    
    // Obtener tareas con información de habitación
    const tareas = await Tarea.find(filtros)
      .populate('habitacion', 'numero tipo estado')
      .sort({ fechaCreacion: -1 })
      .lean();
    
    // Formatear respuesta
    const tareasFormateadas = tareas.map(tarea => ({
      _id: tarea._id,
      tipo: tarea.tipo,
      descripcion: tarea.descripcion,
      habitacion: {
        _id: tarea.habitacion._id,
        numero: tarea.habitacion.numero,
        tipo: tarea.habitacion.tipo,
        activa: tarea.habitacion.activa
      },
      estado: tarea.estado,
      fechaCreacion: tarea.fechaCreacion,
      fechaCompletada: tarea.fechaCompletada,
      creadoPor: tarea.creadoPor,
      completadoPor: tarea.completadoPor,
      observaciones: tarea.observaciones,
      configuracionCamas: tarea.configuracionCamas,
      createdAt: tarea.createdAt,
      updatedAt: tarea.updatedAt
    }));
    
    res.json({
      success: true,
      data: tareasFormateadas,
      total: tareasFormateadas.length
    });
    
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// GET /api/tareas/pendientes - Obtener solo tareas pendientes
router.get('/pendientes', authJwt.verifyToken, async (req, res) => {
  try {
    const tareas = await Tarea.find({ estado: 'pendiente' })
      .populate('habitacion', 'numero tipo estado')
      .sort({ fechaCreacion: -1 })
      .lean();
    
    const tareasFormateadas = tareas.map(tarea => ({
      _id: tarea._id,
      tipo: tarea.tipo,
      descripcion: tarea.descripcion,
      habitacion: {
        _id: tarea.habitacion._id,
        numero: tarea.habitacion.numero,
        tipo: tarea.habitacion.tipo,
        estado: tarea.habitacion.estado
      },
      fechaCreacion: tarea.fechaCreacion,
      creadoPor: tarea.creadoPor,
      configuracionCamas: tarea.configuracionCamas
    }));
    
    res.json({
      success: true,
      data: tareasFormateadas,
      total: tareasFormateadas.length
    });
    
  } catch (error) {
    console.error('Error al obtener tareas pendientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/tareas - Crear nueva tarea
router.post('/', authJwt.verifyToken, validarCrearTarea, validarErrores, async (req, res) => {
  try {
    const { tipo, descripcion, habitacion, creadoPor } = req.body;
    
    // Verificar que la habitación existe
    const habitacionExiste = await Habitacion.findById(habitacion);
    if (!habitacionExiste) {
      return res.status(404).json({
        success: false,
        message: 'Habitación no encontrada'
      });
    }
    
    // Crear tarea
    const nuevaTarea = new Tarea({
      tipo,
      descripcion,
      habitacion,
      creadoPor: creadoPor || req.userId.nombre || 'Usuario'
    });
    
    await nuevaTarea.save();
    
    // Obtener tarea con información de habitación
    const tareaCompleta = await Tarea.findById(nuevaTarea._id)
      .populate('habitacion', 'numero tipo estado');
    
    res.status(201).json({
      success: true,
      message: 'Tarea creada exitosamente',
      data: tareaCompleta
    });
    
  } catch (error) {
    console.error('Error al crear tarea:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PATCH /api/tareas/:id/completar - Marcar tarea como completada
router.patch('/:id/completar', authJwt.verifyToken, validarCompletarTarea, validarErrores, async (req, res) => {
  try {
    const { id } = req.params;
    const { completadoPor, observaciones, configuracionCamas } = req.body;
    
    // Verificar que la tarea existe
    const tarea = await Tarea.findById(id);
    if (!tarea) {
      return res.status(404).json({
        success: false,
        message: 'Tarea no encontrada'
      });
    }
    
    // Verificar que no esté ya completada
    if (tarea.estado === 'completada') {
      return res.status(400).json({
        success: false,
        message: 'La tarea ya está completada'
      });
    }
    
    // Marcar como completada
    tarea.estado = 'completada';
    tarea.fechaCompletada = new Date();
    tarea.completadoPor = completadoPor || req.userId.nombre || 'Usuario';
    if (observaciones) tarea.observaciones = observaciones;
    if (configuracionCamas && Array.isArray(configuracionCamas)) {
      tarea.configuracionCamas = configuracionCamas;
    }
    
    await tarea.save();
    
    res.json({
      success: true,
      message: 'Tarea completada exitosamente',
      data: tarea
    });
    
  } catch (error) {
    console.error('Error al completar tarea:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// DELETE /api/tareas/:id - Eliminar tarea
router.delete('/:id', authJwt.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const tarea = await Tarea.findByIdAndDelete(id);
    if (!tarea) {
      return res.status(404).json({
        success: false,
        message: 'Tarea no encontrada'
      });
    }
    
    res.json({
      success: true,
      message: 'Tarea eliminada exitosamente'
    });
    
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// POST /api/tareas/limpieza/:habitacionId - Crear tarea de limpieza automática
router.post('/limpieza/:habitacionId', authJwt.verifyToken, async (req, res) => {
  try {
    const { habitacionId } = req.params;
    const creadoPor = req.userId.nombre || 'Sistema';
    
    // Verificar que la habitación existe
    const habitacion = await Habitacion.findById(habitacionId);
    if (!habitacion) {
      return res.status(404).json({
        success: false,
        message: 'Habitación no encontrada'
      });
    }
    
    // Crear tarea de limpieza
    const tarea = await Tarea.crearTareaLimpieza(habitacionId, creadoPor);
    
    // Obtener tarea con información de habitación
    const tareaCompleta = await Tarea.findById(tarea._id)
      .populate('habitacion', 'numero tipo estado');
    
    res.status(201).json({
      success: true,
      message: 'Tarea de limpieza creada exitosamente',
      data: tareaCompleta
    });
    
  } catch (error) {
    console.error('Error al crear tarea de limpieza:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;
