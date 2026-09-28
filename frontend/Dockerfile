# ---------- Build ----------
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production

# ---------- Runtime (nginx sin privilegios, puerto 8080) ----------
FROM nginxinc/nginx-unprivileged:alpine
# Parches de seguridad del sistema base; luego se vuelve al usuario sin privilegios
USER root
RUN apk upgrade --no-cache
USER 101
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/index.html >/dev/null || exit 1
