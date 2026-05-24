# ---------- FRONTEND BUILD ----------
FROM node:20 AS frontend

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npm run build


# ---------- BACKEND ----------
FROM python:3.9-slim

WORKDIR /app

# نسخ الباك إند
COPY Backend ./Backend

# نسخ ناتج الفرونت (Vite = dist)
COPY --from=frontend /app/dist ./Backend/Python/static

RUN pip install --no-cache-dir -r Backend/Python/requirements.txt

EXPOSE 8080

# تشغيل السيرفر على Railway port
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:$PORT --chdir Backend/Python app:app"]