# Componente Nueva Reserva

## Descripción
Este componente permite crear nuevas reservas para el sistema de hostelería a través de un formulario completo y funcional.

## Características

### Funcionalidades Principales
- **Formulario completo de reserva** con todos los campos necesarios
- **Captura de datos del cliente** directamente en el formulario
- **Selección de habitaciones** con filtrado inteligente
- **Cálculo automático de precios** basado en fechas y tarifas
- **Validaciones en tiempo real** para todos los campos
- **Verificación de disponibilidad** de habitaciones
- **Navegación integrada** desde la página principal

### Campos del Formulario
1. **Información del Cliente**
   - Nombre y apellido (requeridos)
   - Email (requerido, con validación de formato)
   - Teléfono (requerido)
   - Documento de identidad (requerido)
   - Nacionalidad (opcional)
   - Dirección (opcional)

2. **Información de la Habitación**
   - Búsqueda y selección de habitación
   - Filtrado por número, tipo o estado

3. **Fechas y Horarios**
   - Fecha de entrada y salida
   - Hora de entrada y salida (por defecto 14:00 y 11:00)

4. **Información de Precios**
   - Precio por noche (se actualiza automáticamente)
   - Cálculo automático del precio total
   - Número de noches calculado automáticamente

5. **Estado y Pagos**
   - Estado de la reserva (Confirmada, Pendiente, etc.)
   - Indicador de pago
   - Método de pago (cuando está pagada)

6. **Observaciones**
   - Campo de texto para información adicional

### Validaciones Implementadas
- Campos requeridos
- Fechas válidas (entrada no anterior a hoy, salida posterior a entrada)
- Precio por noche mayor a 0
- Verificación de disponibilidad de habitación
- Validación de formato de fechas

### Integración con el Sistema
- **Ruta**: `/nueva-reserva`
- **Acceso**: Botón "Nueva Reserva" en la página principal
- **Navegación**: Desde celdas del calendario de ocupación
- **Servicios utilizados**: ReservaService, HabitacionService

## Uso

### Desde la Página Principal
1. Hacer clic en el botón "NUEVA RESERVA"
2. Se navega automáticamente al formulario
3. La fecha actual se pre-selecciona

### Desde el Calendario de Ocupación
1. Hacer clic en una celda del calendario
2. Confirmar la creación de reserva
3. Se navega al formulario con fecha y habitación pre-seleccionadas

### Parámetros de URL
- `fecha`: Fecha pre-seleccionada (formato ISO)
- `habitacion`: ID de habitación pre-seleccionada

## Estructura de Archivos

```
nueva-reserva/
├── nueva-reserva.component.ts      # Lógica del componente
├── nueva-reserva.component.html    # Template HTML
├── nueva-reserva.component.scss    # Estilos SCSS
├── index.ts                        # Exportaciones
└── README.md                       # Esta documentación
```

## Dependencias

### Angular Material
- MatCardModule
- MatFormFieldModule
- MatInputModule
- MatSelectModule
- MatButtonModule
- MatIconModule
- MatDatepickerModule
- MatNativeDateModule
- MatAutocompleteModule
- MatProgressSpinnerModule
- MatDividerModule
- MatTooltipModule

### Servicios
- ReservaService: Creación y gestión de reservas
- HabitacionService: Búsqueda y gestión de habitaciones

### Modelos
- ReservaCreate: Interfaz para crear reservas
- Habitacion: Modelo de habitación

## Flujo de Trabajo

1. **Carga inicial**: Se cargan clientes y habitaciones disponibles
2. **Configuración de observadores**: Se configuran los listeners para cambios en el formulario
3. **Verificación de parámetros**: Se procesan parámetros de URL si existen
4. **Interacción del usuario**: El usuario completa el formulario
5. **Validaciones**: Se validan todos los campos en tiempo real
6. **Verificación de disponibilidad**: Se verifica que la habitación esté disponible
7. **Creación de reserva**: Se envía la reserva al servidor
8. **Navegación**: Se redirige al dashboard con mensaje de éxito

## Responsive Design
- Diseño adaptativo para dispositivos móviles
- Layout flexible que se ajusta a diferentes tamaños de pantalla
- Navegación táctil optimizada

## Estilos y Temas
- Diseño moderno con Material Design
- Gradientes y sombras para profundidad visual
- Animaciones suaves para mejor UX
- Paleta de colores consistente con el sistema

## Manejo de Errores
- Validaciones en tiempo real
- Mensajes de error claros y específicos
- Snackbars para notificaciones
- Manejo de errores de red y servidor

## Próximas Mejoras
- [ ] Integración con calendario de disponibilidad
- [ ] Selección múltiple de habitaciones
- [ ] Plantillas de reserva predefinidas
- [ ] Historial de reservas del cliente
- [ ] Cálculo de descuentos y promociones
- [ ] Integración con sistema de pagos
