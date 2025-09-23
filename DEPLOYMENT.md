# 🚀 Guía de Despliegue - Sistema de Hotelería

## 📋 **REQUISITOS PREVIOS**

### **Servidor de Producción:**
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **RAM**: Mínimo 2GB, recomendado 4GB+
- **CPU**: Mínimo 2 cores
- **Disco**: Mínimo 20GB de espacio libre
- **Red**: Puerto 80, 443, 3000 abiertos

### **Software Requerido:**
- **Node.js**: v18.0.0+
- **npm**: v8.0.0+
- **MongoDB**: v6.0+
- **PM2**: Para gestión de procesos
- **Nginx**: Para proxy reverso (opcional)

## 🔧 **CONFIGURACIÓN INICIAL**

### **1. Preparar el Servidor**

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 globalmente
sudo npm install -g pm2

# Instalar MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Iniciar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### **2. Configurar Variables de Entorno**

```bash
# Crear archivo .env en Backend-Hoteleria/
cd Backend-Hoteleria
cp env.example .env

# Editar variables de entorno
nano .env
```

**Variables importantes a configurar:**
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/hoteleria
JWT_SECRET=tu-jwt-secret-super-seguro-aqui
FRONTEND_URL=https://tu-dominio.com
```

### **3. Instalar Dependencias**

```bash
# Backend
cd Backend-Hoteleria
npm install --production

# Frontend
cd ../Frontend-Hoteleria
npm install
```

## 🏗️ **DESPLIEGUE CON DOCKER (RECOMENDADO)**

### **1. Instalar Docker**

```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### **2. Desplegar con Docker Compose**

```bash
# Clonar o copiar el proyecto al servidor
git clone <tu-repositorio> hoteleria
cd hoteleria

# Configurar variables de entorno
cp Backend-Hoteleria/env.example Backend-Hoteleria/.env
nano Backend-Hoteleria/.env

# Construir y ejecutar
docker-compose up -d --build

# Verificar que todo esté funcionando
docker-compose ps
docker-compose logs -f
```

## 🚀 **DESPLIEGUE MANUAL**

### **1. Construir Frontend**

```bash
cd Frontend-Hoteleria

# Construir para producción
npm run build

# Los archivos se generan en dist/frontend-hoteleria/
```

### **2. Configurar Nginx (Frontend)**

```bash
# Instalar Nginx
sudo apt install nginx -y

# Copiar archivos construidos
sudo cp -r dist/frontend-hoteleria/* /var/www/html/

# Configurar Nginx
sudo nano /etc/nginx/sites-available/hoteleria
```

**Configuración de Nginx:**
```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/hoteleria /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### **3. Configurar Backend con PM2**

```bash
cd Backend-Hoteleria

# Instalar PM2
npm install -g pm2

# Iniciar con PM2
pm2 start ecosystem.config.js --env production

# Configurar PM2 para iniciar automáticamente
pm2 startup
pm2 save
```

## 🔐 **CONFIGURACIÓN DE SEGURIDAD**

### **1. Firewall**

```bash
# Configurar UFW
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw enable
```

### **2. SSL/HTTPS (Let's Encrypt)**

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado SSL
sudo certbot --nginx -d tu-dominio.com

# Verificar renovación automática
sudo certbot renew --dry-run
```

### **3. Crear Usuario Administrador**

```bash
cd Backend-Hoteleria
node scripts/createAdmin.js
```

## 📊 **MONITOREO Y MANTENIMIENTO**

### **1. Logs**

```bash
# Ver logs de PM2
pm2 logs

# Ver logs de Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Ver logs de MongoDB
sudo tail -f /var/log/mongodb/mongod.log
```

### **2. Backup de Base de Datos**

```bash
# Crear backup
mongodump --db hoteleria --out /backup/$(date +%Y%m%d)

# Restaurar backup
mongorestore --db hoteleria /backup/20240101/hoteleria
```

### **3. Actualizaciones**

```bash
# Actualizar aplicación
git pull origin main
cd Backend-Hoteleria && npm install
cd ../Frontend-Hoteleria && npm install && npm run build
pm2 restart all
```

## 🚨 **SOLUCIÓN DE PROBLEMAS**

### **Problemas Comunes:**

1. **Error de conexión a MongoDB:**
   ```bash
   sudo systemctl status mongod
   sudo systemctl restart mongod
   ```

2. **Error de permisos:**
   ```bash
   sudo chown -R $USER:$USER /var/www/html
   ```

3. **Puerto en uso:**
   ```bash
   sudo lsof -i :3000
   sudo kill -9 <PID>
   ```

4. **Verificar servicios:**
   ```bash
   pm2 status
   sudo systemctl status nginx
   sudo systemctl status mongod
   ```

## 📞 **SOPORTE**

Para soporte técnico o reportar problemas:
- **Email**: soporte@tu-dominio.com
- **Documentación**: [Enlace a documentación]
- **Issues**: [Enlace a repositorio de issues]

---

**¡Sistema listo para producción!** 🎉
