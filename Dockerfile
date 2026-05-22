FROM python:3.9-slim
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r Backend/Python/requirements.txt
ENV FLASK_APP=Backend/Python/app.py
ENV FLASK_ENV=development
EXPOSE 5000
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-8080} --pythonpath Backend/Python app:app"]