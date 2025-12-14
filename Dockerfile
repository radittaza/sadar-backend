FROM python:3.11-slim

WORKDIR /app

# copy requirements dari folder backend
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# copy seluruh folder backend
COPY backend/ /app/

# jalankan FastAPI
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
