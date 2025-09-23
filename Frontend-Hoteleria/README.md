# Sistema de Hotelería - Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.7.

## 📋 Guía de Estados de Ocupación

### 🏨 Estados de Habitación

| Estado | Color | Descripción |
|--------|-------|-------------|
| **Disponible** | 🟢 Verde claro | Habitación libre y lista para ocupar |
| **Ocupada** | 🔴 Rojo | Habitación actualmente ocupada por huésped |
| **Reservada** | 🟣 Morado | Habitación reservada para fecha futura |
| **Limpieza** | 🔵 Azul claro | Habitación en proceso de limpieza |
| **Mantenimiento** | 🟡 Rosa | Habitación en mantenimiento o reparación |
| **Finalizada** | ⚫ Gris | Reserva completada (check-out realizado) |

### 💰 Estados de Pago

#### **Ocupada**
- 🟢 **Verde**: Completamente pagada
- 🟡 **Amarillo**: Parcialmente pagada
- 🔴 **Rojo**: Sin pago

#### **Reservada**
- 🔵 **Cyan**: Completamente pagada
- 🟠 **Naranja**: Parcialmente pagada
- 🟣 **Morado**: Sin pago

#### **Finalizada**
- 🔵 **Azul**: Completamente pagada
- 🟡 **Amarillo**: Parcialmente pagada
- ⚫ **Gris**: Sin pago

### 🔄 Estados de Transición

| Tipo | Descripción | Visualización |
|------|-------------|---------------|
| **Solo Entrada** | Una reserva inicia | Mitad superior con color de la reserva entrante |
| **Solo Salida** | Una reserva termina | Mitad inferior con color de la reserva saliente |
| **Entrada y Salida** | Misma reserva | Color uniforme de la reserva |
| **Transición Múltiple** | Diferentes reservas | Mitad superior: reserva entrante, Mitad inferior: reserva saliente |

### 🎯 Flujo de Estados de Reserva

```
Pendiente → Confirmada → En curso → Finalizada
    ↓           ↓           ↓
  (Reserva)  (Check-in)  (Check-out)
```

### 📱 Indicadores Visuales

- **🔄 Ícono de transición**: Indica días con entrada/salida
- **💰 Círculo de pago**: Muestra estado de pago
- **⚠️ Indicador de urgencia**: Check-out pendiente para hoy
- **📊 Línea divisoria**: Separa colores en transiciones

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
