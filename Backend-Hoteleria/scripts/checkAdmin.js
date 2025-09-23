require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

// Conectar a la base de datos
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hoteleria';

async function checkAdmin() {
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
    
    if (admin) {
      console.log('\n🔍 Usuario administrador encontrado:');
      console.log('--------------------------------');
      console.log(`ID: ${admin._id}`);
      console.log(`Nombre: ${admin.nombre}`);
      console.log(`Email: ${admin.email}`);
      console.log(`Rol: ${admin.rol}`);
      console.log(`Activo: ${admin.activo}`);
      console.log('--------------------------------');
      console.log('🔑 Para iniciar sesión usa:');
      console.log(`📧 Email: admin@hotel.com`);
      console.log(`🔐 Contraseña: Admin123!`);
    } else {
      console.log('❌ No se encontró el usuario administrador');
      console.log('Ejecuta `node scripts/createAdmin.js` para crearlo');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB:', error.message);
    console.error('Asegúrate de que MongoDB esté en ejecución y accesible');
    process.exit(1);
  }
}

// Ejecutar la función
checkAdmin();
