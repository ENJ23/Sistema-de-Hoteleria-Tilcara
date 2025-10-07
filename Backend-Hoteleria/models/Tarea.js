const mongoose = require('mongoose');

const tareaSchema = new mongoose.Schema({
  tipo: {
    type: String,
    required: true,
    enum: ['limpieza', 'mantenimiento', 'otro'],
    default: 'limpieza'
  },
  descripcion: {
    type: String,
    required: true,
    trim: true
  },
  habitacion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Habitacion',
    required: true
  },
  estado: {
    type: String,
    required: true,
    enum: ['pendiente', 'completada'],
    default: 'pendiente'
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaCompletada: {
    type: Date,
    default: null
  },
  creadoPor: {
    type: String,
    required: true,
    default: 'Sistema'
  },
  completadoPor: {
    type: String,
    default: null
  },
  observaciones: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
tareaSchema.index({ estado: 1, fechaCreacion: -1 });
tareaSchema.index({ habitacion: 1, estado: 1 });

// Middleware para actualizar fechaCompletada cuando se marca como completada
tareaSchema.pre('save', function(next) {
  if (this.isModified('estado') && this.estado === 'completada' && !this.fechaCompletada) {
    this.fechaCompletada = new Date();
  }
  next();
});

// Método estático para crear tarea de limpieza
tareaSchema.statics.crearTareaLimpieza = function(habitacionId, creadoPor = 'Sistema') {
  return this.create({
    tipo: 'limpieza',
    descripcion: `Limpieza en la habitación ${habitacionId}`,
    habitacion: habitacionId,
    creadoPor: creadoPor
  });
};

// Método estático para crear tarea de mantenimiento
tareaSchema.statics.crearTareaMantenimiento = function(habitacionId, descripcion, creadoPor = 'Sistema') {
  return this.create({
    tipo: 'mantenimiento',
    descripcion: descripcion || `Mantenimiento en la habitación ${habitacionId}`,
    habitacion: habitacionId,
    creadoPor: creadoPor
  });
};

module.exports = mongoose.model('Tarea', tareaSchema);
