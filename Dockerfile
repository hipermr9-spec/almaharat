FROM python:3.9-slim
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r Backend/Python/requirements.txt
ENV FLASK_APP=Backend/Python/app.py
EXPOSE 8080
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--chdir", "/app/Backend/Python", "--workers", "2", "app:app"]