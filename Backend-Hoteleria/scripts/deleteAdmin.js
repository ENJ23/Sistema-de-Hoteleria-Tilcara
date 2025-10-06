require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

// Conectar a la base de datos
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hoteleria';

async function deleteAdmin() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');

    // Buscar y eliminar el usuario administrador
    const Usuario = require('../models/Usuario');
    const result = await Usuario.deleteOne({ email: 'encargado@hostal.com' });
    
    if (result.deletedCount > 0) {
      console.log('✅ Usuario administrador eliminado exitosamente');
    } else {
      console.log('⚠️  No se encontró el usuario administrador para eliminar');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al eliminar usuario:', error.message);
    process.exit(1);
  }
}

// Ejecutar la función
deleteAdmin();
