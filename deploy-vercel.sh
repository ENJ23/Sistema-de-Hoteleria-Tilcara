#!/bin/bash

# Script de despliegue automático en Vercel
# Sistema de Hotelería

echo "🚀 Iniciando despliegue en Vercel..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar que Vercel CLI esté instalado
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI no está instalado"
    echo "Instalando Vercel CLI..."
    npm install -g vercel
fi

# Verificar que estemos en el directorio correcto
if [ ! -f "docker-compose.yml" ]; then
    print_error "No se encontró docker-compose.yml. Asegúrate de estar en el directorio raíz del proyecto."
    exit 1
fi

print_status "Verificando estructura del proyecto..."

# Verificar que existan los directorios necesarios
if [ ! -d "Frontend-Hoteleria" ]; then
    print_error "Directorio Frontend-Hoteleria no encontrado"
    exit 1
fi

if [ ! -d "Backend-Hoteleria" ]; then
    print_error "Directorio Backend-Hoteleria no encontrado"
    exit 1
fi

print_status "Estructura del proyecto verificada"

# Preguntar al usuario qué desea desplegar
echo ""
echo "¿Qué deseas desplegar?"
echo "1) Solo Frontend"
echo "2) Solo Backend"
echo "3) Ambos (Frontend y Backend)"
echo "4) Salir"
echo ""
read -p "Selecciona una opción (1-4): " option

case $option in
    1)
        echo ""
        print_status "Desplegando Frontend..."
        cd Frontend-Hoteleria
        vercel --prod
        print_status "Frontend desplegado exitosamente"
        ;;
    2)
        echo ""
        print_status "Desplegando Backend..."
        cd Backend-Hoteleria
        vercel --prod
        print_status "Backend desplegado exitosamente"
        ;;
    3)
        echo ""
        print_status "Desplegando Frontend..."
        cd Frontend-Hoteleria
        vercel --prod
        print_status "Frontend desplegado exitosamente"
        
        echo ""
        print_status "Desplegando Backend..."
        cd ../Backend-Hoteleria
        vercel --prod
        print_status "Backend desplegado exitosamente"
        ;;
    4)
        print_status "Saliendo..."
        exit 0
        ;;
    *)
        print_error "Opción inválida"
        exit 1
        ;;
esac

echo ""
print_status "Despliegue completado!"
echo ""
print_warning "No olvides configurar las variables de entorno en Vercel:"
echo "  - MONGODB_URI"
echo "  - JWT_SECRET"
echo "  - FRONTEND_URL"
echo ""
print_status "¡Sistema listo para usar!"
