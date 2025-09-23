require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const defaultAdmin = require('../config/defaultAdmin');

// Conectar a la base de datos
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hoteleria';

async function createAdminUser() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');

    // Verificar si ya existe un administrador
    const adminExists = await Usuario.findOne({ email: defaultAdmin.email });

    if (adminExists) {
      console.log('⚠️  Ya existe un usuario administrador con ese correo');
      process.exit(0);
    }

    // Crear hash de la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultAdmin.password, salt);

    // Crear el usuario administrador
    const adminUser = new Usuario({
      nombre: defaultAdmin.nombre,
      email: defaultAdmin.email,
      password: hashedPassword,
      rol: defaultAdmin.rol,
      activo: true,
    });

    await adminUser.save();
    console.log('✅ Usuario administrador creado exitosamente');
    console.log('📧 Email:', defaultAdmin.email);
    console.log('🔑 Contraseña:', defaultAdmin.password);
    console.log('🔐 Rol: Administrador');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al crear el usuario administrador:', error);
    process.exit(1);
  }
}

// Ejecutar la función
createAdminUser();
