FROM nginxinc/nginx-unprivileged:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html index.css index.js data.json /usr/share/nginx/html/
COPY images/ /usr/share/nginx/html/images/

ARG GIT_COMMIT=unknown
USER root
RUN printf '%s\n' "$GIT_COMMIT" > /usr/share/nginx/html/version.txt
USER nginx

EXPOSE 8080
