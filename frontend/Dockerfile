FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM nginxinc/nginx-unprivileged:stable-alpine
COPY --chmod=0644 nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/kibaru/browser /usr/share/nginx/html
RUN nginx -t
EXPOSE 8080
