const mongoose = require('mongoose');

const cancelacionReservaSchema = new mongoose.Schema({
    // Referencia a la reserva original
    reservaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reserva',
        required: true
    },
    
    // Información del cliente al momento de la cancelación
    cliente: {
        nombre: {
            type: String,
            required: true,
            trim: true
        },
        apellido: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            trim: true
        },
        telefono: {
            type: String,
            trim: true
        },
        documento: {
            type: String,
            trim: true
        }
    },
    
    // Información de la habitación al momento de la cancelación
    habitacion: {
        numero: {
            type: String,
            required: true
        },
        tipo: {
            type: String,
            required: true
        }
    },
    
    // Fechas de la reserva cancelada
    fechaEntrada: {
        type: Date,
        required: true
    },
    fechaSalida: {
        type: Date,
        required: true
    },
    
    // Información financiera al momento de la cancelación
    precioTotal: {
        type: Number,
        required: true,
        min: 0
    },
    montoPagado: {
        type: Number,
        required: true,
        min: 0
    },
    montoRestante: {
        type: Number,
        required: true,
        min: 0
    },
    
    // Historial de pagos al momento de la cancelación
    historialPagos: [{
        monto: {
            type: Number,
            required: true,
            min: 0
        },
        metodoPago: {
            type: String,
            enum: ['Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia', 'Otro'],
            required: true
        },
        fechaPago: {
            type: Date,
            required: true
        },
        observaciones: {
            type: String,
            trim: true
        },
        registradoPor: {
            type: String,
            required: true
        }
    }],
    
    // Información de la cancelación
    motivoCancelacion: {
        type: String,
        required: true,
        trim: true
    },
    canceladoPor: {
        type: String,
        required: true,
        trim: true
    },
    fechaCancelacion: {
        type: Date,
        default: Date.now
    },
    
    // Estado del reembolso
    estadoReembolso: {
        type: String,
        enum: ['Pendiente', 'Procesado', 'Completado', 'Rechazado'],
        default: 'Pendiente'
    },
    
    // Información del reembolso
    reembolso: {
        monto: {
            type: Number,
            min: 0
        },
        metodoReembolso: {
            type: String,
            enum: ['Efectivo', 'Transferencia', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Cheque', 'N/A']
        },
        fechaReembolso: {
            type: Date
        },
        procesadoPor: {
            type: String,
            trim: true
        },
        observaciones: {
            type: String,
            trim: true
        }
    },
    
    // Auditoría
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware para actualizar updatedAt
cancelacionReservaSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Método para calcular el monto de reembolso
cancelacionReservaSchema.methods.calcularMontoReembolso = function() {
    return Math.max(0, this.montoPagado);
};

// Método para verificar si se puede procesar reembolso
cancelacionReservaSchema.methods.puedeProcesarReembolso = function() {
    return this.estadoReembolso === 'Pendiente' && this.montoPagado > 0;
};

// Método para procesar reembolso
cancelacionReservaSchema.methods.procesarReembolso = async function(metodoReembolso, procesadoPor, observaciones = '') {
    if (!this.puedeProcesarReembolso()) {
        throw new Error('No se puede procesar el reembolso en el estado actual');
    }
    
    const montoReembolso = this.calcularMontoReembolso();
    
    this.estadoReembolso = 'Procesado';
    this.reembolso = {
        monto: montoReembolso,
        metodoReembolso: metodoReembolso,
        fechaReembolso: new Date(),
        procesadoPor: procesadoPor,
        observaciones: observaciones
    };
    
    // Actualizar la reserva original para reflejar el reembolso
    const Reserva = require('./Reserva');
    const reservaOriginal = await Reserva.findById(this.reservaId);
    
    if (reservaOriginal) {
        console.log('🔍 Procesando reembolso - Estado antes:', {
            reservaId: reservaOriginal._id,
            montoPagadoAntes: reservaOriginal.montoPagado,
            historialPagosAntes: reservaOriginal.historialPagos.length
        });
        
        // Agregar entrada negativa al historial de pagos para registrar el reembolso
        reservaOriginal.historialPagos.push({
            monto: -montoReembolso, // Monto negativo para indicar reembolso
            metodoPago: metodoReembolso,
            fechaPago: new Date(),
            observaciones: `Reembolso por cancelación - ${observaciones}`,
            registradoPor: procesadoPor
        });
        
        // Recalcular el estado de pago
        await reservaOriginal.recalcularPagos();
        
        await reservaOriginal.save();
        
        console.log('💰 Reembolso procesado - Estado después:', {
            reservaId: reservaOriginal._id,
            montoPagadoDespues: reservaOriginal.montoPagado,
            historialPagosDespues: reservaOriginal.historialPagos.length,
            montoReembolsado: montoReembolso
        });
    }
    
    return this.save();
};

// Método para completar reembolso
cancelacionReservaSchema.methods.completarReembolso = function() {
    if (this.estadoReembolso !== 'Procesado') {
        throw new Error('El reembolso debe estar en estado Procesado para completarlo');
    }
    
    this.estadoReembolso = 'Completado';
    return this.save();
};

// Índices para optimizar consultas
cancelacionReservaSchema.index({ reservaId: 1 });
cancelacionReservaSchema.index({ fechaCancelacion: -1 });
cancelacionReservaSchema.index({ estadoReembolso: 1 });
cancelacionReservaSchema.index({ 'cliente.nombre': 1, 'cliente.apellido': 1 });

module.exports = mongoose.model('CancelacionReserva', cancelacionReservaSchema);
