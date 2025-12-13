const mongoose = require('mongoose');

// Modelo simple para locks
const LockSchema = new mongoose.Schema({
    resourceId: { type: String, required: true, unique: true },
    lockedBy: { type: String, required: true },
    lockedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }
}, { timestamps: true });

// Índice TTL para limpieza automática
LockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Lock = mongoose.model('Lock', LockSchema);

/**
 * Middleware para adquirir lock en operaciones críticas
 */
const acquireLock = async (resourceId, timeout = 5000, userId = 'system') => {
    const lockKey = `lock:${resourceId}`;
    const expiresAt = new Date(Date.now() + timeout);
    
    try {
        // Intentar crear lock
        const lock = new Lock({
            resourceId: lockKey,
            lockedBy: userId,
            expiresAt
        });
        
        await lock.save();
        console.log(`🔒 Lock adquirido para ${resourceId} por ${userId}`);
        return true;
    } catch (error) {
        if (error.code === 11000) { // Duplicate key error
            console.log(`⚠️ Lock ya existe para ${resourceId}`);
            return false;
        }
        throw error;
    }
};

/**
 * Middleware para liberar lock
 */
const releaseLock = async (resourceId) => {
    const lockKey = `lock:${resourceId}`;
    
    try {
        await Lock.deleteOne({ resourceId: lockKey });
        console.log(`🔓 Lock liberado para ${resourceId}`);
        return true;
    } catch (error) {
        console.error(`❌ Error al liberar lock para ${resourceId}:`, error);
        return false;
    }
};

/**
 * Middleware para verificar si un recurso está bloqueado
 */
const isLocked = async (resourceId) => {
    const lockKey = `lock:${resourceId}`;
    
    try {
        const lock = await Lock.findOne({ resourceId: lockKey });
        return !!lock;
    } catch (error) {
        console.error(`❌ Error al verificar lock para ${resourceId}:`, error);
        return false;
    }
};

/**
 * Middleware para operaciones que requieren lock
 */
const requireLock = (timeout = 5000) => {
    return async (req, res, next) => {
        const resourceId = req.params.id || req.body.habitacion || 'general';
        const userId = req.userId?.id || 'anonymous';
        
        const lockAcquired = await acquireLock(resourceId, timeout, userId);
        
        if (!lockAcquired) {
            return res.status(409).json({
                message: 'Operación en progreso',
                details: 'Esta operación está siendo procesada por otro usuario. Intenta nuevamente en unos segundos.'
            });
        }
        
        // Agregar función de liberación al request
        req.releaseLock = () => releaseLock(resourceId);
        
        next();
    };
};

/**
 * Middleware para liberar lock automáticamente
 */
const autoReleaseLock = (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
        // Liberar lock cuando se envía respuesta
        if (req.releaseLock) {
            req.releaseLock().catch(err => {
                console.error('Error al liberar lock automáticamente:', err);
            });
        }
        
        originalSend.call(this, data);
    };
    
    next();
};

module.exports = {
    acquireLock,
    releaseLock,
    isLocked,
    requireLock,
    autoReleaseLock
};








