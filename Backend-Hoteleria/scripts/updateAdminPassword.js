require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Conectar a la base de datos
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hoteleria';

async function updateAdminPassword() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');

    // Buscar el usuario administrador
    const Usuario = require('../models/Usuario');
    const admin = await Usuario.findOne({ email: 'admin@hotel.com' });
    
    if (!admin) {
      console.log('❌ No se encontró el usuario administrador');
      process.exit(1);
    }

    // Actualizar la contraseña
    const newPassword = 'Admin123!';
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
    
    await admin.save();
    
    console.log('✅ Contraseña actualizada correctamente');
    console.log('📧 Email: admin@hotel.com');
    console.log('🔑 Nueva contraseña: Admin123!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al actualizar la contraseña:', error.message);
    process.exit(1);
  }
}

// Ejecutar la función
updateAdminPassword();
