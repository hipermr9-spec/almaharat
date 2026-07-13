# ---------- FRONTEND BUILD ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# أضف هذا السطر لإعطاء صلاحيات التنفيذ لـ vite
RUN chmod +x ./node_modules/.bin/vite

RUN npm run build

# ---------- FINAL: Python backend + serves frontend ----------
FROM python:3.9-slim
RUN apt-get update && apt-get install -y --no-install-recommends nodejs npm && rm -rf /var/lib/apt/lists/*
RUN npm install -g serve gunicorn

WORKDIR /app

# Copy built frontend
COPY --from=build /app/dist ./dist

# Install serve for frontend
RUN npm install -g serve

# Install backend deps
COPY Backend ./Backend
RUN pip3 install --no-cache-dir -r Backend/Python/requirements.txt

EXPOSE 8080

# Start both: backend on 5000, serve frontend on 8080
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:5000 --chdir Backend/Python app:app & serve -s dist -l 8080"] 