# 🚀 Despliegue en Vercel - Sistema de Hotelería

## 📋 **OPCIONES DE DESPLIEGUE EN VERCEL**

### **Opción 1: Frontend + Backend Separados (RECOMENDADO)**
- **Frontend**: Vercel (Angular)
- **Backend**: Vercel (Node.js) o MongoDB Atlas

### **Opción 2: Todo en Vercel (LIMITADO)**
- **Frontend**: Vercel (Angular)
- **Backend**: Vercel Serverless Functions
- **Base de datos**: MongoDB Atlas

---

## 🎯 **OPCIÓN 1: DESPLIEGUE SEPARADO (RECOMENDADO)**

### **Paso 1: Desplegar Frontend**

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Navegar al frontend
cd Frontend-Hoteleria

# 3. Login en Vercel
vercel login

# 4. Desplegar
vercel --prod
```

**Configuración en Vercel Dashboard:**
- **Framework Preset**: Angular
- **Build Command**: `npm run build`
- **Output Directory**: `dist/frontend-hoteleria`
- **Install Command**: `npm install`

### **Paso 2: Desplegar Backend**

```bash
# 1. Navegar al backend
cd Backend-Hoteleria

# 2. Desplegar
vercel --prod
```

**Variables de Entorno en Vercel:**
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/hoteleria
JWT_SECRET=tu-jwt-secret-super-seguro
FRONTEND_URL=https://tu-frontend.vercel.app
```

### **Paso 3: Configurar MongoDB Atlas**

1. **Crear cuenta en MongoDB Atlas**
2. **Crear cluster gratuito**
3. **Configurar usuario y contraseña**
4. **Obtener connection string**
5. **Configurar en variables de entorno de Vercel**

---

## 🎯 **OPCIÓN 2: TODO EN VERCEL (Serverless)**

### **Limitaciones:**
- ⚠️ **Timeout**: 30 segundos máximo por función
- ⚠️ **Cold starts**: Latencia en primera ejecución
- ⚠️ **Base de datos**: Solo MongoDB Atlas (no local)
- ⚠️ **Archivos**: No persistencia de archivos

### **Configuración:**

```bash
# 1. Navegar al frontend
cd Frontend-Hoteleria

# 2. Instalar dependencias del backend
npm install mongodb bcryptjs jsonwebtoken

# 3. Desplegar
vercel --prod
```

---

## 🔧 **CONFIGURACIÓN DETALLADA**

### **Variables de Entorno en Vercel:**

#### **Frontend:**
```env
NODE_ENV=production
```

#### **Backend:**
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/hoteleria?retryWrites=true&w=majority
JWT_SECRET=tu-jwt-secret-super-seguro-aqui
JWT_EXPIRES_IN=24h
FRONTEND_URL=https://tu-frontend.vercel.app
```

### **Configuración de Dominio:**

1. **En Vercel Dashboard:**
   - Ir a Settings → Domains
   - Agregar tu dominio personalizado
   - Configurar DNS

2. **Configurar DNS:**
   ```
   A     @     76.76.19.61
   CNAME www   cname.vercel-dns.com
   ```

---

## 📊 **VENTAJAS Y DESVENTAJAS**

### **✅ VENTAJAS DE VERCEL:**

#### **Frontend:**
- ✅ **Deploy automático** desde Git
- ✅ **CDN global** para velocidad
- ✅ **SSL automático**
- ✅ **Preview deployments**
- ✅ **Analytics integrado**

#### **Backend:**
- ✅ **Serverless** (paga solo por uso)
- ✅ **Escalado automático**
- ✅ **Deploy rápido**
- ✅ **Integración con Git**

### **⚠️ LIMITACIONES:**

#### **Backend:**
- ⚠️ **Timeout de 30s** por función
- ⚠️ **Cold starts** (latencia inicial)
- ⚠️ **No persistencia** de archivos
- ⚠️ **Limitado** para operaciones largas

#### **Base de Datos:**
- ⚠️ **Solo MongoDB Atlas** (no local)
- ⚠️ **Costo adicional** para Atlas
- ⚠️ **Dependencia externa**

---

## 🚀 **PROCESO DE DESPLIEGUE PASO A PASO**

### **1. Preparar Repositorio**

```bash
# Crear repositorio en GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/tu-usuario/hoteleria.git
git push -u origin main
```

### **2. Conectar con Vercel**

1. **Ir a vercel.com**
2. **Login con GitHub**
3. **Importar proyecto**
4. **Configurar variables de entorno**
5. **Deploy**

### **3. Configurar MongoDB Atlas**

1. **Crear cuenta en atlas.mongodb.com**
2. **Crear cluster gratuito**
3. **Configurar usuario**
4. **Obtener connection string**
5. **Configurar en Vercel**

### **4. Configurar Dominio (Opcional)**

1. **Comprar dominio**
2. **Configurar en Vercel**
3. **Actualizar DNS**

---

## 🔍 **VERIFICACIÓN POST-DESPLIEGUE**

### **Frontend:**
```bash
# Verificar que carga correctamente
curl https://tu-frontend.vercel.app

# Verificar API calls
curl https://tu-frontend.vercel.app/api
```

### **Backend:**
```bash
# Verificar API
curl https://tu-backend.vercel.app/api

# Verificar health check
curl https://tu-backend.vercel.app/api/health
```

---

## 💰 **COSTOS ESTIMADOS**

### **Vercel:**
- **Hobby Plan**: Gratis (100GB bandwidth/mes)
- **Pro Plan**: $20/mes (1TB bandwidth/mes)

### **MongoDB Atlas:**
- **M0 (Gratuito)**: 512MB storage
- **M2**: $9/mes (2GB storage)
- **M5**: $25/mes (5GB storage)

### **Total Estimado:**
- **Desarrollo/Testing**: $0/mes
- **Producción Pequeña**: $20-30/mes
- **Producción Media**: $50-100/mes

---

## 🎯 **RECOMENDACIÓN FINAL**

### **Para tu caso específico:**

**✅ RECOMENDADO: Opción 1 (Separado)**
- Frontend en Vercel
- Backend en Vercel
- MongoDB Atlas

**Razones:**
1. **Mejor performance** para el backend
2. **Más control** sobre la configuración
3. **Escalabilidad** independiente
4. **Debugging** más fácil

### **Pasos Inmediatos:**
1. **Crear cuenta en Vercel**
2. **Crear cuenta en MongoDB Atlas**
3. **Configurar repositorio en GitHub**
4. **Desplegar frontend**
5. **Desplegar backend**
6. **Configurar variables de entorno**
7. **¡Probar el sistema!**

---

**¡Tu sistema está perfectamente preparado para Vercel!** 🎉
