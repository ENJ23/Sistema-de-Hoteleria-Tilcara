// Archivo legacy: contenido deshabilitado para evitar compilación.
// Mantener solo para referencia histórica.
export {};
/*
    
    console.log('🔍 Procesando ocupación para mes:', this.mesActual.getMonth() + 1, this.mesActual.getFullYear());
        
        this.ocupacionHabitaciones = [];
        
        this.habitaciones.forEach(habitacion => {
          const ocupacion: OcupacionHabitacion = {
            habitacion: habitacion,
            ocupacionPorDia: {}
          };
          
          this.diasCalendario.forEach(dia => {
            if (dia.esMesActual) {
              const fechaStr = this.formatearFecha(dia.fecha);
              
              // Debugging específico para noviembre
              if (dia.fecha.getMonth() === 10) { // Noviembre es mes 10 (0-indexed)
                console.log('🔍 Procesando día de noviembre:', fechaStr, 'Habitación:', habitacion.numero);
              }
              
              // Buscar reservas para esta habitación en esta fecha
          const reservasHabitacion = response.reservas.filter((reserva: any) => {
                const habitacionReserva = typeof reserva.habitacion === 'string' ? null : reserva.habitacion;
            
            if (!habitacionReserva || habitacionReserva.numero !== habitacion.numero) {
              return false;
            }
            
            const fechaStr = this.formatearFecha(dia.fecha);
            const fechaEntradaStr = reserva.fechaEntrada.split('T')[0];
            const fechaSalidaStr = reserva.fechaSalida.split('T')[0];
            
            // Verificar si está en el rango normal
            const enRango = this.fechaEnRango(dia.fecha, reserva.fechaEntrada, reserva.fechaSalida);
            
            // Verificar si es específicamente el día de entrada o salida
            const esDiaEntrada = fechaStr === fechaEntradaStr;
            const esDiaSalida = fechaStr === fechaSalidaStr;
            
            // Para cualquier reserva, incluir si está en rango O si es día de entrada/salida específico
            const incluir = enRango || esDiaEntrada || esDiaSalida;
            
            // Debugging específico para reservas de noviembre
            if (dia.fecha.getMonth() === 10 && incluir) {
              console.log('✅ Reserva encontrada para noviembre:', {
                fecha: fechaStr,
                habitacion: habitacion.numero,
                reserva: {
                  id: reserva._id,
                  fechaEntrada: reserva.fechaEntrada,
                  fechaSalida: reserva.fechaSalida,
                  estado: reserva.estado
                },
                enRango,
                esDiaEntrada,
                esDiaSalida
              });
            }
            
            return incluir;
              });
              
              if (reservasHabitacion.length > 0) {
            // Verificar si es un día de transición (salida de una reserva + entrada de otra)
            const esDiaTransicion = this.detectarDiaTransicion(reservasHabitacion, dia.fecha);
            
            if (esDiaTransicion) {
              // Día de transición: obtener reservas específicas de entrada y salida
              const reservaQueTermina = reservasHabitacion.find((r: any) => {
                const fechaSalida = r.fechaSalida.split('T')[0];
                return fechaSalida === fechaStr;
              });
              
              const reservaQueComienza = reservasHabitacion.find((r: any) => {
                const fechaEntrada = r.fechaEntrada.split('T')[0];
                return fechaEntrada === fechaStr;
              });
              
                let estado: EstadoOcupacion = { 
                tipo: 'transicion',
                checkIn: true,
                checkOut: true,
                esTransicion: true,
                esDiaEntrada: true,
                esDiaSalida: true,
                esDiaTransicion: true,
                // Información de múltiples reservas
                reservas: reservasHabitacion,
                reservaPrincipal: reservasHabitacion[0], // Para compatibilidad
                // Información específica de transición
                reservaEntrada: reservaQueComienza,
                reservaSalida: reservaQueTermina
              };
                
                ocupacion.ocupacionPorDia[fechaStr] = estado;
            } else {
              // Día normal de reserva
              const reservaPrincipal = this.determinarReservaPrincipal(reservasHabitacion);
              
              // Detectar días de entrada y salida
              const fechaStr = this.formatearFecha(dia.fecha);
              const fechaEntradaStr = reservaPrincipal.fechaEntrada.split('T')[0];
              const fechaSalidaStr = reservaPrincipal.fechaSalida.split('T')[0];
              
              const esDiaEntrada = fechaStr === fechaEntradaStr;
              const esDiaSalida = fechaStr === fechaSalidaStr;
              
              let estado: EstadoOcupacion = { 
                tipo: this.mapearEstadoReserva(reservaPrincipal.estado),
                checkIn: esDiaEntrada,
                checkOut: esDiaSalida,
                esTransicion: esDiaEntrada && esDiaSalida,
                esDiaEntrada: esDiaEntrada,
                esDiaSalida: esDiaSalida,
                esDiaTransicion: false,
                // Agregar información del estado de pago de la reserva principal
                estaCompletamentePagado: reservaPrincipal.estaCompletamentePagado || reservaPrincipal.pagado || false,
                montoPagado: reservaPrincipal.montoPagado || 0,
                precioTotal: reservaPrincipal.precioTotal || 0,
                montoRestante: (reservaPrincipal.precioTotal || 0) - (reservaPrincipal.montoPagado || 0),
                // Información de múltiples reservas
                reservas: reservasHabitacion,
                reservaPrincipal: reservaPrincipal
              };
              
              ocupacion.ocupacionPorDia[fechaStr] = estado;
                }
              } else {
                // Si no hay reservas para este día específico, la habitación está disponible
                if (habitacion.estado === 'mantenimiento') {
                  ocupacion.ocupacionPorDia[fechaStr] = { tipo: 'mantenimiento' };
                } else {
                  ocupacion.ocupacionPorDia[fechaStr] = { tipo: 'disponible' };
                }
              }
            }
          });
          
          this.ocupacionHabitaciones.push(ocupacion);
        });
        
        // OPTIMIZADO: Guardar en cache para futuras consultas
        const cacheKey = `${this.mesActual.getFullYear()}-${this.mesActual.getMonth() + 1}-expandido`;
        this.cacheOcupacion[cacheKey] = {
          data: [...this.ocupacionHabitaciones],
          timestamp: Date.now()
        };
        console.log('💾 Cache de ocupación guardado para:', cacheKey);
        
        this.cargando = false;
        this.cargandoOcupacion = false;
  }

  formatearFecha(fecha: Date): string {
    return this.dateTimeService.dateToString(fecha);
  }

  // Función para determinar la prioridad de una reserva
  private obtenerPrioridadReserva(reserva: any): number {
    // Prioridad más alta = número más bajo
    const prioridades: { [key: string]: number } = {
      'En curso': 1,      // Máxima prioridad - ya está ocupada
      'Confirmada': 2,     // Alta prioridad - confirmada
      'Pendiente': 3,     // Media prioridad - pendiente
      'Finalizada': 4,    // Baja prioridad - ya terminó
      'Cancelada': 5,     // Muy baja prioridad - cancelada
      'No Show': 6        // Muy baja prioridad - no se presentó
    };
    
    return prioridades[reserva.estado] || 7;
  }

  // Función para determinar la reserva principal en un día con múltiples reservas
  private determinarReservaPrincipal(reservas: any[]): any {
    if (reservas.length === 1) {
      return reservas[0];
    }
    
    // Ordenar por prioridad (menor número = mayor prioridad)
    const reservasOrdenadas = reservas.sort((a, b) => {
      const prioridadA = this.obtenerPrioridadReserva(a);
      const prioridadB = this.obtenerPrioridadReserva(b);
      
      if (prioridadA !== prioridadB) {
        return prioridadA - prioridadB;
      }
      
      // Si tienen la misma prioridad, usar la más reciente
      return new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime();
    });
    
    return reservasOrdenadas[0];
  }

  // Función para detectar si un día es de transición (salida de una reserva + entrada de otra)
  private detectarDiaTransicion(reservas: any[], fecha: Date): boolean {
    if (!reservas || reservas.length < 2) {
      return false;
    }
    
    const fechaStr = this.dateTimeService.dateToString(fecha);
    
    // Filtrar reservas válidas (con fechas y ID)
    const reservasValidas = reservas.filter(r => 
      r && r._id && r.fechaEntrada && r.fechaSalida
    );
    
    if (reservasValidas.length < 2) {
      return false;
    }
    
    // Buscar reserva que termina este día
    const reservaQueTermina = reservasValidas.find(r => {
      try {
        const fechaSalida = this.extraerFechaString(r.fechaSalida);
        return fechaSalida === fechaStr;
      } catch (error) {
        console.warn('Error al procesar fecha de salida:', error);
        return false;
      }
    });
    
    // Buscar reserva que comienza este día
    const reservaQueComienza = reservasValidas.find(r => {
      try {
        const fechaEntrada = this.extraerFechaString(r.fechaEntrada);
        return fechaEntrada === fechaStr;
      } catch (error) {
        console.warn('Error al procesar fecha de entrada:', error);
        return false;
      }
    });
    
    // Solo es transición si hay dos reservas diferentes: una que termina y otra que comienza
    return !!(reservaQueTermina && reservaQueComienza && 
             reservaQueTermina._id !== reservaQueComienza._id);
  }

  private extraerFechaString(fecha: string | Date): string {
    if (typeof fecha === 'string') {
      return fecha.split('T')[0];
    }
    return this.dateTimeService.dateToString(fecha);
  }

  // Método para obtener el color de una reserva según su estado y pago
  obtenerColorReserva(reserva: any): string {
    // Validación de entrada
    if (!reserva || typeof reserva !== 'object') {
      return this.COLORES_POR_DEFECTO.desconocido;
    }
    
    // Validación de estado
    if (!reserva.estado || typeof reserva.estado !== 'string') {
      return this.COLORES_POR_DEFECTO.desconocido;
    }
    
    try {
      // Validación de montos
      const montoPagado = this.validarMonto(reserva.montoPagado);
      const precioTotal = this.validarMonto(reserva.precioTotal || reserva.precioPorNoche);
      
      if (montoPagado === null || precioTotal === null) {
        return this.COLORES_POR_DEFECTO.desconocido;
      }
      
      const estaCompletamentePagado = montoPagado >= precioTotal;
      const tienePagoParcial = montoPagado > 0 && montoPagado < precioTotal;
      
      // Mapear el estado de la reserva al tipo de ocupación
      const tipoOcupacion = this.mapearEstadoReserva(reserva.estado);
      
      return this.obtenerColorPorTipoYEstado(tipoOcupacion, estaCompletamentePagado, tienePagoParcial);
      
    } catch (error) {
      console.warn('Error al obtener color de reserva:', error);
      return this.COLORES_POR_DEFECTO.error;
    }
  }

  private validarMonto(valor: any): number | null {
    if (valor === null || valor === undefined) return 0;
    const num = Number(valor);
    return isNaN(num) || num < 0 ? null : num;
  }

  private obtenerColorPorTipoYEstado(tipoOcupacion: string, estaCompletamentePagado: boolean, tienePagoParcial: boolean): string {
    switch (tipoOcupacion) {
      case 'ocupada':
        if (estaCompletamentePagado) {
          return '#28a745'; // Verde para completamente pagado
        } else if (tienePagoParcial) {
          return '#ffc107'; // Amarillo para parcialmente pagado
        } else {
          return '#dc3545'; // Rojo para sin pago
        }
      case 'reservada':
        if (estaCompletamentePagado) {
          return '#17a2b8'; // Cyan para reservada y pagada
        } else if (tienePagoParcial) {
          return '#fd7e14'; // Naranja para reservada y parcialmente pagada
        } else {
          return '#e83e8c'; // Rosa para reservada sin pago
        }
      case 'finalizada':
        if (estaCompletamentePagado) {
          return '#007bff'; // Azul para finalizada y pagada
        } else if (tienePagoParcial) {
          return '#6f42c1'; // Morado para finalizada y parcialmente pagada
        } else {
          return '#6c757d'; // Gris para finalizada sin pago
        }
      case 'disponible':
        return '#d4edda'; // Verde claro para disponible
      default:
        return this.COLORES_POR_DEFECTO.desconocido;
    }
  }

  private readonly COLORES_POR_DEFECTO = {
    desconocido: '#6c757d',
    disponible: '#d4edda',
    error: '#dc3545'
  };

  // Método para verificar si es check-out hoy (para indicador de urgencia)
  esCheckOutHoy(fecha: Date, estado: EstadoOcupacion | undefined): boolean {
    // ✅ VALIDACIÓN: Verificar si el estado existe
    if (!estado || !estado.reservaPrincipal) return false;
    
    const hoy = new Date();
    const fechaStr = this.formatearFecha(fecha);
    const hoyStr = this.formatearFecha(hoy);
    
    // Verificar si es día de salida y es hoy
    return (estado.esDiaSalida || false) && fechaStr === hoyStr;
  }

  // Método para generar estilos CSS dinámicos para días de transición
  private generarEstilosTransicionDinamica(estado: EstadoOcupacion): void {
    if (!estado.reservaEntrada || !estado.reservaSalida) return;
    
    const colorPrimeraReserva = this.obtenerColorReserva(estado.reservaEntrada);
    const colorSegundaReserva = this.obtenerColorReserva(estado.reservaSalida);
    
    // Crear un ID único para esta combinación de colores
    const idUnico = `transicion-${colorPrimeraReserva.replace('#', '')}-${colorSegundaReserva.replace('#', '')}`;
    
    // Verificar cache primero
    if (this.cacheEstilos.has(idUnico)) {
      estado.claseDinamica = idUnico;
      return;
    }
    
    // Verificar si ya existe en DOM
    if (document.getElementById(idUnico)) {
      this.cacheEstilos.set(idUnico, idUnico);
      estado.claseDinamica = idUnico;
      return;
    }
    
    // Generar nuevo estilo
    this.crearEstiloDinamico(idUnico, colorPrimeraReserva, colorSegundaReserva);
    this.cacheEstilos.set(idUnico, idUnico);
    estado.claseDinamica = idUnico;
  }

  private crearEstiloDinamico(idUnico: string, colorPrimeraReserva: string, colorSegundaReserva: string): void {
    // Crear el elemento style
    const style = document.createElement('style');
    style.id = idUnico;
    style.textContent = `
      .${idUnico} {
        --color-entrada: ${colorPrimeraReserva};
        --color-salida: ${colorSegundaReserva};
        background: linear-gradient(180deg, ${colorPrimeraReserva} 0%, ${colorPrimeraReserva} 50%, ${colorSegundaReserva} 50%, ${colorSegundaReserva} 100%);
        color: white;
        font-weight: bold;
        animation: pulse-transition 2s infinite;
        position: relative;
        overflow: hidden;
      }
      .${idUnico}::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 2px;
        background: rgba(255, 255, 255, 0.8);
        transform: translateY(-50%);
        z-index: 10;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      }
    `;
    
    // Agregar al documento
    document.head.appendChild(style);
    
    // Registrar estilo para limpieza
    this.estilosDinamicos.add(idUnico);
  }

  // Métodos para aplicar colores dinámicos usando CSS variables
  private aplicarColoresTransicionMultiple(estado: EstadoOcupacion, fecha: Date, habitacionNumero: string): void {
    if (!estado.reservaEntrada || !estado.reservaSalida) return;
    
    const colorEntrada = this.obtenerColorReserva(estado.reservaEntrada);
    const colorSalida = this.obtenerColorReserva(estado.reservaSalida);
    
    // Aplicar CSS variables al elemento específico
    const elemento = document.querySelector(`[data-habitacion="${habitacionNumero}"][data-fecha="${this.formatearFecha(fecha)}"]`);
    if (elemento) {
      (elemento as HTMLElement).style.setProperty('--color-entrada', colorEntrada);
      (elemento as HTMLElement).style.setProperty('--color-salida', colorSalida);
    }
  }

  private aplicarColorTransicionEntrada(estado: EstadoOcupacion, fecha: Date, habitacionNumero: string): void {
    if (!estado.reservaPrincipal) return;
    
    const colorEntrada = this.obtenerColorReserva(estado.reservaPrincipal);
    
    // Aplicar CSS variable al elemento específico
    const elemento = document.querySelector(`[data-habitacion="${habitacionNumero}"][data-fecha="${this.formatearFecha(fecha)}"]`);
    if (elemento) {
      (elemento as HTMLElement).style.setProperty('--color-entrada', colorEntrada);
    }
  }

  private aplicarColorTransicionSalida(estado: EstadoOcupacion, fecha: Date, habitacionNumero: string): void {
    if (!estado.reservaPrincipal) return;
    
    const colorSalida = this.obtenerColorReserva(estado.reservaPrincipal);
    
    // Aplicar CSS variable al elemento específico
    const elemento = document.querySelector(`[data-habitacion="${habitacionNumero}"][data-fecha="${this.formatearFecha(fecha)}"]`);
    if (elemento) {
      (elemento as HTMLElement).style.setProperty('--color-salida', colorSalida);
    }
  }

  private aplicarColorTransicionMismaReserva(estado: EstadoOcupacion, fecha: Date, habitacionNumero: string): void {
    if (!estado.reservaPrincipal) return;
    
    const colorReserva = this.obtenerColorReserva(estado.reservaPrincipal);
    
    // Aplicar CSS variables al elemento específico (mismo color para ambas mitades)
    const elemento = document.querySelector(`[data-habitacion="${habitacionNumero}"][data-fecha="${this.formatearFecha(fecha)}"]`);
    if (elemento) {
      (elemento as HTMLElement).style.setProperty('--color-entrada', colorReserva);
      (elemento as HTMLElement).style.setProperty('--color-salida', colorReserva);
    }
  }



  obtenerClaseOcupacion(estado: EstadoOcupacion | undefined, fecha?: Date, habitacionNumero?: string): string {
    // ✅ VALIDACIÓN: Verificar si el estado existe
    if (!estado) {
      return 'celda-disponible'; // Clase por defecto para celdas sin ocupación
    }
    
    const clases: string[] = [];
    
    // 1. Clase base según el tipo (prioridad 1)
    clases.push(this.obtenerClaseBase(estado.tipo));
    
    // 2. Clases de transición (prioridad 2)
    if (estado.tipo === 'transicion') {
      clases.push(...this.obtenerClasesTransicion(estado, fecha, habitacionNumero));
    } else {
      clases.push(...this.obtenerClasesEntradaSalida(estado));
    }
    
    // 3. Clases de pago (prioridad 3)
    clases.push(...this.obtenerClasesPago(estado));
    
    return clases.filter(clase => clase).join(' ');
  }

  private obtenerClaseBase(tipo: string): string {
    switch (tipo) {
      case 'disponible': return 'ocupacion-disponible';
      case 'ocupada': return 'ocupacion-ocupada';
      case 'reservada': return 'ocupacion-reservada';
      case 'limpieza': return 'ocupacion-limpieza';
      case 'mantenimiento': return 'ocupacion-mantenimiento';
      case 'finalizada': return 'ocupacion-finalizada';
      case 'transicion': return 'ocupacion-transicion';
      default: return 'ocupacion-desconocida';
    }
  }

  private obtenerClasesTransicion(estado: EstadoOcupacion, fecha?: Date, habitacionNumero?: string): string[] {
    const clases: string[] = [];
    
    // Generar estilos dinámicos para días de transición
    if (estado.esDiaTransicion && estado.reservaEntrada && estado.reservaSalida) {
      this.generarEstilosTransicionDinamica(estado);
    }
    
    // Aplicar colores dinámicos según el tipo de transición
    if (estado.esDiaEntrada || estado.esDiaSalida) {
      if (estado.esDiaTransicion) {
        clases.push('transicion-multiple');
        if (fecha && habitacionNumero) {
          this.aplicarColoresTransicionMultiple(estado, fecha, habitacionNumero);
        }
      } else if (estado.esDiaEntrada && !estado.esDiaSalida) {
        clases.push('solo-entrada');
        if (fecha && habitacionNumero) {
          this.aplicarColorTransicionEntrada(estado, fecha, habitacionNumero);
        }
      } else if (estado.esDiaSalida && !estado.esDiaEntrada) {
        clases.push('solo-salida');
        if (fecha && habitacionNumero) {
          this.aplicarColorTransicionSalida(estado, fecha, habitacionNumero);
        }
      } else if (estado.esDiaEntrada && estado.esDiaSalida) {
        clases.push('entrada-salida');
        if (fecha && habitacionNumero) {
          this.aplicarColorTransicionMismaReserva(estado, fecha, habitacionNumero);
        }
      }
    }
    
    // Agregar clase dinámica si existe
    if (estado.claseDinamica) {
      clases.push(estado.claseDinamica);
    }
    
    return clases;
  }

  private obtenerClasesEntradaSalida(estado: EstadoOcupacion): string[] {
    const clases: string[] = [];
    
    if (estado.esDiaEntrada && estado.esDiaSalida) {
      clases.push('entrada-salida');
    } else if (estado.esDiaEntrada) {
      clases.push('solo-entrada');
    } else if (estado.esDiaSalida) {
      clases.push('solo-salida');
    }
    
    // Clases de transición legacy (mantener compatibilidad)
    if (estado.esTransicion) {
      if (estado.checkIn && estado.checkOut) {
        clases.push('transicion-completa');
      } else if (estado.checkOut) {
        clases.push('transicion-checkout');
      } else if (estado.checkIn) {
        clases.push('transicion-checkin');
      }
    }
    
    return clases;
  }

  private obtenerClasesPago(estado: EstadoOcupacion): string[] {
    const clases: string[] = [];
    
    // Aplicar clases de pago para reservas ocupadas, reservadas o finalizadas
    if (estado.tipo === 'ocupada' || estado.tipo === 'reservada' || estado.tipo === 'finalizada') {
      if (estado.estaCompletamentePagado) {
        clases.push('completamente-pagado');
      } else if (estado.montoPagado && estado.montoPagado > 0) {
        clases.push('parcialmente-pagado');
      } else {
        clases.push('sin-pago');
      }
    }
    
    return clases;
  }

  obtenerIconoOcupacion(estado: EstadoOcupacion | undefined): string {
    // ✅ VALIDACIÓN: Verificar si el estado existe
    if (!estado) return 'hotel';
    
    if (estado.esTransicion) {
      if (estado.checkIn && estado.checkOut) {
        return 'swap_horiz';
      } else if (estado.checkOut) {
        return 'logout';
      } else if (estado.checkIn) {
        return 'login';
      }
    }
    
    switch (estado.tipo) {
      case 'disponible': return 'check_circle';
      case 'ocupada': return 'person';
      case 'reservada': return 'event';
      case 'limpieza': return 'cleaning_services';
      case 'mantenimiento': return 'handyman';
      case 'transicion': return 'swap_horiz';
      default: return 'help';
    }
  }
  
  // Métodos auxiliares para el calendario
  fechaEnRango(fecha: Date, fechaInicio: string, fechaFin: string): boolean {
    return this.dateTimeService.isDateInRange(fecha, fechaInicio, fechaFin);
  }
  
  esFechaCheckIn(fecha: Date, fechaCheckIn: string): boolean {
    return this.dateTimeService.isCheckInDate(fecha, fechaCheckIn);
  }
  
  esFechaCheckOut(fecha: Date, fechaCheckOut: string): boolean {
    return this.dateTimeService.isCheckOutDate(fecha, fechaCheckOut);
  }
  
  mapearEstadoReserva(estadoReserva: string): 'disponible' | 'ocupada' | 'reservada' | 'limpieza' | 'mantenimiento' | 'finalizada' {
    switch (estadoReserva.toLowerCase()) {
      case 'confirmada':
      case 'en curso':
        return 'ocupada';
      case 'pendiente':
        return 'reservada';
      case 'finalizada':
        return 'finalizada';
      case 'cancelada':
      case 'no show':
        return 'disponible';
      default:
        return 'disponible';
    }
  }
  
  mapearEstadoHabitacion(estadoHabitacion: string): 'disponible' | 'ocupada' | 'reservada' | 'limpieza' | 'mantenimiento' {
    switch (estadoHabitacion.toLowerCase()) {
      case 'disponible':
        return 'disponible';
      case 'ocupada':
        return 'ocupada';
      case 'reservada':
        return 'reservada';
      case 'limpieza':
        return 'limpieza';
      case 'mantenimiento':
      case 'fuera de servicio':
        return 'mantenimiento';
      default:
        return 'disponible';
    }
  }
  
  cargarEstadisticas(): void {
    // Actualizar estadísticas de ocupación básicas
    this.actualizarEstadisticas();
  }
  
  cargarReservasHoy(): void {
    if (this.cargandoReservas) {
      console.log('⏳ Ya se están cargando las reservas del día, esperando...');
      return;
    }
    
    this.cargandoReservas = true;
    const hoy = this.dateTimeService.getCurrentDateString();
  // DEBUG reducido: desactivar trazas verbosas en producción
    
    // Buscar TODAS las reservas activas sin filtro de fechas
    this.reservaService.getReservas({
      estado: 'Pendiente,Confirmada,En curso'
      // NO enviar fechaInicio ni fechaFin para evitar filtros del backend
    }, 1, 100).subscribe({
      next: (response) => {
        // console.log('Reservas cargadas hoy:', response.reservas?.length || 0);
          _id: r._id,
          estado: r.estado,
          habitacion: typeof r.habitacion === 'object' ? r.habitacion?.numero || 'N/A' : 'N/A',
          cliente: typeof r.cliente === 'object' ? r.cliente?.nombre || 'N/A' : 'N/A'
        })));
        
        // ANÁLISIS PROFUNDO: Verificar cada reserva individualmente
        console.log('🔍 ANÁLISIS PROFUNDO - Todas las reservas del backend:');
        response.reservas?.forEach((r, index) => {
          console.log(`🔍 Reserva ${index + 1}:`, {
            _id: r._id,
            estado: r.estado,
            estadoExacto: `"${r.estado}"`,
            longitudEstado: r.estado?.length,
            esEnCurso: r.estado === 'En curso',
            habitacion: typeof r.habitacion === 'object' ? r.habitacion?.numero : r.habitacion,
            cliente: typeof r.cliente === 'object' ? r.cliente?.nombre : r.cliente
          });
        });
        
        // Usar todas las reservas sin filtro de fechas
        // console.log('Usando todas las reservas sin filtro de fechas:', response.reservas.length);
        
        this.reservasHoy = response.reservas.map(reserva => ({
          horaEntrada: reserva.horaEntrada,
          horaSalida: reserva.horaSalida,
          cliente: typeof reserva.cliente === 'string' ? { nombre: 'Cliente', apellido: '' } : reserva.cliente,
          habitacion: typeof reserva.habitacion === 'string' ? { numero: 'N/A', tipo: 'N/A' } : reserva.habitacion,
          estado: reserva.estado,
          pagado: reserva.pagado,
          precioTotal: reserva.precioTotal || 0,
          montoPagado: reserva.montoPagado || 0
        }));
        
        // console.log('Reservas hoy:', this.reservasHoy.length);
          estado: r.estado,
          habitacion: r.habitacion,
          cliente: r.cliente
        })));
        
        // Mostrar fechas de las reservas para comparar
        if (this.reservasHoy.length > 0) {
          // console.log('Fechas de reservas encontradas (hoy):', this.reservasHoy.length);
            fechaEntrada: r.horaEntrada,
            fechaSalida: r.horaSalida,
            estado: r.estado
          })));
        }
        
        // Actualizar estadísticas del día
        this.actualizarEstadisticas();
        
        this.cargandoReservas = false;
      },
      error: (error) => {
        console.error('Error al cargar reservas del día:', error);
        this.cargandoReservas = false;
      }
    });
  }

  private actualizarEstadisticas(): void {
    // DEBUG compacto
    
    // Estadísticas de ocupación - CONTAR RESERVAS "EN CURSO"
    if (this.habitaciones.length > 0) {
      // console.log('Pre filtro reservasHoy:', this.reservasHoy.length);
      
      // Contar reservas con estado "En curso" (manejar variaciones de capitalización)
      const habitacionesOcupadasHoy = this.reservasHoy.filter(r => 
        r.estado === 'En curso' || r.estado === 'En Curso'
      ).length;
      
      // console.log('Habitaciones ocupadas hoy (en curso):', habitacionesOcupadasHoy);
        estado: r.estado, 
        esEnCurso: r.estado === 'En curso',
        habitacion: r.habitacion?.numero || 'N/A'
      })));
      
      // ANÁLISIS PROFUNDO: Verificar cada reserva en el filtro
      console.log('🔍 ANÁLISIS PROFUNDO - Filtro "En curso":');
      this.reservasHoy.forEach((r, index) => {
        console.log(`🔍 Reserva ${index + 1} en filtro:`, {
          _id: r._id || 'N/A',
          estado: r.estado,
          estadoExacto: `"${r.estado}"`,
          longitudEstado: r.estado?.length,
          esEnCurso: r.estado === 'En curso' || r.estado === 'En Curso',
          comparacion1: `"${r.estado}" === "En curso" = ${r.estado === 'En curso'}`,
          comparacion2: `"${r.estado}" === "En Curso" = ${r.estado === 'En Curso'}`,
          habitacion: r.habitacion?.numero || 'N/A'
        });
      });
      
      this.estadisticas.ocupacionActual = habitacionesOcupadasHoy;
      this.estadisticas.totalHabitaciones = this.habitaciones.length;
      this.estadisticas.porcentajeOcupacion = Math.round((this.estadisticas.ocupacionActual / this.estadisticas.totalHabitaciones) * 100);
      
      // console.log('Ocupación actual:', this.estadisticas.ocupacionActual);
      console.log('🔍 DEBUG - estadisticas.totalHabitaciones:', this.estadisticas.totalHabitaciones);
      console.log('🔍 DEBUG - estadisticas.porcentajeOcupacion:', this.estadisticas.porcentajeOcupacion);
    }

    // Estadísticas de reservas del día - ELIMINADAS

    // Calcular reservas y pagos pendientes
    this.calcularReservasPendientes();
  }

  private calcularReservasPendientes(): void {
    // Cargar todas las reservas activas para calcular pendientes
    this.reservaService.getReservas({
      estado: 'Pendiente,Confirmada,En curso'
    }, 1, 100).subscribe({
      next: (response) => {
        const reservasActivas = response.reservas;
        
        // Reservas pendientes (estado 'Pendiente')
        this.estadisticas.reservasPendientes = reservasActivas.filter(r => r.estado === 'Pendiente').length;
        
        // Pagos pendientes (reservas que no están completamente pagadas)
        const reservasConPagoPendiente = reservasActivas.filter(r => {
          const montoPagado = r.montoPagado || 0;
          const precioTotal = r.precioTotal || 0;
          return montoPagado < precioTotal;
        });
        
        this.estadisticas.pagosPendientes = reservasConPagoPendiente.length;
      },
      error: (error) => {
        console.error('Error al cargar reservas para estadísticas pendientes:', error);
        
        // Manejo específico de errores
        if (error.status === 400) {
          console.warn('Error de validación en consulta de reservas pendientes:', error.error?.message);
        } else if (error.status === 500) {
          console.error('Error interno del servidor al cargar estadísticas');
        } else if (error.status === 0) {
          console.error('Error de conexión al cargar estadísticas');
        }
        
        // Establecer valores por defecto
        this.estadisticas.reservasPendientes = 0;
        this.estadisticas.pagosPendientes = 0;
      }
    });
  }

  obtenerTooltipOcupacion(estado: EstadoOcupacion | undefined, habitacion: Habitacion, dia: DiaCalendario): string {
    let tooltip = `Habitación ${habitacion.numero} - ${this.dateTimeService.formatDateForDisplay(dia.fecha)}`;
    
    // ✅ VALIDACIÓN: Verificar si el estado existe
    if (!estado) {
      return tooltip + ' - Disponible';
    }
    
    if (estado.esDiaEntrada && estado.esDiaSalida) {
      tooltip += ' - Entrada y Salida';
    } else if (estado.esDiaEntrada) {
      tooltip += ' - Entrada';
    } else if (estado.esDiaSalida) {
      tooltip += ' - Salida';
    } else {
      switch (estado.tipo) {
      case 'disponible': tooltip += ' - Disponible'; break;
      case 'ocupada': tooltip += ' - Ocupada'; break;
      case 'reservada': tooltip += ' - Reservada'; break;
      case 'limpieza': tooltip += ' - En limpieza'; break;
      case 'mantenimiento': tooltip += ' - En mantenimiento'; break;
      case 'finalizada': tooltip += ' - Finalizada'; break;
      case 'transicion': tooltip += ' - Día de Transición'; break;
      default: tooltip += ' - Estado desconocido'; break;
    }
    }
    
    // Agregar información del estado de pago para reservas ocupadas/reservadas/finalizadas
    if (estado.tipo === 'ocupada' || estado.tipo === 'reservada' || estado.tipo === 'finalizada') {
      if (estado.estaCompletamentePagado) {
        tooltip += ' - Completamente pagado';
      } else if (estado.montoPagado && estado.montoPagado > 0) {
        tooltip += ` - Parcialmente pagado ($${estado.montoPagado}/${estado.precioTotal})`;
      } else {
        tooltip += ' - Sin pago';
      }
    }
    
    // Agregar información de múltiples reservas
    if (estado.reservas && estado.reservas.length > 1) {
      tooltip += `\n\nMúltiples reservas (${estado.reservas.length}):`;
      estado.reservas.forEach((reserva, index) => {
        const cliente = `${reserva.cliente.nombre} ${reserva.cliente.apellido}`;
        const estadoReserva = reserva.estado;
        tooltip += `\n${index + 1}. ${cliente} (${estadoReserva})`;
      });
    }
    
    return tooltip;
  }

  obtenerNombreMes(): string {
    return `${this.dateTimeService.getMonthName(this.mesActual.getMonth())} ${this.mesActual.getFullYear()}`;
  }

  mesAnterior(): void {
    // Crear una nueva fecha para forzar la detección de cambios
    this.mesActual = this.dateTimeService.createArgentinaDate(this.mesActual.getFullYear(), this.mesActual.getMonth(), 1);
    console.log('📅 Mes anterior:', this.mesActual);
    this.generarCalendario();
    this.generarOcupacion();
  }

  mesSiguiente(): void {
    // Crear una nueva fecha para forzar la detección de cambios
    this.mesActual = this.dateTimeService.createArgentinaDate(this.mesActual.getFullYear(), this.mesActual.getMonth() + 2, 1);
    console.log('📅 Mes siguiente:', this.mesActual);
    this.generarCalendario();
    this.generarOcupacion();
  }

  seleccionarCelda(habitacion: Habitacion, dia: DiaCalendario): void {
    if (dia.esMesActual) {
      console.log(`Habitación ${habitacion.numero} - Día ${dia.numero}`);
      
      // Buscar si hay una reserva para esta habitación en esta fecha
      const fechaStr = this.formatearFecha(dia.fecha);
      const ocupacionHabitacion = this.ocupacionHabitaciones.find(oc => oc.habitacion._id === habitacion._id);
      
      if (ocupacionHabitacion && ocupacionHabitacion.ocupacionPorDia[fechaStr]) {
        const estadoOcupacion = ocupacionHabitacion.ocupacionPorDia[fechaStr];
        
        // Si hay una reserva (ocupada, reservada, finalizada o transición), mostrar el detalle
        if (estadoOcupacion.tipo === 'ocupada' || estadoOcupacion.tipo === 'reservada' || estadoOcupacion.tipo === 'finalizada' || estadoOcupacion.tipo === 'transicion') {
          // Si hay múltiples reservas, mostrar opciones
          if (estadoOcupacion.reservas && estadoOcupacion.reservas.length > 1) {
            this.mostrarOpcionesMultiplesReservas(estadoOcupacion.reservas, habitacion, dia);
          } else {
            // Una sola reserva o usar la reserva principal
            const reserva = estadoOcupacion.reservaPrincipal || this.reservasHoy.find(r => {
            const reservaHabitacion = typeof r.habitacion === 'string' ? r.habitacion : r.habitacion._id;
            return reservaHabitacion === habitacion._id && 
                   this.fechaEnRango(dia.fecha, r.fechaEntrada, r.fechaSalida);
          });
          
          if (reserva) {
              // Si la reserva está confirmada o pendiente y es el día de entrada, ofrecer check-in simple
              if ((reserva.estado === 'Confirmada' || reserva.estado === 'Pendiente') && this.esFechaCheckIn(dia.fecha, reserva.fechaEntrada)) {
                this.mostrarOpcionesCheckIn(reserva);
              } else {
            this.verDetalleReserva(reserva);
              }
          } else {
            // Si no encontramos la reserva en reservasHoy, buscar en todas las reservas
            this.buscarYMostrarReserva(habitacion._id, fechaStr);
            }
          }
        } else {
          // Si la celda está disponible, preguntar si quiere crear una reserva
          if (confirm(`¿Desea crear una reserva para la habitación ${habitacion.numero} el ${this.dateTimeService.formatDateForDisplay(dia.fecha)}?`)) {
            this.abrirNuevaReservaDesdeFecha(dia.fecha, habitacion);
          }
        }
      } else {
        // Si no hay ocupación registrada, preguntar si quiere crear una reserva
        if (confirm(`¿Desea crear una reserva para la habitación ${habitacion.numero} el ${this.dateTimeService.formatDateForDisplay(dia.fecha)}?`)) {
          this.abrirNuevaReservaDesdeFecha(dia.fecha, habitacion);
        }
      }
    }
  }

  abrirNuevaReservaDesdeFecha(fecha: Date, habitacion?: Habitacion): void {
    // DEBUGGING: Logs para diagnosticar el problema
    console.log('🔍 DEBUGGING CALENDARIO → NUEVA RESERVA:');
    console.log('📅 Fecha original del calendario:', fecha);
    console.log('📅 Fecha ISO string:', fecha.toISOString());
    console.log('📅 Fecha local string:', fecha.toLocaleDateString());
    console.log('📅 Zona horaria del navegador:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    
    const fechaStr = this.dateTimeService.dateToString(fecha);
    console.log('📅 Fecha convertida con dateToString:', fechaStr);
    
    const queryParams: any = {
      fecha: fechaStr
    };
    
    if (habitacion) {
      queryParams.habitacion = habitacion._id;
    }
    
    console.log('📅 Query params enviados:', queryParams);
    
    this.router.navigate(['/nueva-reserva'], { queryParams });
  }

  // Métodos de navegación
  abrirNuevaReserva(): void {
    const fechaActual = this.dateTimeService.getCurrentDate();
    const fechaFormateada = this.dateTimeService.dateToString(fechaActual);
    
    this.router.navigate(['/nueva-reserva'], {
      queryParams: {
        fecha: fechaFormateada
      }
    });
  }

  gestionarHabitaciones(): void {
    this.router.navigate(['/habitaciones']);
  }

  irACalendario(): void {
    this.router.navigate(['/calendario']);
  }

  // Función simple para mostrar opciones de check-in
  mostrarOpcionesCheckIn(reserva: any): void {
    console.log('=== MOSTRANDO OPCIONES DE CHECK-IN ===');
    console.log('Reserva:', reserva);
    
    const habitacionNumero = this.obtenerNumeroHabitacion(reserva.habitacion);
    const estadoTexto = reserva.estado === 'Pendiente' ? ' (sin confirmar)' : '';
    const mensaje = `¿Realizar CHECK-IN para ${reserva.cliente.nombre} ${reserva.cliente.apellido} en habitación ${habitacionNumero}${estadoTexto}?`;
    
    if (confirm(mensaje)) {
      this.realizarCheckInSimple(reserva);
    }
  }

  // Función simple para realizar check-in
  realizarCheckInSimple(reserva: any): void {
    console.log('=== REALIZANDO CHECK-IN SIMPLE ===');
    console.log('Reserva ID:', reserva._id);
    
    this.reservaService.checkIn(reserva._id).subscribe({
      next: (reservaActualizada) => {
        console.log('✅ Check-in realizado exitosamente:', reservaActualizada);
        this.mostrarMensaje(`✅ Check-in realizado para ${reserva.cliente.nombre} ${reserva.cliente.apellido}${reserva.estado === 'Pendiente' ? ' (reserva sin confirmar)' : ''}`);
        
        // Recargar datos para reflejar los cambios
        this.cargarReservasHoy();
        // OPTIMIZADO: Invalidar cache específico para check-in
        this.invalidarCacheOcupacion();
      },
      error: (error) => {
        console.error('❌ Error en check-in:', error);
        
        let mensajeError = 'Error al realizar check-in';
        
        if (error.status === 403) {
          mensajeError = 'No tienes permisos para realizar check-in';
        } else if (error.status === 401) {
          mensajeError = 'Sesión expirada. Por favor, inicia sesión nuevamente';
        } else if (error.status === 404) {
          mensajeError = 'Reserva no encontrada';
        } else if (error.status === 400) {
          mensajeError = error.error?.message || 'No se puede realizar check-in en este momento';
        }
        
        this.mostrarMensaje(mensajeError);
      }
    });
  }

  // Métodos de acciones rápidas
  realizarCheckIn(): void {
    console.log('=== INICIANDO CHECK-IN DESDE DASHBOARD ===');
    
    // Buscar reservas confirmadas para check-in hoy
    this.reservaService.getReservasCheckInHoy().subscribe({
      next: (reservas) => {
        console.log('Reservas para check-in hoy:', reservas);
        
        if (reservas.length === 0) {
          this.mostrarMensaje('No hay reservas confirmadas para check-in hoy');
          return;
        }

        // Si hay múltiples reservas, mostrar lista para seleccionar
        if (reservas.length > 1) {
          const opciones = reservas.map(r => 
            `${r.cliente.nombre} ${r.cliente.apellido} - Hab. ${this.obtenerNumeroHabitacion(r.habitacion)} (${r.horaEntrada})`
          );
          
          const seleccion = prompt(`Seleccione la reserva para check-in:\n${opciones.map((op, i) => `${i + 1}. ${op}`).join('\n')}`);
          
          if (!seleccion) return;
          
          const index = parseInt(seleccion) - 1;
          if (index >= 0 && index < reservas.length) {
            this.procesarCheckIn(reservas[index]);
          }
        } else {
          // Solo una reserva confirmada
          this.procesarCheckIn(reservas[0]);
        }
      },
      error: (error) => {
        console.error('Error al obtener reservas para check-in:', error);
        this.mostrarMensaje('Error al cargar reservas para check-in');
      }
    });
  }

  realizarCheckOut(): void {
    console.log('=== INICIANDO CHECK-OUT DESDE DASHBOARD ===');
    
    // Buscar reservas en curso para check-out hoy
    this.reservaService.getReservasCheckOutHoy().subscribe({
      next: (reservas) => {
        console.log('Reservas para check-out hoy:', reservas);
        
        if (reservas.length === 0) {
          this.mostrarMensaje('No hay reservas en curso para check-out hoy');
          return;
        }

        // Si hay múltiples reservas, mostrar lista para seleccionar
        if (reservas.length > 1) {
          const opciones = reservas.map(r => 
            `${r.cliente.nombre} ${r.cliente.apellido} - Hab. ${this.obtenerNumeroHabitacion(r.habitacion)} (${r.horaSalida})`
          );
          
          const seleccion = prompt(`Seleccione la reserva para check-out:\n${opciones.map((op, i) => `${i + 1}. ${op}`).join('\n')}`);
          
          if (!seleccion) return;
          
          const index = parseInt(seleccion) - 1;
          if (index >= 0 && index < reservas.length) {
            this.procesarCheckOut(reservas[index]);
          }
        } else {
          // Solo una reserva en curso
          this.procesarCheckOut(reservas[0]);
        }
      },
      error: (error) => {
        console.error('Error al obtener reservas para check-out:', error);
        this.mostrarMensaje('Error al cargar reservas para check-out');
      }
    });
  }

  gestionarLimpieza(): void {
    // Mostrar habitaciones que necesitan limpieza
    const habitacionesOcupadas = this.habitaciones.filter(h => h.estado === 'ocupada');
    const habitacionesLimpieza = this.habitaciones.filter(h => h.estado === 'limpieza');
    
    const mensaje = `
HABITACIONES PARA LIMPIEZA:
${habitacionesOcupadas.length > 0 ? 
  `\nOcupadas (check-out pendiente):\n${habitacionesOcupadas.map(h => `- Hab. ${h.numero}`).join('\n')}` : 
  '\nNo hay habitaciones ocupadas pendientes de limpieza'}

${habitacionesLimpieza.length > 0 ? 
  `\nEn limpieza:\n${habitacionesLimpieza.map(h => `- Hab. ${h.numero}`).join('\n')}` : 
  '\nNo hay habitaciones en limpieza'}

¿Qué acción desea realizar?
1. Marcar habitación como limpia
2. Ver detalles de limpieza
3. Cancelar`;

    const accion = prompt(mensaje);
    
    if (accion === '1') {
      this.marcarHabitacionLimpia();
    } else if (accion === '2') {
      this.verDetallesLimpieza();
    }
  }

  gestionarPagos(): void {
    console.log('=== INICIANDO GESTIÓN DE PAGOS DESDE DASHBOARD ===');
    
    // Buscar reservas no pagadas
    this.reservaService.getReservas({
      fechaInicio: this.dateTimeService.getCurrentDateString(),
      fechaFin: this.dateTimeService.getCurrentDateString()
    }, 1, 100).subscribe({
      next: (response) => {
        const reservasPendientesPago = response.reservas.filter(r => !r.pagado);
        
        if (reservasPendientesPago.length === 0) {
          this.mostrarMensaje('Todas las reservas de hoy están pagadas');
          return;
        }

        const mensaje = `RESERVAS PENDIENTES DE PAGO:\n${reservasPendientesPago.map(r => 
          `- ${r.cliente.nombre} ${r.cliente.apellido} - Hab. ${this.obtenerNumeroHabitacion(r.habitacion)} - $${r.precioTotal}`
        ).join('\n')}\n\n¿Qué acción desea realizar?\n1. Registrar pago\n2. Ver detalles de pago\n3. Cancelar`;

        const accion = prompt(mensaje);
        
        if (accion === '1') {
          this.registrarPago(reservasPendientesPago);
        } else if (accion === '2') {
          this.verDetallesPago(reservasPendientesPago);
        }
      },
      error: (error) => {
        console.error('Error al obtener reservas para pagos:', error);
        this.mostrarMensaje('Error al cargar reservas para pagos');
      }
    });
  }

  generarReportes(): void {
    const mensaje = `GENERAR REPORTE:\n\n¿Qué tipo de reporte desea generar?\n1. Ocupación diaria\n2. Ingresos del día\n3. Reservas pendientes\n4. Estado de habitaciones\n5. Cancelar`;

    const tipo = prompt(mensaje);
    
    switch (tipo) {
      case '1':
        this.generarReporteOcupacion();
        break;
      case '2':
        this.generarReporteIngresos();
        break;
      case '3':
        this.generarReporteReservasPendientes();
        break;
      case '4':
        this.generarReporteEstadoHabitaciones();
        break;
    }
  }

  gestionarMantenimiento(): void {
    // Mostrar habitaciones en mantenimiento
    const habitacionesMantenimiento = this.habitaciones.filter(h => h.estado === 'mantenimiento');
    
    const mensaje = `GESTIÓN DE MANTENIMIENTO:\n\n${habitacionesMantenimiento.length > 0 ? 
      `Habitaciones en mantenimiento:\n${habitacionesMantenimiento.map(h => `- Hab. ${h.numero}`).join('\n')}` : 
      'No hay habitaciones en mantenimiento'}\n\n¿Qué acción desea realizar?\n1. Marcar habitación como disponible\n2. Reportar problema\n3. Ver historial de mantenimiento\n4. Cancelar`;

    const accion = prompt(mensaje);
    
    if (accion === '1') {
      this.marcarHabitacionDisponible();
    } else if (accion === '2') {
      this.reportarProblema();
    } else if (accion === '3') {
      this.verHistorialMantenimiento();
    }
  }

  // Métodos de reservas
  verDetalleReserva(reserva: any): void {
    console.log('Ver detalle de reserva:', reserva);
    console.log('🔍 DEBUGGING - Configuración de camas:', reserva?.configuracionCamas);
    console.log('🔍 DEBUGGING - Información de transporte:', reserva?.informacionTransporte);
    console.log('🔍 DEBUGGING - Necesidades especiales:', reserva?.necesidadesEspeciales);
    
    // Hacer petición HTTP al backend para obtener los detalles completos de la reserva
    this.reservaService.getReserva(reserva._id).subscribe({
      next: (reservaCompleta) => {
        console.log('🔍 DEBUGGING FRONTEND - Reserva completa obtenida:', reservaCompleta);
        console.log('🔍 DEBUGGING FRONTEND - Configuración de camas:', reservaCompleta?.configuracionCamas);
        console.log('🔍 DEBUGGING FRONTEND - Información de transporte:', reservaCompleta?.informacionTransporte);
        console.log('🔍 DEBUGGING FRONTEND - Necesidades especiales:', reservaCompleta?.necesidadesEspeciales);
        
        // Abrir el modal con el detalle completo de la reserva
        const dialogRef = this.dialog.open(DetalleReservaModalComponent, {
          width: '800px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          data: { reserva: reservaCompleta },
          disableClose: false
        });

        // Manejar el resultado del modal
        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            console.log('Acción realizada:', result.action);
            
            // Limpiar cache para forzar recarga de datos
            this.cacheReservas = {};
            this.lastRefreshTime = 0;
            
            // Usar debounce para recargar datos
            this.refreshSubject.next();
            
            // Recargar estadísticas inmediatamente
            this.cargarEstadisticas();
            this.cargarReservasHoy();
            
            // Recargar to-do list si se revirtió un checkout
            if (result.action === 'revertir-checkout' && this.todoListComponent) {
              this.todoListComponent.cargarTareasPendientes();
            }
          }
        });
      },
      error: (error) => {
        console.error('❌ Error al obtener detalles de la reserva:', error);
        this.mostrarMensaje('Error al cargar los detalles de la reserva');
      }
    });
  }

  private buscarYMostrarReserva(habitacionId: string, fechaStr: string): void {
    // Buscar la reserva en todas las reservas del mes
    const fechaInicio = this.dateTimeService.getFirstDayOfMonth(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1);
    const fechaFin = this.dateTimeService.getLastDayOfMonth(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1);
    
    this.reservaService.getReservas({
      fechaInicio: this.dateTimeService.dateToString(fechaInicio),
      fechaFin: this.dateTimeService.dateToString(fechaFin)
    }, 1, 100).subscribe({
      next: (response) => {
        const reserva = response.reservas.find(r => {
          const reservaHabitacion = typeof r.habitacion === 'string' ? r.habitacion : r.habitacion._id;
          return reservaHabitacion === habitacionId && 
                 this.fechaEnRango(new Date(fechaStr), r.fechaEntrada, r.fechaSalida);
        });
        
        if (reserva) {
          this.verDetalleReserva(reserva);
        } else {
          this.mostrarMensaje('No se encontró información de la reserva');
        }
      },
      error: (error) => {
        console.error('Error al buscar reserva:', error);
        this.mostrarMensaje('Error al buscar la reserva');
      }
    });
  }

  // Métodos auxiliares para Check-in/Check-out
  private procesarCheckIn(reserva: any): void {
    console.log('=== PROCESANDO CHECK-IN ===');
    console.log('Reserva:', reserva);
    console.log('Estado actual:', reserva.estado);
    console.log('ID de reserva:', reserva._id);
    
    if (reserva.estado !== 'Confirmada') {
      this.mostrarMensaje('Solo se puede hacer check-in a reservas confirmadas');
      return;
    }

    const confirmacion = confirm(`¿Confirmar check-in para ${reserva.cliente.nombre} ${reserva.cliente.apellido} en habitación ${this.obtenerNumeroHabitacion(reserva.habitacion)}?`);
    
    if (confirmacion) {
      // Usar el servicio de check-in real
      this.reservaService.checkIn(reserva._id).subscribe({
        next: (reservaActualizada) => {
          console.log('✅ Check-in procesado exitosamente:', reservaActualizada);
          this.mostrarMensaje(`Check-in realizado para ${reserva.cliente.nombre} ${reserva.cliente.apellido}`);
          
          // Recargar datos para reflejar los cambios
          this.cargarReservasHoy();
          this.generarOcupacion();
        },
        error: (error) => {
          console.error('=== ERROR EN CHECK-IN ===');
          console.error('Error completo:', error);
          console.error('Status:', error.status);
          console.error('Message:', error.error?.message);
          
          let mensajeError = 'Error al realizar check-in';
          
          if (error.status === 403) {
            mensajeError = 'No tienes permisos para realizar check-in. Se requiere rol de encargado.';
          } else if (error.status === 401) {
            mensajeError = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
          } else if (error.status === 404) {
            mensajeError = 'Reserva no encontrada.';
          } else if (error.status === 400) {
            mensajeError = error.error?.message || 'Datos de check-in inválidos.';
          } else {
            mensajeError = error.error?.message || 'Error desconocido al realizar check-in';
          }
          
          this.mostrarMensaje(mensajeError);
        }
      });
    }
  }

  private procesarCheckOut(reserva: any): void {
    console.log('=== PROCESANDO CHECK-OUT ===');
    console.log('Reserva:', reserva);
    console.log('Estado actual:', reserva.estado);
    console.log('ID de reserva:', reserva._id);
    
    if (reserva.estado !== 'En curso') {
      this.mostrarMensaje('Solo se puede hacer check-out a reservas en curso');
      return;
    }

    const confirmacion = confirm(`¿Confirmar check-out para ${reserva.cliente.nombre} ${reserva.cliente.apellido} en habitación ${this.obtenerNumeroHabitacion(reserva.habitacion)}?`);
    
    if (confirmacion) {
      // Usar el servicio de check-out real
      this.reservaService.checkOut(reserva._id).subscribe({
        next: (reservaActualizada) => {
          console.log('✅ Check-out procesado exitosamente:', reservaActualizada);
          this.mostrarMensaje(`Check-out realizado para ${reserva.cliente.nombre} ${reserva.cliente.apellido}`);
          
          // Recargar datos para reflejar los cambios
          this.cargarReservasHoy();
          // OPTIMIZADO: Invalidar cache específico para check-out
          this.invalidarCacheOcupacion();
          
          // Recargar to-do list para mostrar nueva tarea de limpieza
          if (this.todoListComponent) {
            this.todoListComponent.cargarTareasPendientes();
          }
        },
        error: (error) => {
          console.error('=== ERROR EN CHECK-OUT ===');
          console.error('Error completo:', error);
          console.error('Status:', error.status);
          console.error('Message:', error.error?.message);
          
          let mensajeError = 'Error al realizar check-out';
          
          if (error.status === 403) {
            mensajeError = 'No tienes permisos para realizar check-out. Se requiere rol de encargado.';
          } else if (error.status === 401) {
            mensajeError = 'Sesión expirada. Por favor, inicia sesión nuevamente.';
          } else if (error.status === 404) {
            mensajeError = 'Reserva no encontrada.';
          } else if (error.status === 400) {
            mensajeError = error.error?.message || 'Datos de check-out inválidos.';
          } else {
            mensajeError = error.error?.message || 'Error desconocido al realizar check-out';
          }
          
          this.mostrarMensaje(mensajeError);
        }
      });
    }
  }

  // Métodos auxiliares para Limpieza
  private marcarHabitacionLimpia(): void {
    const habitacionesLimpieza = this.habitaciones.filter(h => h.estado === 'limpieza');
    
    if (habitacionesLimpieza.length === 0) {
      this.mostrarMensaje('No hay habitaciones en limpieza');
      return;
    }

    const opciones = habitacionesLimpieza.map(h => `Hab. ${h.numero}`);
    const seleccion = prompt(`Seleccione la habitación a marcar como limpia:\n${opciones.map((op, i) => `${i + 1}. ${op}`).join('\n')}`);
    
    if (seleccion) {
      const index = parseInt(seleccion) - 1;
      if (index >= 0 && index < habitacionesLimpieza.length) {
        const habitacion = habitacionesLimpieza[index];
        console.log('Marcando habitación como limpia:', habitacion);
        this.mostrarMensaje(`Habitación ${habitacion.numero} marcada como limpia`);
        
        // Recargar datos
        this.inicializarHabitaciones();
      }
    }
  }

  private verDetallesLimpieza(): void {
    const habitacionesLimpieza = this.habitaciones.filter(h => h.estado === 'limpieza');
    
    if (habitacionesLimpieza.length === 0) {
      this.mostrarMensaje('No hay habitaciones en limpieza');
      return;
    }

    const detalles = habitacionesLimpieza.map(h => 
      `Habitación ${h.numero}:\n- Tipo: ${h.tipo}\n- Capacidad: ${h.capacidad}`
    ).join('\n\n');

    alert(`DETALLES DE LIMPIEZA:\n\n${detalles}`);
  }

  // Métodos auxiliares para Pagos
  private registrarPago(reservasPendientesPago: any[]): void {
    if (reservasPendientesPago.length === 0) {
      this.mostrarMensaje('No hay reservas pendientes de pago');
      return;
    }

    const opciones = reservasPendientesPago.map(r => 
      `${r.cliente.nombre} ${r.cliente.apellido} - Hab. ${this.obtenerNumeroHabitacion(r.habitacion)} - $${r.precioTotal}`
    );
    
    const seleccion = prompt(`Seleccione la reserva para registrar pago:\n${opciones.map((op, i) => `${i + 1}. ${op}`).join('\n')}`);
    
    if (seleccion) {
      const index = parseInt(seleccion) - 1;
      if (index >= 0 && index < reservasPendientesPago.length) {
        const reserva = reservasPendientesPago[index];
        
        // Solicitar método de pago
        const metodosPago = ['Efectivo', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Transferencia', 'PayPal'];
        const metodoPago = prompt(`Seleccione método de pago:\n${metodosPago.map((m, i) => `${i + 1}. ${m}`).join('\n')}`);
        
        if (metodoPago) {
          const metodoIndex = parseInt(metodoPago) - 1;
          if (metodoIndex >= 0 && metodoIndex < metodosPago.length) {
            const metodoSeleccionado = metodosPago[metodoIndex];
            
            // Registrar pago usando el servicio
            this.reservaService.registrarPago(reserva._id, metodoSeleccionado, reserva.precioTotal).subscribe({
              next: (reservaActualizada) => {
                console.log('✅ Pago registrado exitosamente:', reservaActualizada);
                this.mostrarMensaje(`Pago registrado para ${reserva.cliente.nombre} ${reserva.cliente.apellido}`);
                
                // Recargar datos para reflejar los cambios
                this.cargarReservasHoy();
                // OPTIMIZADO: Invalidar cache específico para pagos
                this.invalidarCacheOcupacion();
              },
              error: (error) => {
                console.error('❌ Error al registrar pago:', error);
                this.mostrarMensaje('Error al registrar el pago. Intente nuevamente.');
              }
            });
          }
        }
      }
    }
  }

  private verDetallesPago(reservasPendientesPago: any[]): void {
    if (reservasPendientesPago.length === 0) {
      this.mostrarMensaje('No hay reservas pendientes de pago');
      return;
    }

    const detalles = reservasPendientesPago.map(r => 
      `${r.cliente.nombre} ${r.cliente.apellido}:\n- Habitación: ${this.obtenerNumeroHabitacion(r.habitacion)}\n- Precio total: $${r.precioTotal}\n- Método de pago: ${r.metodoPago || 'No especificado'}`
    ).join('\n\n');

    alert(`DETALLES DE PAGO:\n\n${detalles}`);
  }

  // Métodos auxiliares para Reportes
  private generarReporteOcupacion(): void {
    const habitacionesDisponibles = this.habitaciones.filter(h => h.estado === 'disponible').length;
    const habitacionesOcupadas = this.habitaciones.filter(h => h.estado === 'ocupada').length;
    const habitacionesReservadas = this.habitaciones.filter(h => h.estado === 'reservada').length;
    const habitacionesLimpieza = this.habitaciones.filter(h => h.estado === 'limpieza').length;
    const habitacionesMantenimiento = this.habitaciones.filter(h => h.estado === 'mantenimiento').length;
    
    const reporte = `REPORTE DE OCUPACIÓN - ${this.dateTimeService.formatDateForDisplay(this.fechaActual)}\n\n` +
      `Total de habitaciones: ${this.habitaciones.length}\n` +
      `Disponibles: ${habitacionesDisponibles}\n` +
      `Ocupadas: ${habitacionesOcupadas}\n` +
      `Reservadas: ${habitacionesReservadas}\n` +
      `En limpieza: ${habitacionesLimpieza}\n` +
      `En mantenimiento: ${habitacionesMantenimiento}\n` +
      `Porcentaje de ocupación: ${Math.round(((habitacionesOcupadas + habitacionesReservadas) / this.habitaciones.length) * 100)}%`;

    alert(reporte);
  }

  private generarReporteIngresos(): void {
    const reservasPagadas = this.reservasHoy.filter(r => r.pagado);
    
    const reporte = `REPORTE DE INGRESOS - ${this.dateTimeService.formatDateForDisplay(this.fechaActual)}\n\n` +
      `Reservas pagadas: ${reservasPagadas.length}\n` +
      `Total de reservas pagadas: ${reservasPagadas.length}`;

    alert(reporte);
  }

  private generarReporteReservasPendientes(): void {
    const reservasPendientes = this.reservasHoy.filter(r => r.estado === 'Pendiente');
    
    const reporte = `REPORTE DE RESERVAS PENDIENTES - ${this.dateTimeService.formatDateForDisplay(this.fechaActual)}\n\n` +
      `Total de reservas pendientes: ${reservasPendientes.length}\n\n` +
      (reservasPendientes.length > 0 ? 
        reservasPendientes.map(r => 
          `${r.cliente?.nombre} ${r.cliente?.apellido} - Hab. ${r.habitacion?.numero} - ${r.horaEntrada}`
        ).join('\n') : 
        'No hay reservas pendientes');

    alert(reporte);
  }

  private generarReporteEstadoHabitaciones(): void {
    const reporte = `REPORTE DE ESTADO DE HABITACIONES - ${this.dateTimeService.formatDateForDisplay(this.fechaActual)}\n\n` +
      this.habitaciones.map(h => 
        `Habitación ${h.numero}:\n- Tipo: ${h.tipo}\n- Estado: ${h.estado}\n- Capacidad: ${h.capacidad}`
      ).join('\n\n');

    alert(reporte);
  }

  // Métodos auxiliares para Mantenimiento
  private marcarHabitacionDisponible(): void {
    const habitacionesMantenimiento = this.habitaciones.filter(h => h.estado === 'mantenimiento');
    
    if (habitacionesMantenimiento.length === 0) {
      this.mostrarMensaje('No hay habitaciones en mantenimiento');
      return;
    }

    const opciones = habitacionesMantenimiento.map(h => `Hab. ${h.numero}`);
    const seleccion = prompt(`Seleccione la habitación a marcar como disponible:\n${opciones.map((op, i) => `${i + 1}. ${op}`).join('\n')}`);
    
    if (seleccion) {
      const index = parseInt(seleccion) - 1;
      if (index >= 0 && index < habitacionesMantenimiento.length) {
        const habitacion = habitacionesMantenimiento[index];
        console.log('Marcando habitación como disponible:', habitacion);
        this.mostrarMensaje(`Habitación ${habitacion.numero} marcada como disponible`);
        
        // Recargar datos
        this.inicializarHabitaciones();
      }
    }
  }

  private reportarProblema(): void {
    const habitacion = prompt('Ingrese el número de habitación con problema:');
    
    if (habitacion) {
      const descripcion = prompt('Describa el problema:');
      
      if (descripcion) {
        console.log('Problema reportado:', { habitacion, descripcion });
        this.mostrarMensaje(`Problema reportado para habitación ${habitacion}`);
        
        // Aquí se podría guardar en una base de datos de mantenimiento
      }
    }
  }

  private verHistorialMantenimiento(): void {
    // Por ahora mostrar un mensaje genérico
    this.mostrarMensaje('Historial de mantenimiento en desarrollo');
  }

  editarReserva(reserva: any): void {
    console.log('=== EDITAR RESERVA ===');
    console.log('Reserva:', reserva);
    
    // Navegar al formulario de edición con los parámetros correctos
    this.router.navigate(['/nueva-reserva'], {
      queryParams: { 
        modo: 'editar', 
        reservaId: reserva._id 
      }
    });
  }

  imprimirReserva(reserva: any): void {
    console.log('=== IMPRIMIR RESERVA ===');
    console.log('Reserva:', reserva);
    
    // Generar PDF de la reserva
    this.reservaService.generarPDF(reserva._id).subscribe({
      next: (blob) => {
        // Crear URL del blob y descargar
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reserva-${reserva._id}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        
        this.mostrarMensaje('PDF de reserva generado exitosamente');
      },
      error: (error) => {
        console.error('Error al generar PDF:', error);
        this.mostrarMensaje('Error al generar PDF: ' + (error.error?.message || 'Error desconocido'));
      }
    });
  }

  // Métodos de notas
  agregarNota(): void {
    if (this.nuevaNota.trim()) {
      const nota: Nota = {
        texto: this.nuevaNota.trim(),
        tipo: 'info',
        fecha: this.dateTimeService.getCurrentDate()
      };
      this.notasDia.push(nota);
      this.nuevaNota = '';
      this.mostrarMensaje('Nota agregada exitosamente');
    }
  }

  eliminarNota(index: number): void {
    this.notasDia.splice(index, 1);
    this.mostrarMensaje('Nota eliminada');
  }

  // Utilidades
  private mostrarMensaje(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  // Función para mostrar opciones cuando hay múltiples reservas en el mismo día
  mostrarOpcionesMultiplesReservas(reservas: any[], habitacion: Habitacion, dia: DiaCalendario): void {
    const dialogRef = this.dialog.open(SeleccionReservaSimpleComponent, {
      width: '500px',
      maxWidth: '90vw',
      data: { 
        reservas: reservas, 
        habitacion: habitacion, 
        dia: dia.fecha 
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        switch (result.accion) {
          case 'verDetalle':
            // Verificar si es día de entrada para check-in
            if ((result.reserva.estado === 'Confirmada' || result.reserva.estado === 'Pendiente') && 
                this.esFechaCheckIn(dia.fecha, result.reserva.fechaEntrada)) {
              this.mostrarOpcionesCheckIn(result.reserva);
            } else {
              this.verDetalleReserva(result.reserva);
            }
            break;
          case 'cancelar':
            // No hacer nada
            break;
        }
      }
    });
  }

  // Obtener número de habitación
  private obtenerNumeroHabitacion(habitacion: string | any): string {
    if (typeof habitacion === 'string') {
      return habitacion;
    }
    return habitacion?.numero || 'N/A';
  }
}
*/

