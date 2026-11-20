FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine AS web
COPY deploy/nginx-container.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/frontend/dist/ /usr/share/nginx/html/

FROM php:8.3-fpm-alpine AS api
RUN apk add --no-cache postgresql-dev oniguruma-dev curl-dev \
    && docker-php-ext-install pdo_pgsql pdo_mysql mbstring curl
WORKDIR /var/www
COPY backend/ ./backend/
RUN test ! -f backend/config/config.php
