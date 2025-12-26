# 📋 Sistema de Auditoría de Reservas

## 🎯 Descripción General

Se ha implementado un **sistema completo de auditoría** que registra automáticamente todos los cambios realizados en las reservas del sistema hotelero, con especial énfasis en prevenir y rastrear cambios accidentales por **Drag & Drop**.

---

## ✅ Características Implementadas

### 1. **Registro Automático de Cambios**

Todos los cambios en reservas quedan registrados en el campo `historialCambios` con:
- ✅ Fecha y hora exacta
- ✅ Usuario que realizó el cambio
- ✅ Rol del usuario
- ✅ Tipo de acción (Drag & Drop, Modificación Manual, Check-in/out, etc.)
- ✅ Detalles específicos del cambio (qué se cambió: fechas, habitación, precios)
- ✅ Estados anterior y nuevo

### 2. **Tipos de Acciones Registradas**

- **Creación**: Cuando se crea una nueva reserva
- **Movimiento de Reserva (Drag & Drop)**: Cambios realizados arrastrando reservas en el calendario
- **Modificación Manual**: Ediciones directas desde el formulario
- **Cambio de Estado**: Confirmación, check-in, check-out, cancelación
- **Registro de Pago**: Cuando se añade o edita un pago
- **Reembolso**: Cuando se procesa una devolución

### 3. **Confirmación de Seguridad en Drag & Drop**

Antes de mover una reserva mediante drag & drop, el sistema:
1. Muestra un diálogo de confirmación con:
   - Nombre del cliente
   - Habitación original → Habitación nueva
   - Fechas originales → Fechas nuevas
2. Requiere confirmación explícita del usuario
3. Advierte que el cambio quedará registrado en auditoría
4. Si se cancela, restaura visualmente el calendario

**Ejemplo de confirmación:**
```
⚠️ CONFIRMACIÓN DE CAMBIO

Reserva: Juan Pérez
Habitación: 101 → 205
Fechas: 2025-01-15 / 2025-01-18 → 2025-01-20 / 2025-01-23

¿Confirma este cambio? Esta acción quedará registrada en el historial de auditoría.
```

### 4. **Página de Auditoría de Reservas**

Nueva página accesible desde:
- **Menú Principal**: Reportes → Auditoría de Reservas
- **Home**: Botón "AUDITORÍA" en el header
- **Página de Reservas**: Botón "AUDITORÍA RESERVAS"

**URL**: `/auditoria-reservas`

**Funcionalidades:**
- 📊 Vista de tabla con todos los cambios registrados
- 🔍 Filtros avanzados:
  - Tipo de acción
  - Usuario
  - Rango de fechas
- 📄 Paginación (10, 20, 50, 100 registros por página)
- 💾 Exportación a CSV
- 👁️ Enlace directo a ver la reserva completa
- 🎨 Código de colores según tipo de acción

### 5. **Endpoint Backend**

**Nuevo endpoint**: `GET /api/reservas/auditoria/historial`

**Parámetros opcionales:**
- `fechaInicio`: Filtrar desde fecha
- `fechaFin`: Filtrar hasta fecha
- `accion`: Tipo de acción (ej: "Drag & Drop")
- `usuario`: Nombre del usuario
- `page`: Página actual
- `limit`: Registros por página

**Respuesta:**
```json
{
  "historial": [
    {
      "reservaId": "abc123",
      "cliente": {
        "nombre": "Juan",
        "apellido": "Pérez"
      },
      "habitacion": {
        "numero": "101",
        "tipo": "Doble"
      },
      "fechaEntrada": "2025-01-15",
      "fechaSalida": "2025-01-18",
      "estado": "Confirmada",
      "cambio": {
        "fecha": "2025-12-25T10:30:00Z",
        "usuario": "Admin Principal",
        "rol": "encargado",
        "accion": "Movimiento de Reserva (Drag & Drop)",
        "detalles": "Fecha Entrada: 15/01/2025 → 20/01/2025 | Fecha Salida: 18/01/2025 → 23/01/2025 | Habitación: 101 → 205",
        "estadoAnterior": "Confirmada",
        "estadoNuevo": "Confirmada"
      }
    }
  ],
  "total": 150,
  "page": 1,
  "totalPages": 8
}
```

---

## 🗂️ Archivos Creados/Modificados

### Backend
- **Modificado**: `Backend-Hoteleria/routes/reservas.js`
  - Mejorado registro de cambios en `PUT /reservas/:id`
  - Nuevo endpoint `GET /reservas/auditoria/historial`
  - Detección automática de cambios por Drag & Drop

### Frontend - Servicios
- **Creado**: `Frontend-Hoteleria/src/app/services/auditoria.service.ts`
  - Servicio para comunicación con endpoint de auditoría

### Frontend - Componente de Auditoría
- **Creado**: `Frontend-Hoteleria/src/app/pages/auditoria-reservas/auditoria-reservas.component.ts`
- **Creado**: `Frontend-Hoteleria/src/app/pages/auditoria-reservas/auditoria-reservas.component.html`
- **Creado**: `Frontend-Hoteleria/src/app/pages/auditoria-reservas/auditoria-reservas.component.scss`

### Frontend - Navegación
- **Modificado**: `Frontend-Hoteleria/src/app/app.routes.ts` - Nueva ruta
- **Modificado**: `Frontend-Hoteleria/src/app/components/layout/header/header.component.html` - Enlace en menú
- **Modificado**: `Frontend-Hoteleria/src/app/pages/home/home.component.html` - Botón de acceso rápido
- **Modificado**: `Frontend-Hoteleria/src/app/pages/home/home.component.clean.ts` - Método de navegación
- **Modificado**: `Frontend-Hoteleria/src/app/pages/reservas/reservas.component.ts` - Método de navegación

---

## 🚀 Cómo Usar

### 1. **Acceder a la Auditoría**

**Opción A - Desde el Menú:**
1. Click en "Reportes" en el menú superior
2. Seleccionar "Auditoría de Reservas"

**Opción B - Desde Home:**
1. Click en el botón morado "AUDITORÍA" en el header del dashboard

**Opción C - Desde Reservas:**
1. Ir a la página de Reservas
2. Click en "AUDITORÍA RESERVAS"

### 2. **Filtrar Registros**

1. Seleccionar tipo de acción (opcional)
2. Ingresar nombre de usuario (opcional)
3. Seleccionar rango de fechas
4. Click en "BUSCAR"

### 3. **Ver Detalles de una Reserva**

1. Localizar el registro en la tabla
2. Click en el icono de ojo (👁️) en la columna "Acciones"
3. Se abrirá la página de reservas con la reserva seleccionada

### 4. **Exportar Datos**

1. Aplicar filtros deseados
2. Click en "EXPORTAR CSV"
3. El archivo se descargará automáticamente

---

## 🔒 Seguridad

### Permisos
- ✅ Solo usuarios autenticados pueden acceder
- ✅ Solo encargados/administradores pueden ver la auditoría completa
- ✅ Los cambios son inmutables (no se pueden editar o eliminar)

### Prevención de Cambios Accidentales
- ⚠️ Confirmación obligatoria en Drag & Drop
- 📝 Mensaje claro mostrando qué se va a cambiar
- 🔄 Restauración visual si se cancela
- 📋 Registro detallado de quién, cuándo y qué cambió

---

## 📊 Beneficios

1. **Transparencia Total**: Todos los cambios quedan registrados
2. **Responsabilidad**: Se sabe quién hizo cada cambio
3. **Auditoría Legal**: Cumplimiento de requisitos de trazabilidad
4. **Prevención de Errores**: Confirmación antes de cambios críticos
5. **Resolución de Conflictos**: Histórico completo para investigar discrepancias
6. **Análisis de Operaciones**: Identificar patrones en modificaciones

---

## 🎨 Visualización

Los cambios se muestran con códigos de color:

- 🔵 **Azul (Primary)**: Creación, Check-in, Check-out
- 🔴 **Rojo (Warn)**: Drag & Drop (cambios de posición)
- 🟣 **Morado (Accent)**: Cancelaciones, Pagos
- ⚪ **Blanco**: Modificaciones manuales estándar

---

## 📝 Notas Técnicas

### Rendimiento
- Paginación en backend para grandes volúmenes de datos
- Índices en MongoDB sobre `historialCambios.fecha` para búsquedas rápidas
- Cache de 8 segundos en frontend para reducir llamadas

### Escalabilidad
- Agregación de MongoDB para consultas eficientes
- Límite de 100 registros por request por defecto
- Filtros optimizados a nivel de base de datos

---

## 🐛 Troubleshooting

### "No se encontraron registros"
- Verificar que hay reservas modificadas en el rango de fechas
- Ampliar el rango de fechas
- Limpiar filtros y buscar de nuevo

### "Error 401 - Sesión expirada"
- Volver a iniciar sesión
- Verificar permisos de usuario

### "Error 404 - Endpoint no disponible"
- Verificar que el backend esté actualizado
- Revisar que el endpoint `/reservas/auditoria/historial` exista

---

## 🔮 Mejoras Futuras Sugeridas

- [ ] Notificaciones en tiempo real cuando hay cambios
- [ ] Dashboard de estadísticas de cambios
- [ ] Filtro por habitación específica
- [ ] Comparación visual antes/después
- [ ] Alertas automáticas para cambios sospechosos
- [ ] Integración con sistema de notificaciones por email
- [ ] Exportación a PDF con formato profesional

---

**Versión**: 1.0.0  
**Fecha de Implementación**: Diciembre 25, 2025  
**Desarrollado por**: Sistema de IA Copilot
