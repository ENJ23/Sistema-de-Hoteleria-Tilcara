# Backend - Sistema de Hotelería

API REST para el sistema de gestión de reservas de hotel con autenticación y roles de usuario.

## Características

- **Autenticación JWT**: Sistema seguro de autenticación con tokens
- **Roles de Usuario**: Administrador y Empleado con diferentes niveles de acceso
- **Gestión de Clientes**: CRUD completo para clientes con permisos por rol
- **Gestión de Habitaciones**: CRUD con precios variables y estados
- **Gestión de Reservas**: Sistema completo de reservas con validación de conflictos
- **Validaciones**: Validación de datos, autenticación y autorización
- **API RESTful**: Endpoints bien estructurados y documentados

## Tecnologías

- Node.js
- Express.js
- MongoDB con Mongoose
- Express Validator
- JSON Web Tokens (JWT)
- Bcrypt para hashing de contraseñas
- CORS
- Dotenv para variables de entorno

## Instalación

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**:
   - Copiar `env.example` a `.env`
   - Configurar la conexión a MongoDB

3. **Instalar MongoDB** (si no está instalado):
   - Descargar e instalar MongoDB desde [mongodb.com](https://www.mongodb.com/try/download/community)
   - O usar MongoDB Atlas (servicio en la nube)

4. **Ejecutar el servidor**:
   ```bash
   # Desarrollo (con nodemon)
   npm run dev
   
   # Producción
   npm start
   ```

## Autenticación

### Registro de Usuarios
```
POST /api/auth/registro
```
**Cuerpo de la solicitud (solo admin):**
```json
{
  "nombre": "Nombre",
  "email": "usuario@ejemplo.com",
  "password": "contraseñaSegura123",
  "rol": "admin"
}
```

### Inicio de Sesión
```
POST /api/auth/login
```
**Cuerpo de la solicitud:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseñaSegura123"
}
```
**Respuesta exitosa:**
```json
{
  "id": "...",
  "nombre": "Nombre",
  "email": "usuario@ejemplo.com",
  "rol": "admin",
  "accessToken": "..."
}
```

## Estructura de la API

Las rutas están protegidas con autenticación JWT. Los roles disponibles son:
- **admin**: Acceso completo a todas las funcionalidades
- **empleado**: Acceso limitado a ciertas operaciones

### Autenticación
- `POST /api/auth/registro` - Registrar nuevo usuario (solo admin)
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/perfil` - Obtener perfil del usuario autenticado
- `GET /api/auth/verificar-token` - Verificar validez del token

### Clientes
- `GET /api/clientes` - Obtener todos los clientes (empleado/admin)
- `GET /api/clientes/:id` - Obtener cliente por ID (empleado/admin)
- `POST /api/clientes` - Crear nuevo cliente (abierto, con validaciones)
- `PUT /api/clientes/:id` - Actualizar cliente (empleado/admin)
- `DELETE /api/clientes/:id` - Eliminar cliente (solo admin)

### Habitaciones
- `GET /api/habitaciones` - Obtener todas las habitaciones
- `GET /api/habitaciones/disponibles` - Obtener habitaciones disponibles
- `GET /api/habitaciones/:id` - Obtener habitación por ID
- `POST /api/habitaciones` - Crear nueva habitación
- `PUT /api/habitaciones/:id` - Actualizar habitación
- `PATCH /api/habitaciones/:id/precio` - Actualizar precio
- `PATCH /api/habitaciones/:id/estado` - Cambiar estado
- `DELETE /api/habitaciones/:id` - Eliminar habitación

### Reservas
- `GET /api/reservas` - Obtener todas las reservas
- `GET /api/reservas/cliente/:clienteId` - Reservas por cliente
- `GET /api/reservas/habitacion/:habitacionId` - Reservas por habitación
- `GET /api/reservas/:id` - Obtener reserva por ID
- `POST /api/reservas` - Crear nueva reserva
- `PUT /api/reservas/:id` - Actualizar reserva
- `PATCH /api/reservas/:id/estado` - Cambiar estado de reserva
- `DELETE /api/reservas/:id` - Eliminar reserva

## Modelos de Datos

### Cliente
```javascript
{
  nombre: String (requerido),
  apellido: String (requerido),
  email: String (requerido, único),
  telefono: String (requerido),
  documento: String (requerido, único),
  direccion: String,
  fechaNacimiento: Date,
  nacionalidad: String,
  observaciones: String,
  activo: Boolean (default: true)
}
```

### Habitación
```javascript
{
  numero: String (requerido, único),
  tipo: String (Individual, Doble, Triple, Suite, Familiar),
  capacidad: Number (1-10),
  precioBase: Number,
  precioActual: Number,
  descripcion: String,
  servicios: [String],
  estado: String (Disponible, Ocupada, Mantenimiento, Reservada, Fuera de servicio),
  piso: Number,
  activa: Boolean (default: true),
  ultimaLimpieza: Date,
  observaciones: String
}
```

### Reserva
```javascript
{
  cliente: ObjectId (referencia a Cliente),
  habitacion: ObjectId (referencia a Habitación),
  fechaEntrada: Date (requerido),
  fechaSalida: Date (requerido),
  horaEntrada: String (HH:MM, default: 14:00),
  horaSalida: String (HH:MM, default: 11:00),
  precioPorNoche: Number,
  precioTotal: Number (calculado automáticamente),
  estado: String (Confirmada, Pendiente, Cancelada, Completada, No Show),
  metodoPago: String (Efectivo, Tarjeta de Crédito, etc.),
  pagado: Boolean (default: false),
  observaciones: String,
  creadoPor: String (default: 'Encargado')
}
```

## Validaciones

- **Conflictos de fechas**: El sistema verifica que no haya reservas superpuestas
- **Existencia de entidades**: Verifica que cliente y habitación existan
- **Estados válidos**: Valida estados de habitaciones y reservas
- **Formato de horas**: Valida formato HH:MM para horarios
- **Precios**: Valida que los precios sean números positivos

## Scripts Disponibles

- `npm start`: Ejecutar en producción
- `npm run dev`: Ejecutar en desarrollo con nodemon
- `npm test`: Ejecutar pruebas (pendiente de implementar)

## Puerto por Defecto

El servidor se ejecuta en el puerto 3000 por defecto, configurable mediante la variable de entorno `PORT`. 