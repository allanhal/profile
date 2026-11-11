FROM node:24-alpine AS build
WORKDIR /app
COPY build.mjs index.html index.css index.js data.json ./
COPY images/ ./images/
ARG GIT_COMMIT=unknown
RUN GIT_COMMIT="$GIT_COMMIT" node build.mjs

FROM nginxinc/nginx-unprivileged:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/
EXPOSE 8080
