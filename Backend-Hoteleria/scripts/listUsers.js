require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

// Conectar a la base de datos
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hoteleria';

async function listUsers() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');

    // Buscar todos los usuarios
    const Usuario = require('../models/Usuario');
    const users = await Usuario.find({});
    
    console.log(`\n🔍 Usuarios encontrados: ${users.length}`);
    console.log('--------------------------------');
    
    users.forEach((user, index) => {
      console.log(`Usuario ${index + 1}:`);
      console.log(`  ID: ${user._id}`);
      console.log(`  Nombre: ${user.nombre}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Rol: ${user.rol}`);
      console.log(`  Activo: ${user.activo}`);
      console.log('--------------------------------');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB:', error.message);
    process.exit(1);
  }
}

// Ejecutar la función
listUsers();
