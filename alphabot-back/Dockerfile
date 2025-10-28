FROM python:3.11-slim

WORKDIR /app

# 시스템 패키지 (psycopg binary 사용하므로 빌드 툴 불필요)

# 의존성 파일 복사 및 설치
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# 앱 소스는 docker-compose에서 볼륨으로 마운트하여 핫리로드

ENV PYTHONUNBUFFERED=1
EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--reload", "--log-level", "warning"]


