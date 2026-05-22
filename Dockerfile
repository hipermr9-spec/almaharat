FROM python:3.9-slim
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r Backend/Python/requirements.txt
ENV FLASK_APP=Backend/Python/app.py
ENV FLASK_ENV=development
EXPOSE 5000
CMD ["flask", "run", "--host=0.0.0.0"]
