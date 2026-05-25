# ---------- FRONTEND BUILD ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
RUN echo 'server{listen 8080;root /usr/share/nginx/html;index index.html;location/{try_files $uri $uri/ /index.html;}}' > /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]

# ---------- BACKEND ----------
FROM python:3.9-slim
WORKDIR /app
COPY Backend ./Backend
RUN pip3 install --no-cache-dir -r Backend/Python/requirements.txt
EXPOSE 8080
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:8080 --chdir Backend/Python app:app"]