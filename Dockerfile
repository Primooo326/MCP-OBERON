# =================================================================
# Fase 1: Construcción (Instalar dependencias)
# =================================================================
# Usamos una imagen oficial de Node.js (versión 20 LTS, Alpine es ligera)
FROM node:20-alpine AS builder

# Establecemos el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copiamos package.json y package-lock.json para instalar dependencias
# Se copian por separado para aprovechar el caché de Docker
COPY package*.json ./

# Instalamos las dependencias de producción de forma limpia
RUN npm ci --only=production

# =================================================================
# Fase 2: Producción (Crear la imagen final y ligera)
# =================================================================
FROM node:20-alpine

WORKDIR /usr/src/app

# Copiamos las dependencias ya instaladas desde la fase de 'builder'
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copiamos el resto del código de la aplicación
COPY . .

# Exponemos el puerto 3001, que es donde correrá nuestra app
EXPOSE 3001

# Comando para iniciar la aplicación cuando el contenedor se lance
# Asegúrate de que tu package.json tiene un script "start"
CMD [ "npm", "start" ]