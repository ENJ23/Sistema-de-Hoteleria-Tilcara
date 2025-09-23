require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

// Conectar a la base de datos
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hoteleria';

async function checkUser() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');

    // Buscar el usuario administrador
    const Usuario = require('../models/Usuario');
    const user = await Usuario.findOne({ email: 'admin@hotel.com' });
    
    if (user) {
      console.log('\n🔍 Información del usuario:');
      console.log('--------------------------------');
      console.log(`ID: ${user._id}`);
      console.log(`Nombre: ${user.nombre}`);
      console.log(`Email: ${user.email}`);
      console.log(`Rol: ${user.rol}`);
      console.log(`Activo: ${user.activo}`);
      console.log(`Contraseña hash: ${user.password}`);
      console.log('--------------------------------');
      
      // Verificar la contraseña manualmente
      const bcrypt = require('bcryptjs');
      const isMatch = await bcrypt.compare('Admin123!', user.password);
      console.log('\n🔑 Verificación de contraseña:');
      console.log('--------------------------------');
      console.log('Contraseña "Admin123!" es válida:', isMatch);
      console.log('--------------------------------');
      
      if (!isMatch) {
        console.log('\n⚠️  La contraseña no coincide. Intentando con espacios...');
        const withSpaces = await bcrypt.compare('Admin123! ', user.password);
        console.log('Contraseña con espacio al final:', withSpaces);
        
        const withSpaceBefore = await bcrypt.compare(' Admin123!', user.password);
        console.log('Contraseña con espacio al inicio:', withSpaceBefore);
      }
    } else {
      console.log('❌ No se encontró el usuario administrador');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar la función
checkUser();
