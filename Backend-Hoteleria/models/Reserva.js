const mongoose = require('mongoose');

const reservaSchema = new mongoose.Schema({
    cliente: {
        nombre: {
            type: String,
            required: [true, 'El nombre del cliente es obligatorio'],
            trim: true
        },
        apellido: {
            type: String,
            required: [true, 'El apellido del cliente es obligatorio'],
            trim: true
        },
        email: {
            type: String,
            required: [true, 'El email del cliente es obligatorio'],
            trim: true
        },
        telefono: {
            type: String,
            required: [true, 'El teléfono del cliente es obligatorio'],
            trim: true
        },
        documento: {
            type: String,
            required: [true, 'El documento del cliente es obligatorio'],
            trim: true
        },
        direccion: {
            type: String,
            trim: true
        },
        nacionalidad: {
            type: String,
            trim: true
        }
    },
    habitacion: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Habitacion',
        required: [true, 'La habitación es obligatoria']
    },
    fechaEntrada: {
        type: Date,
        required: [true, 'La fecha de entrada es obligatoria']
    },
    fechaSalida: {
        type: Date,
        required: [true, 'La fecha de salida es obligatoria']
    },
    horaEntrada: {
        type: String,
        default: '14:00',
        validate: {
            validator: function(v) {
                return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: 'Formato de hora inválido (HH:MM)'
        }
    },
    horaSalida: {
        type: String,
        default: '11:00',
        validate: {
            validator: function(v) {
                return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: 'Formato de hora inválido (HH:MM)'
        }
    },
    precioPorNoche: {
        type: Number,
        required: [true, 'El precio por noche es obligatorio'],
        min: 0
    },
    precioTotal: {
        type: Number,
        default: 0,
        min: 0
    },
    estado: {
        type: String,
        enum: ['Confirmada', 'Pendiente', 'En curso', 'Cancelada', 'Completada', 'No Show', 'Finalizada'],
        default: 'Pendiente'
    },
    metodoPago: {
        type: String,
        enum: ['Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia', 'Otro'],
        default: 'Efectivo'
    },
    pagado: {
        type: Boolean,
        default: false
    },
    observaciones: {
        type: String,
        trim: true
    },
    // Campos para check-in/check-out
    horaCheckIn: {
        type: String,
        validate: {
            validator: function(v) {
                return !v || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: 'Formato de hora inválido (HH:MM)'
        }
    },
    fechaCheckIn: {
        type: Date
    },
    horaCheckOut: {
        type: String,
        validate: {
            validator: function(v) {
                return !v || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: 'Formato de hora inválido (HH:MM)'
        }
    },
    fechaCheckOut: {
        type: Date
    },
    // Campos para pagos
    montoPagado: {
        type: Number,
        default: 0,
        min: 0
    },
    historialPagos: [{
        monto: {
            type: Number,
            required: true,
            min: 0
        },
        metodoPago: {
            type: String,
            enum: ['Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia', 'PayPal'],
            required: true
        },
        fechaPago: {
            type: Date,
            default: Date.now
        },
        observaciones: {
            type: String,
            trim: true
        },
        registradoPor: {
            type: String,
            default: 'Encargado'
        }
    }],
    fechaPago: {
        type: Date
    },
    creadoPor: {
        type: String,
        default: 'Encargado'
    },
    fechaCreacion: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Índices para mejorar el rendimiento
reservaSchema.index({ cliente: 1 });
reservaSchema.index({ habitacion: 1 });
reservaSchema.index({ fechaEntrada: 1 });
reservaSchema.index({ fechaSalida: 1 });
reservaSchema.index({ estado: 1 });
reservaSchema.index({ fechaEntrada: 1, fechaSalida: 1 });

// Middleware para calcular el precio total automáticamente
reservaSchema.pre('save', function(next) {
    try {
        if (this.fechaEntrada && this.fechaSalida && this.precioPorNoche) {
            // Asegurar que las fechas sean objetos Date
            const fechaEntrada = new Date(this.fechaEntrada);
            const fechaSalida = new Date(this.fechaSalida);
            
            // Calcular días
            const diffTime = Math.abs(fechaSalida.getTime() - fechaEntrada.getTime());
            const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Calcular precio total
            this.precioTotal = dias * this.precioPorNoche;
            
            console.log('💰 Precio calculado:', {
                dias: dias,
                precioPorNoche: this.precioPorNoche,
                precioTotal: this.precioTotal
            });
        }
    } catch (error) {
        console.error('❌ Error al calcular precio total:', error);
    }
    next();
});

// Método para calcular el número de días
reservaSchema.methods.calcularDias = function() {
    if (this.fechaEntrada && this.fechaSalida) {
        return Math.ceil((this.fechaSalida - this.fechaEntrada) / (1000 * 60 * 60 * 24));
    }
    return 0;
};

// Método para verificar si hay conflicto de fechas
reservaSchema.methods.tieneConflicto = function(fechaEntrada, fechaSalida) {
    return (this.fechaEntrada < fechaSalida && this.fechaSalida > fechaEntrada);
};

// Método para calcular el monto restante
reservaSchema.methods.calcularMontoRestante = function() {
    return Math.max(0, this.precioTotal - this.montoPagado);
};

// Método para verificar si está completamente pagado
reservaSchema.methods.estaCompletamentePagado = function() {
    return this.montoPagado >= this.precioTotal;
};

// Método para agregar un pago al historial
reservaSchema.methods.agregarPago = function(monto, metodoPago, observaciones = '', registradoPor = 'Encargado') {
    this.historialPagos.push({
        monto: monto,
        metodoPago: metodoPago,
        fechaPago: new Date(),
        observaciones: observaciones,
        registradoPor: registradoPor
    });
    
    this.montoPagado += monto;
    this.pagado = this.estaCompletamentePagado();
    this.fechaPago = new Date();
    
    return this.save();
};

module.exports = mongoose.model('Reserva', reservaSchema); 