const { body, validationResult } = require('express-validator');

// Función auxiliar para redondear a 2 decimales (evitar problemas de punto flotante)
function redondearMonto(monto) {
    return Math.round(monto * 100) / 100;
}

// Middleware para validar operaciones de pago
const validatePaymentOperation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            message: 'Datos de pago inválidos',
            errors: errors.array() 
        });
    }
    next();
};

// Validaciones para edición de pagos
const validateEditPayment = [
    body('monto')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('El monto debe ser mayor a 0'),
    
    body('metodoPago')
        .optional()
        .isIn(['Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia', 'PayPal'])
        .withMessage('Método de pago inválido'),
    
    body('observaciones')
        .optional()
        .isString()
        .isLength({ max: 500 })
        .withMessage('Las observaciones no pueden exceder 500 caracteres'),
    
    body('fechaPago')
        .optional()
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('La fecha debe tener formato YYYY-MM-DD'),
    
    body('motivo')
        .optional()
        .isString()
        .isLength({ max: 200 })
        .withMessage('El motivo no puede exceder 200 caracteres'),
    
    validatePaymentOperation
];

// Validaciones para agregar pagos
const validateAddPayment = [
    body('monto')
        .isFloat({ min: 0.01 })
        .withMessage('El monto debe ser mayor a 0'),
    
    body('metodoPago')
        .isIn(['Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia', 'PayPal'])
        .withMessage('Método de pago inválido'),
    
    body('observaciones')
        .optional()
        .isString()
        .isLength({ max: 500 })
        .withMessage('Las observaciones no pueden exceder 500 caracteres'),
    
    validatePaymentOperation
];

// Middleware para verificar permisos de pago
const checkPaymentPermissions = async (req, res, next) => {
    try {
        // Verificar que el usuario esté autenticado
        if (!req.userId) {
            return res.status(401).json({
                message: 'Se requiere autenticación para realizar operaciones de pago'
            });
        }

        // Verificar que el usuario tenga rol de encargado
        if (req.userId.rol !== 'encargado') {
            return res.status(403).json({
                message: 'Se requieren privilegios de encargado para realizar operaciones de pago'
            });
        }

        // Verificar que la reserva existe y obtener su estado
        const Reserva = require('../models/Reserva');
        const reserva = await Reserva.findById(req.params.id);
        
        if (!reserva) {
            return res.status(404).json({
                message: 'Reserva no encontrada'
            });
        }

        // Verificar que la reserva no esté en estado que impida modificaciones
        if (reserva.estado === 'Finalizada' || reserva.estado === 'Cancelada') {
            return res.status(400).json({
                message: `No se pueden modificar pagos de reservas con estado: ${reserva.estado}`
            });
        }

        // Agregar la reserva al request para uso posterior
        req.reserva = reserva;
        next();
    } catch (error) {
        console.error('Error en verificación de permisos de pago:', error);
        res.status(500).json({
            message: 'Error interno del servidor al verificar permisos'
        });
    }
};

// Middleware para validar límites de pago
const validatePaymentLimits = async (req, res, next) => {
    try {
        const reserva = req.reserva;
        const montoSolicitado = parseFloat(req.body.monto);
        
        if (isNaN(montoSolicitado)) {
            return res.status(400).json({
                message: 'El monto debe ser un número válido'
            });
        }

        // Calcular el monto máximo permitido
        let montoMaximo;
        
        if (req.method === 'PUT') {
            // Para edición: calcular basado en otros pagos
            const pagoId = req.params.pagoId;
            const pagoActual = reserva.historialPagos.find(p => p._id.toString() === pagoId);
            
            if (!pagoActual) {
                return res.status(404).json({
                    message: 'Pago no encontrado'
                });
            }
            
            const otrosPagos = reserva.montoPagado - pagoActual.monto;
            montoMaximo = reserva.precioTotal - otrosPagos;
        } else {
            // Para nuevo pago: usar monto restante
            montoMaximo = reserva.precioTotal - reserva.montoPagado;
        }

        if (montoSolicitado > montoMaximo) {
            return res.status(400).json({
                message: `El monto solicitado ($${montoSolicitado}) excede el máximo permitido ($${montoMaximo})`,
                montoMaximo: redondearMonto(montoMaximo),
                montoRestante: redondearMonto(reserva.precioTotal - reserva.montoPagado)
            });
        }

        next();
    } catch (error) {
        console.error('Error en validación de límites de pago:', error);
        res.status(500).json({
            message: 'Error interno del servidor al validar límites de pago'
        });
    }
};

// Middleware para logging de operaciones de pago
const logPaymentOperation = (operation) => {
    return (req, res, next) => {
        const originalSend = res.send;
        
        res.send = function(data) {
            // Log solo si la operación fue exitosa
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log(`💰 ${operation.toUpperCase()} - Pago:`, {
                    timestamp: new Date().toISOString(),
                    usuario: req.userId?.nombre || 'Desconocido',
                    usuarioId: req.userId?.id || 'N/A',
                    reservaId: req.params.id,
                    pagoId: req.params.pagoId || 'N/A',
                    operacion: operation,
                    ip: req.ip || req.connection.remoteAddress,
                    userAgent: req.get('User-Agent')
                });
            }
            
            originalSend.call(this, data);
        };
        
        next();
    };
};

module.exports = {
    validateEditPayment,
    validateAddPayment,
    checkPaymentPermissions,
    validatePaymentLimits,
    logPaymentOperation
};
