const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, 'El nombre es obligatorio'],
        trim: true
    },
    apellido: {
        type: String,
        required: [true, 'El apellido es obligatorio'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'El email es obligatorio'],
        unique: true,
        lowercase: true,
        trim: true
    },
    telefono: {
        type: String,
        required: [true, 'El teléfono es obligatorio'],
        trim: true
    },
    documento: {
        type: String,
        required: [true, 'El documento es obligatorio'],
        unique: true,
        trim: true
    },
    direccion: {
        type: String,
        trim: true
    },
    fechaNacimiento: {
        type: Date
    },
    nacionalidad: {
        type: String,
        trim: true
    },
    observaciones: {
        type: String,
        trim: true
    },
    activo: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Índices para mejorar el rendimiento de las consultas
clienteSchema.index({ email: 1 });
clienteSchema.index({ documento: 1 });
clienteSchema.index({ nombre: 1, apellido: 1 });

module.exports = mongoose.model('Cliente', clienteSchema); 