# Stage 1: Build
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./

# Clean install dependencies
RUN npm install

COPY . .

# Capture API Key from Coolify Build Arguments
ARG API_KEY
# Expose it as an Environment Variable so Vite can access it during build
ENV API_KEY=$API_KEY

RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

# Copy the build output to Nginx's html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy the custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
