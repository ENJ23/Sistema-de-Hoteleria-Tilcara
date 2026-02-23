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
  },
  configuracionCamas: [{
    tipo: {
      type: String,
      enum: ['matrimonial', 'single', 'doble', 'queen', 'king'],
      required: true
    },
    cantidad: {
      type: Number,
      required: true,
      min: 1
    }
  }]
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
tareaSchema.statics.crearTareaLimpieza = async function(habitacionId, creadoPor = 'Sistema') {
  const Habitacion = mongoose.model('Habitacion');
  const habitacion = await Habitacion.findById(habitacionId).select('numero tipo');
  
  if (!habitacion) {
    throw new Error('Habitación no encontrada');
  }
  
  return this.create({
    tipo: 'limpieza',
    descripcion: `Limpieza requerida`,
    habitacion: habitacionId,
    creadoPor: creadoPor
  });
};

// Método estático para crear tarea de mantenimiento
tareaSchema.statics.crearTareaMantenimiento = async function(habitacionId, descripcion, creadoPor = 'Sistema') {
  const Habitacion = mongoose.model('Habitacion');
  const habitacion = await Habitacion.findById(habitacionId).select('numero tipo');
  
  if (!habitacion) {
    throw new Error('Habitación no encontrada');
  }
  
  return this.create({
    tipo: 'mantenimiento',
    descripcion: descripcion || `Mantenimiento requerido`,
    habitacion: habitacionId,
    creadoPor: creadoPor
  });
};

module.exports = mongoose.model('Tarea', tareaSchema);
