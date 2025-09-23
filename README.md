# 🏨 Sistema de Gestión Hotelera

Sistema completo de gestión de reservas y habitaciones para hoteles y hostales, desarrollado con Angular y Node.js.

## 🚀 **Características Principales**

### **📋 Gestión de Reservas**
- ✅ Crear, editar y eliminar reservas
- ✅ Calendario de ocupación visual
- ✅ Check-in y check-out automatizado
- ✅ Sistema de pagos integrado
- ✅ Estados de reserva (Pendiente, Confirmada, En curso, Completada)

### **🏠 Gestión de Habitaciones**
- ✅ Administración completa de habitaciones
- ✅ Tipos de habitación (Individual, Doble, Suite, etc.)
- ✅ Estados de habitación (Disponible, Ocupada, Limpieza, Mantenimiento)
- ✅ Precios dinámicos por habitación

### **📊 Dashboard y Estadísticas**
- ✅ Resumen rápido de ocupación
- ✅ Estadísticas de ingresos
- ✅ Reservas pendientes de pago
- ✅ Métricas en tiempo real

### **👥 Gestión de Usuarios**
- ✅ Sistema de autenticación JWT
- ✅ Roles de usuario (Admin, Encargado)
- ✅ Seguridad robusta con rate limiting

## 🛠️ **Tecnologías Utilizadas**

### **Frontend**
- **Angular 19** - Framework principal
- **Angular Material** - Componentes UI
- **TypeScript** - Lenguaje de programación
- **RxJS** - Programación reactiva

### **Backend**
- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **MongoDB** - Base de datos NoSQL
- **Mongoose** - ODM para MongoDB
- **JWT** - Autenticación
- **bcryptjs** - Encriptación de contraseñas

### **Seguridad**
- **Helmet** - Headers de seguridad
- **CORS** - Control de acceso
- **Rate Limiting** - Protección contra ataques
- **Validación de entrada** - Sanitización de datos

## 📁 **Estructura del Proyecto**

```
Sistema de Hotelería/
├── Frontend-Hoteleria/          # Aplicación Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/      # Componentes reutilizables
│   │   │   ├── pages/          # Páginas principales
│   │   │   ├── services/       # Servicios de API
│   │   │   ├── guards/         # Guards de autenticación
│   │   │   └── models/         # Modelos de datos
│   │   └── environments/       # Configuraciones de entorno
│   ├── vercel.json             # Configuración Vercel
│   └── package.json
├── Backend-Hoteleria/           # API Node.js
│   ├── routes/                 # Rutas de la API
│   ├── models/                 # Modelos de MongoDB
│   ├── middlewares/            # Middlewares de seguridad
│   ├── config/                 # Configuraciones
│   ├── scripts/                # Scripts de utilidad
│   └── server.js               # Servidor principal
├── docker-compose.yml          # Orquestación Docker
├── DEPLOYMENT.md               # Guía de despliegue
└── VERCEL_DEPLOYMENT.md        # Guía de despliegue en Vercel
```

## 🚀 **Instalación y Configuración**

### **Requisitos Previos**
- Node.js 18.0.0+
- npm 8.0.0+
- MongoDB 6.0+
- Git

### **Instalación Local**

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/sistema-hoteleria.git
   cd sistema-hoteleria
   ```

2. **Instalar dependencias del Backend**
   ```bash
   cd Backend-Hoteleria
   npm install
   ```

3. **Instalar dependencias del Frontend**
   ```bash
   cd ../Frontend-Hoteleria
   npm install
   ```

4. **Configurar variables de entorno**
   ```bash
   # En Backend-Hoteleria/
   cp env.example .env
   # Editar .env con tus configuraciones
   ```

5. **Iniciar MongoDB**
   ```bash
   # En Windows
   net start MongoDB
   
   # En Linux/Mac
   sudo systemctl start mongod
   ```

6. **Iniciar el Backend**
   ```bash
   cd Backend-Hoteleria
   npm start
   ```

7. **Iniciar el Frontend**
   ```bash
   cd Frontend-Hoteleria
   npm start
   ```

8. **Acceder a la aplicación**
   - Frontend: http://localhost:4200
   - Backend: http://localhost:3000

## 🔧 **Configuración de Producción**

### **Despliegue en Vercel (Recomendado)**
```bash
# Instalar Vercel CLI
npm install -g vercel

# Desplegar Frontend
cd Frontend-Hoteleria
vercel --prod

# Desplegar Backend
cd ../Backend-Hoteleria
vercel --prod
```

### **Despliegue con Docker**
```bash
# Construir y ejecutar
docker-compose up -d --build
```

### **Despliegue Manual**
Ver [DEPLOYMENT.md](DEPLOYMENT.md) para instrucciones detalladas.

## 🔐 **Configuración de Seguridad**

### **Variables de Entorno Requeridas**
```env
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/hoteleria
JWT_SECRET=tu-jwt-secret-super-seguro
FRONTEND_URL=https://tu-dominio.com
```

### **Crear Usuario Administrador**
```bash
cd Backend-Hoteleria
node scripts/createAdmin.js
```

## 📊 **Funcionalidades del Sistema**

### **Dashboard Principal**
- Resumen de ocupación actual
- Reservas del día
- Ingresos diarios
- Reservas pendientes de pago

### **Calendario de Ocupación**
- Vista mensual de todas las habitaciones
- Estados visuales por colores
- Check-in/check-out directo desde el calendario
- Detección de conflictos de reservas

### **Gestión de Reservas**
- Formulario completo de reserva
- Validación de fechas y disponibilidad
- Sistema de pagos parciales
- Historial de pagos
- Estados de reserva automáticos

### **Administración de Habitaciones**
- CRUD completo de habitaciones
- Tipos y capacidades configurables
- Estados de mantenimiento y limpieza
- Precios dinámicos

## 🧪 **Testing**

### **Ejecutar Tests**
```bash
# Frontend
cd Frontend-Hoteleria
npm test

# Backend
cd Backend-Hoteleria
npm test
```

## 📈 **Monitoreo y Logs**

### **Logs del Sistema**
- Logs de aplicación en `Backend-Hoteleria/logs/`
- Logs de seguridad automáticos
- Monitoreo de errores y performance

### **Métricas Disponibles**
- Ocupación por habitación
- Ingresos por período
- Reservas por estado
- Usuarios activos

## 🤝 **Contribución**

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 **Licencia**

Este proyecto está bajo la Licencia ISC. Ver el archivo `LICENSE` para más detalles.

## 📞 **Soporte**

Para soporte técnico o reportar problemas:
- **Issues**: [GitHub Issues](https://github.com/tu-usuario/sistema-hoteleria/issues)
- **Email**: soporte@tu-dominio.com
- **Documentación**: [Wiki del proyecto](https://github.com/tu-usuario/sistema-hoteleria/wiki)

## 🎯 **Roadmap**

### **Próximas Características**
- [ ] Sistema de notificaciones por email
- [ ] Reportes avanzados y exportación
- [ ] Integración con sistemas de pago
- [ ] App móvil (React Native)
- [ ] Sistema de inventario
- [ ] Integración con sistemas de limpieza

---

**¡Sistema listo para producción!** 🎉

Desarrollado con ❤️ para la gestión hotelera moderna.