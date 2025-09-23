// Script de inicialización de MongoDB
db = db.getSiblingDB('hoteleria');

// Crear usuario para la aplicación
db.createUser({
  user: 'hoteleria_user',
  pwd: 'hoteleria_password',
  roles: [
    {
      role: 'readWrite',
      db: 'hoteleria'
    }
  ]
});

// Crear colecciones iniciales
db.createCollection('usuarios');
db.createCollection('habitaciones');
db.createCollection('reservas');
db.createCollection('clientes');

// Crear índices para optimizar consultas
db.habitaciones.createIndex({ "numero": 1 }, { unique: true });
db.reservas.createIndex({ "fechaEntrada": 1, "fechaSalida": 1 });
db.reservas.createIndex({ "habitacion": 1 });
db.reservas.createIndex({ "cliente": 1 });
db.usuarios.createIndex({ "email": 1 }, { unique: true });

print('✅ Base de datos inicializada correctamente');
