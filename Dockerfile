# ---------- FRONTEND BUILD (Node) ----------
FROM node:18 as frontend

WORKDIR /frontend

COPY Frontend ./Frontend

WORKDIR /frontend/Frontend

RUN npm install
RUN npm run build


# ---------- BACKEND (Python) ----------
FROM python:3.9-slim

WORKDIR /app

# copy backend
COPY Backend ./Backend

# copy built frontend from node stage
COPY --from=frontend /frontend/Frontend/dist ./Backend/Python/static

RUN pip install --no-cache-dir -r Backend/Python/requirements.txt

ENV FLASK_APP=Backend/Python/app.py

EXPOSE 8080

CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--chdir", "/app/Backend/Python", "--workers", "2", "app:app"]