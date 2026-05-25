# ---------- FRONTEND BUILD ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- BACKEND (serves frontend too) ----------
FROM python:3.9-slim
WORKDIR /app

COPY Backend ./Backend
RUN pip3 install --no-cache-dir -r Backend/Python/requirements.txt

# Copy built frontend into Flask static folder
COPY --from=build /app/dist ./Backend/Python/static

EXPOSE 8080
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--chdir", "Backend/Python", "app:app"]