require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Conectar a la base de datos
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hoteleria';

async function resetAdmin() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');

    const Usuario = require('../models/Usuario');
    
    // Eliminar el usuario admin si existe
    await Usuario.deleteMany({ email: 'admin@hotel.com' });
    
    // Crear un nuevo usuario admin
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Admin123!', salt);
    
    const admin = new Usuario({
      nombre: 'Administrador',
      email: 'admin@hotel.com',
      password: 'Admin123!', // Se hasheará automáticamente por el pre-save hook
      rol: 'admin',
      activo: true
    });
    
    await admin.save();
    
    console.log('\n✅ Usuario administrador restablecido correctamente');
    console.log('--------------------------------');
    console.log('📧 Email: admin@hotel.com');
    console.log('🔑 Contraseña: Admin123!');
    console.log('--------------------------------');
    
    // Verificar la contraseña
    const user = await Usuario.findOne({ email: 'admin@hotel.com' });
    const isMatch = await bcrypt.compare('Admin123!', user.password);
    console.log('\n🔑 Verificación de contraseña:');
    console.log('--------------------------------');
    console.log('Contraseña "Admin123!" es válida:', isMatch);
    
    if (!isMatch) {
      console.log('\n⚠️  Error: La contraseña no coincide después de guardar');
      console.log('Hash almacenado:', user.password);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar la función
resetAdmin();
