const PDFDocument = require('pdfkit');

class PDFService {
    /**
     * Generar PDF de reserva
     * @param {Object} reserva - Datos de la reserva
     * @returns {Buffer} - Buffer del PDF generado
     */
    generarPDFReserva(reserva) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 50,
                        bottom: 50,
                        left: 50,
                        right: 50
                    }
                });

                const buffers = [];
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    const pdfData = Buffer.concat(buffers);
                    resolve(pdfData);
                });

                doc.on('error', (error) => {
                    reject(error);
                });

                // Configurar fuentes básicas
                doc.fontSize(12);

                // Encabezado
                this.agregarEncabezado(doc, reserva);
                
                // Información del cliente
                this.agregarInformacionCliente(doc, reserva);
                
                // Información de la habitación
                this.agregarInformacionHabitacion(doc, reserva);
                
                // Fechas y horarios
                this.agregarFechasHorarios(doc, reserva);
                
                // Información de precios
                this.agregarInformacionPrecios(doc, reserva);
                
                // Estado y pagos
                this.agregarEstadoPagos(doc, reserva);
                
                // Historial de pagos si existe
                if (reserva.historialPagos && reserva.historialPagos.length > 0) {
                    this.agregarHistorialPagos(doc, reserva);
                }
                
                // Observaciones si existen
                if (reserva.observaciones) {
                    this.agregarObservaciones(doc, reserva);
                }
                
                // Pie de página
                this.agregarPiePagina(doc, reserva);

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Agregar encabezado al PDF
     */
    agregarEncabezado(doc, reserva) {
        // Logo/Título del hostal
        doc.fontSize(20)
           .text('HOSTAL DEL CENTRO', 50, 50, { align: 'center' });
        
        doc.fontSize(14)
           .text('Sistema de Gestión Hotelera', 50, 80, { align: 'center' });
        
        // Línea separadora
        doc.strokeColor('#1976d2')
           .lineWidth(2)
           .moveTo(50, 110)
           .lineTo(545, 110)
           .stroke();
        
        // Título del documento
        doc.fontSize(18)
           .text('COMPROBANTE DE RESERVA', 50, 130, { align: 'center' });
        
        // Número de reserva
        doc.fontSize(12)
           .text(`Número de Reserva: ${reserva._id}`, 50, 160, { align: 'center' });
        
        // Fecha de emisión
        doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-ES')}`, 50, 180, { align: 'center' });
        
        doc.moveDown(2);
    }

    /**
     * Agregar información del cliente
     */
    agregarInformacionCliente(doc, reserva) {
        doc.fontSize(14)
           .text('INFORMACIÓN DEL CLIENTE', 50, doc.y);
        
        doc.moveDown(0.5);
        
        doc.fontSize(11);
        
        const cliente = reserva.cliente;
        const clienteInfo = [
            `Nombre: ${cliente.nombre} ${cliente.apellido}`,
            `Email: ${cliente.email}`,
            `Teléfono: ${cliente.telefono}`,
            `Documento: ${cliente.documento}`
        ];
        
        if (cliente.direccion) {
            clienteInfo.push(`Dirección: ${cliente.direccion}`);
        }
        
        if (cliente.nacionalidad) {
            clienteInfo.push(`Nacionalidad: ${cliente.nacionalidad}`);
        }
        
        clienteInfo.forEach(info => {
            doc.text(info, 70, doc.y);
            doc.moveDown(0.3);
        });
        
        doc.moveDown(1);
    }

    /**
     * Agregar información de la habitación
     */
    agregarInformacionHabitacion(doc, reserva) {
        doc.fontSize(14)
           .text('INFORMACIÓN DE LA HABITACIÓN', 50, doc.y);
        
        doc.moveDown(0.5);
        
        doc.fontSize(11);
        
        const habitacion = reserva.habitacion;
        const habitacionInfo = [
            `Número: ${habitacion.numero}`,
            `Tipo: ${habitacion.tipo}`,
            `Capacidad: ${habitacion.capacidad} personas`
        ];
        
        if (habitacion.descripcion) {
            habitacionInfo.push(`Descripción: ${habitacion.descripcion}`);
        }
        
        habitacionInfo.forEach(info => {
            doc.text(info, 70, doc.y);
            doc.moveDown(0.3);
        });
        
        doc.moveDown(1);
    }

    /**
     * Agregar fechas y horarios
     */
    agregarFechasHorarios(doc, reserva) {
        doc.fontSize(14)
           .text('FECHAS Y HORARIOS', 50, doc.y);
        
        doc.moveDown(0.5);
        
        doc.fontSize(11);
        
        const fechaEntrada = new Date(reserva.fechaEntrada);
        const fechaSalida = new Date(reserva.fechaSalida);
        
        const fechasInfo = [
            `Fecha de Entrada: ${fechaEntrada.toLocaleDateString('es-ES')} a las ${reserva.horaEntrada}`,
            `Fecha de Salida: ${fechaSalida.toLocaleDateString('es-ES')} a las ${reserva.horaSalida}`,
            `Duración: ${reserva.calcularDias ? reserva.calcularDias() : Math.ceil((fechaSalida - fechaEntrada) / (1000 * 60 * 60 * 24))} días`
        ];
        
        fechasInfo.forEach(info => {
            doc.text(info, 70, doc.y);
            doc.moveDown(0.3);
        });
        
        doc.moveDown(1);
    }

    /**
     * Agregar información de precios
     */
    agregarInformacionPrecios(doc, reserva) {
        doc.fontSize(14)
           .text('INFORMACIÓN DE PRECIOS', 50, doc.y);
        
        doc.moveDown(0.5);
        
        doc.fontSize(11);
        
        const preciosInfo = [
            `Precio por Noche: $${reserva.precioPorNoche}`,
            `Total: $${reserva.precioTotal}`
        ];
        
        preciosInfo.forEach(info => {
            doc.text(info, 70, doc.y);
            doc.moveDown(0.3);
        });
        
        doc.moveDown(1);
    }

    /**
     * Agregar estado y pagos
     */
    agregarEstadoPagos(doc, reserva) {
        doc.fontSize(14)
           .text('ESTADO Y PAGOS', 50, doc.y);
        
        doc.moveDown(0.5);
        
        doc.fontSize(11);
        
        const estadoInfo = [
            `Estado: ${reserva.estado}`,
            `Pagado: ${reserva.pagado ? 'SÍ' : 'NO'}`
        ];
        
        if (reserva.montoPagado !== undefined) {
            estadoInfo.push(`Monto Pagado: $${reserva.montoPagado}`);
        }
        
        if (reserva.montoRestante !== undefined) {
            estadoInfo.push(`Monto Restante: $${reserva.montoRestante}`);
        }
        
        if (reserva.metodoPago) {
            estadoInfo.push(`Método de Pago: ${reserva.metodoPago}`);
        }
        
        estadoInfo.forEach(info => {
            doc.text(info, 70, doc.y);
            doc.moveDown(0.3);
        });
        
        doc.moveDown(1);
    }

    /**
     * Agregar historial de pagos
     */
    agregarHistorialPagos(doc, reserva) {
        doc.fontSize(14)
           .text('HISTORIAL DE PAGOS', 50, doc.y);
        
        doc.moveDown(0.5);
        
        doc.fontSize(11);
        
        reserva.historialPagos.forEach((pago, index) => {
            doc.text(`Pago #${index + 1}:`, 70, doc.y);
            doc.moveDown(0.2);
            
            doc.text(`  Monto: $${pago.monto}`, 90, doc.y);
            doc.moveDown(0.2);
            
            doc.text(`  Método: ${pago.metodoPago}`, 90, doc.y);
            doc.moveDown(0.2);
            
            doc.text(`  Fecha: ${new Date(pago.fechaPago).toLocaleString('es-ES')}`, 90, doc.y);
            doc.moveDown(0.2);
            
            if (pago.observaciones) {
                doc.text(`  Observaciones: ${pago.observaciones}`, 90, doc.y);
                doc.moveDown(0.2);
            }
            
            doc.text(`  Registrado por: ${pago.registradoPor}`, 90, doc.y);
            doc.moveDown(0.5);
        });
        
        doc.moveDown(1);
    }

    /**
     * Agregar observaciones
     */
    agregarObservaciones(doc, reserva) {
        doc.fontSize(14)
           .text('OBSERVACIONES', 50, doc.y);
        
        doc.moveDown(0.5);
        
        doc.fontSize(11)
           .text(reserva.observaciones, 70, doc.y, {
               width: 450,
               align: 'left'
           });
        
        doc.moveDown(1);
    }

    /**
     * Agregar pie de página
     */
    agregarPiePagina(doc, reserva) {
        // Línea separadora
        doc.strokeColor('#e0e0e0')
           .lineWidth(1)
           .moveTo(50, doc.y + 20)
           .lineTo(545, doc.y + 20)
           .stroke();
        
        doc.fontSize(10)
           .text('Este documento es generado automáticamente por el Sistema de Gestión Hotelera', 50, doc.y + 30, { align: 'center' });
        
        doc.text('Para consultas contactar al hostal al +54 11 1234-5678', 50, doc.y + 10, { align: 'center' });
        
        doc.text(`Generado el ${new Date().toLocaleString('es-ES')}`, 50, doc.y + 10, { align: 'center' });
    }

    /**
     * Generar comprobante de pago
     * @param {Object} reserva - Datos de la reserva
     * @returns {Buffer} - Buffer del PDF generado
     */
    generarComprobantePago(reserva) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 50,
                        bottom: 50,
                        left: 50,
                        right: 50
                    }
                });

                const buffers = [];
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    const pdfData = Buffer.concat(buffers);
                    resolve(pdfData);
                });

                doc.on('error', (error) => {
                    reject(error);
                });

                // Configurar fuentes básicas
                doc.fontSize(12);

                // Encabezado específico para comprobante
                doc.fontSize(20)
                   .text('COMPROBANTE DE PAGO', 50, 50, { align: 'center' });
                
                doc.fontSize(14)
                   .text('Hostal del Centro', 50, 80, { align: 'center' });
                
                // Línea separadora
                doc.strokeColor('#2e7d32')
                   .lineWidth(2)
                   .moveTo(50, 110)
                   .lineTo(545, 110)
                   .stroke();
                
                // Información del pago
                doc.fontSize(14)
                   .text('DETALLES DEL PAGO', 50, 130);
                
                doc.moveDown(0.5);
                
                doc.fontSize(11);
                
                const pagoInfo = [
                    `Reserva: ${reserva._id}`,
                    `Cliente: ${reserva.cliente.nombre} ${reserva.cliente.apellido}`,
                    `Habitación: ${reserva.habitacion.numero}`,
                    `Monto Total: $${reserva.precioTotal}`,
                    `Monto Pagado: $${reserva.montoPagado || 0}`,
                    `Monto Restante: $${reserva.montoRestante || reserva.precioTotal}`,
                    `Estado: ${reserva.pagado ? 'COMPLETAMENTE PAGADO' : 'PAGO PARCIAL'}`
                ];
                
                pagoInfo.forEach(info => {
                    doc.text(info, 70, doc.y);
                    doc.moveDown(0.3);
                });
                
                // Historial de pagos
                if (reserva.historialPagos && reserva.historialPagos.length > 0) {
                    doc.moveDown(1);
                    this.agregarHistorialPagos(doc, reserva);
                }
                
                // Pie de página
                this.agregarPiePagina(doc, reserva);

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = new PDFService();
