const mongoose = require('mongoose');

const habitacionSchema = new mongoose.Schema({
    numero: {
        type: String,
        required: [true, 'El número de habitación es obligatorio'],
        unique: true,
        trim: true
    },
    tipo: {
        type: String,
        required: [true, 'El tipo de habitación es obligatorio'],
        enum: ['Individual', 'Doble', 'Triple', 'Suite', 'Familiar'],
        default: 'Individual'
    },
    capacidad: {
        type: Number,
        required: [true, 'La capacidad es obligatoria'],
        min: 1,
        max: 10
    },
    precioBase: {
        type: Number,
        required: [true, 'El precio base es obligatorio'],
        min: 0
    },
    precioActual: {
        type: Number,
        required: [true, 'El precio actual es obligatorio'],
        min: 0
    },
    descripcion: {
        type: String,
        trim: true
    },
    servicios: [{
        type: String,
        trim: true
    }],
    estado: {
        type: String,
        enum: ['Disponible', 'Ocupada', 'Mantenimiento', 'Reservada', 'Fuera de servicio'],
        default: 'Disponible'
    },
    piso: {
        type: Number,
        required: [true, 'El piso es obligatorio'],
        min: 1
    },
    activa: {
        type: Boolean,
        default: true
    },
    ultimaLimpieza: {
        type: Date,
        default: Date.now
    },
    observaciones: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Índices para mejorar el rendimiento
habitacionSchema.index({ numero: 1 });
habitacionSchema.index({ estado: 1 });
habitacionSchema.index({ tipo: 1 });
habitacionSchema.index({ activa: 1 });

// Método para actualizar el precio
habitacionSchema.methods.actualizarPrecio = function(nuevoPrecio) {
    this.precioActual = nuevoPrecio;
    return this.save();
};

// Método para cambiar el estado
habitacionSchema.methods.cambiarEstado = function(nuevoEstado) {
    this.estado = nuevoEstado;
    return this.save();
};

// Método estático para calcular el estado dinámico de una habitación
habitacionSchema.statics.calcularEstadoDinamico = async function(habitacionId, fecha = new Date()) {
    const Reserva = require('./Reserva');
    
    // Buscar reservas activas para esta habitación en la fecha dada
    const reservasActivas = await Reserva.find({
        habitacion: habitacionId,
        estado: { $nin: ['Cancelada', 'Completada'] },
        fechaEntrada: { $lte: fecha },
        fechaSalida: { $gt: fecha }
    });
    
    if (reservasActivas.length === 0) {
        return 'Disponible';
    }
    
    // Si hay reservas activas, determinar el estado
    const reservaActiva = reservasActivas[0];
    
    if (reservaActiva.estado === 'En curso') {
        return 'Ocupada';
    } else if (reservaActiva.estado === 'Confirmada' || reservaActiva.estado === 'Pendiente') {
        return 'Reservada';
    }
    
    return 'Disponible';
};

// Método de instancia para obtener el estado dinámico
habitacionSchema.methods.obtenerEstadoDinamico = async function(fecha = new Date()) {
    return await this.constructor.calcularEstadoDinamico(this._id, fecha);
};

module.exports = mongoose.model('Habitacion', habitacionSchema); 