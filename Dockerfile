# 1. Aşama: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Paket dosyasını kopyala
COPY package.json ./

# Paketleri yükle
RUN npm install

# Dosyaları kopyala
COPY . .

# API Anahtarını al
ARG VITE_GEMINI_API_KEY
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY

# React projesini derle
RUN npm run build

# 2. Aşama: Sunum (Nginx)
FROM nginx:alpine

# Oluşturduğumuz temiz nginx.conf dosyasını sunucuya kopyala
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Derlenen siteyi kopyala
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
