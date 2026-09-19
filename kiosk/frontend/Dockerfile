# Vite 8 requires Node >= 20.19; node:18 cannot run the build at all.
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
RUN rm /etc/nginx/conf.d/default.conf
# nginx:alpine runs envsubst over /etc/nginx/templates/*.template at startup, which is how
# TERMINAL_KEY reaches the proxy without ever being built into the JavaScript bundle.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html
ENV TERMINAL_KEY=""
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
