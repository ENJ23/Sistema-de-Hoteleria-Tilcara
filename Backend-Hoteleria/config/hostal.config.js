// Configuración específica para Hostal - Sistema simplificado para encargados

module.exports = {
  // Configuración del Hostal
  HOSTAL: {
    NOMBRE: 'Hostal del Centro',
    DIRECCION: 'Calle Principal 123',
    TELEFONO: '+54 11 1234-5678',
    EMAIL: 'info@hostaldelcentro.com',
    HORARIO_CHECKIN: '14:00',
    HORARIO_CHECKOUT: '11:00',
    POLITICA_CANCELACION: '24 horas antes',
    CAPACIDAD_MAXIMA: 50,
    TIPOS_HABITACION: ['Individual', 'Doble', 'Triple', 'Familiar'],
    SERVICIOS_INCLUIDOS: ['WiFi', 'Desayuno', 'Limpieza diaria', 'Toallas'],
    METODOS_PAGO: ['Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia']
  },

  // Configuración de Precios Base (por tipo de habitación)
  PRECIOS_BASE: {
    'Individual': 15000,
    'Doble': 25000,
    'Triple': 35000,
    'Familiar': 45000
  },

  // Configuración de Temporadas
  TEMPORADAS: {
    BAJA: {
      nombre: 'Temporada Baja',
      multiplicador: 0.8,
      meses: [5, 6, 7, 8] // Mayo a Agosto
    },
    MEDIA: {
      nombre: 'Temporada Media',
      multiplicador: 1.0,
      meses: [3, 4, 9, 10] // Marzo, Abril, Septiembre, Octubre
    },
    ALTA: {
      nombre: 'Temporada Alta',
      multiplicador: 1.3,
      meses: [11, 12, 1, 2] // Noviembre a Febrero
    }
  },

  // Configuración de Estados de Habitación
  ESTADOS_HABITACION: {
    DISPONIBLE: 'Disponible',
    OCUPADA: 'Ocupada',
    RESERVADA: 'Reservada',
    LIMPIEZA: 'Limpieza',
    MANTENIMIENTO: 'Mantenimiento',
    FUERA_SERVICIO: 'Fuera de servicio'
  },

  // Configuración de Estados de Reserva
  ESTADOS_RESERVA: {
    PENDIENTE: 'Pendiente',
    CONFIRMADA: 'Confirmada',
    EN_CURSO: 'En curso',
    COMPLETADA: 'Completada',
    CANCELADA: 'Cancelada',
    NO_SHOW: 'No Show'
  },

  // Configuración de Notificaciones
  NOTIFICACIONES: {
    CHECKIN_PENDIENTE: {
      titulo: 'Check-in Pendiente',
      mensaje: 'El cliente debe realizar check-in en las próximas 2 horas',
      tiempo: 2 // horas antes
    },
    CHECKOUT_PENDIENTE: {
      titulo: 'Check-out Pendiente',
      mensaje: 'El cliente debe realizar check-out en la próxima hora',
      tiempo: 1 // hora antes
    },
    LIMPIEZA_PENDIENTE: {
      titulo: 'Limpieza Pendiente',
      mensaje: 'La habitación necesita limpieza después del check-out',
      tiempo: 0 // inmediatamente después del check-out
    }
  },

  // Configuración de Reportes
  REPORTES: {
    DIARIOS: ['ocupacion', 'ingresos', 'checkins', 'checkouts'],
    SEMANALES: ['tendencias', 'habitaciones_populares', 'clientes_frecuentes'],
    MENSUALES: ['resumen_financiero', 'estadisticas_generales', 'proyecciones']
  },

  // Configuración de Seguridad
  SEGURIDAD: {
    INTENTOS_LOGIN_MAXIMOS: 3,
    TIEMPO_BLOQUEO: 15, // minutos
    LONGITUD_PASSWORD_MINIMA: 6,
    EXPIRACION_SESION: 24, // horas
    REQUIERE_CAMBIO_PASSWORD: false
  },

  // Configuración de Backup
  BACKUP: {
    AUTOMATICO: true,
    FRECUENCIA: 'diario', // diario, semanal, mensual
    RETENCION: 30, // días
    INCLUIR_IMAGENES: false
  },

  // Configuración de Integración
  INTEGRACION: {
    WHATSAPP: {
      habilitado: false,
      numero: '+54 11 1234-5678',
      mensaje_confirmacion: 'Su reserva ha sido confirmada para el {fecha} en habitación {numero}'
    },
    EMAIL: {
      habilitado: false,
      servidor: 'smtp.gmail.com',
      puerto: 587,
      usuario: 'reservas@hostaldelcentro.com'
    }
  },

  // Configuración de Impresión
  IMPRESION: {
    FORMATO_PAPEL: 'A4',
    INCLUIR_LOGO: true,
    INCLUIR_QR: false,
    COPIA_CLIENTE: true,
    COPIA_ADMINISTRACION: true
  },

  // Configuración de Calendario
  CALENDARIO: {
    VISTA_PREDETERMINADA: 'mes', // dia, semana, mes
    MOSTRAR_RESERVAS_PASADAS: false,
    MOSTRAR_HABITACIONES_VACIAS: true,
    COLORES_POR_ESTADO: {
      'Disponible': '#4caf50',
      'Ocupada': '#f44336',
      'Reservada': '#ff9800',
      'Limpieza': '#2196f3',
      'Mantenimiento': '#9c27b0',
      'Fuera de servicio': '#607d8b'
    }
  },

  // Configuración de Usuarios
  USUARIOS: {
    ROLES: {
      ENCARGADO: 'encargado',
      LIMPIEZA: 'limpieza',
      MANTENIMIENTO: 'mantenimiento'
    },
    PERMISOS: {
      encargado: ['reservas', 'habitaciones', 'clientes', 'reportes', 'configuracion'],
      limpieza: ['habitaciones', 'estado_limpieza'],
      mantenimiento: ['habitaciones', 'estado_mantenimiento']
    }
  }
}; 