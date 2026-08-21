FROM python:3.9-slim

WORKDIR /app

# Backend only — no Node/npm/frontend build needed here
COPY Backend ./Backend
RUN pip3 install --no-cache-dir -r Backend/Python/requirements.txt gunicorn

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--chdir", "Backend/Python", "app:app"]