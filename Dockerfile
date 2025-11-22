# 1. Aşama: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Paket dosyasını kopyala (Hata buradaydı, düzelttik)
COPY package.json ./

# Paketleri yükle
RUN npm install

# Dosyaları kopyala
COPY . .

# API Anahtarını güvenli bir şekilde içeri al
ARG VITE_GEMINI_API_KEY
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY

# React projesini derle
RUN npm run build

# 2. Aşama: Sunum (Nginx)
FROM nginx:alpine

# Varsayılan Nginx ayarını sil
RUN rm /etc/nginx/conf.d/default.conf

# Özel Nginx ayarını oluştur
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
        add_header Content-Security-Policy "default-src * data: blob: \047unsafe-inline\047 \047unsafe-eval\047;"; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Dosyaları taşı
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
