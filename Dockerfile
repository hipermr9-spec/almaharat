# ---------- FRONTEND BUILD (Node) ----------
FROM node:18 AS frontend

WORKDIR /app

# نسخ ملفات npm من root
COPY package.json package-lock.json ./
RUN npm install

# نسخ باقي المشروع
COPY . .

# build
RUN npm run build


# ---------- BACKEND (Python) ----------
FROM python:3.9-slim

WORKDIR /app

COPY Backend ./Backend

# أخذ build الناتج (عدّل المسار حسب Vite/React output)
COPY --from=frontend /app/dist ./Backend/Python/static

RUN pip install --no-cache-dir -r Backend/Python/requirements.txt

ENV FLASK_APP=Backend/Python/app.py

EXPOSE 8080

CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--chdir", "/app/Backend/Python", "--workers", "2", "app:app"]