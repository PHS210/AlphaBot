# Backend-only production image for FastAPI
FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies
COPY alphabot-back/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy application source
COPY alphabot-back/app /app/app

ENV PYTHONUNBUFFERED=1
EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]