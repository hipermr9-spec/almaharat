# ---------- FRONTEND BUILD ----------
FROM node:20 AS frontend

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- BACKEND ----------
FROM python:3.9-slim

WORKDIR /app

COPY Backend ./Backend

COPY --from=frontend /app/dist ./Backend/Python/static

RUN pip3 install --no-cache-dir -r Backend/Python/requirements.txt

EXPOSE 8080

CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:$PORT --chdir Backend/Python app:app"]