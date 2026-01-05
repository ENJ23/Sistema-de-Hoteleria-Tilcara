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
habitacionSchema.index({ tipo: 1 });
habitacionSchema.index({ activa: 1 });

// Método para actualizar el precio
habitacionSchema.methods.actualizarPrecio = function(nuevoPrecio) {
    this.precioActual = nuevoPrecio;
    return this.save();
};

module.exports = mongoose.model('Habitacion', habitacionSchema); 