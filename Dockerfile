# --------- Frontend build stage ---------
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend

COPY alphabot-front/package*.json ./
RUN npm ci

COPY alphabot-front/ .
RUN npm run build


# --------- Backend runtime stage ---------
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    FRONTEND_BUILD_DIR=/app/frontend \
    PORT=8080

WORKDIR /app

# Install system deps (if future builds need, keep minimal)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
 && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY alphabot-back/requirements.txt ./requirements.txt
RUN pip install -r requirements.txt

# Copy backend source
COPY alphabot-back/app ./app
COPY alphabot-back/alembic ./alembic
COPY alphabot-back/alembic.ini ./alembic.ini

# Copy built frontend assets
COPY --from=frontend-builder /frontend/dist ${FRONTEND_BUILD_DIR}

EXPOSE 8080

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]