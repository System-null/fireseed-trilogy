FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash curl ca-certificates libgomp1 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . /app
ENV LOCAL_FILES_ONLY=0
RUN bash scripts/warmup_model.sh
RUN mkdir -p /app/static/og
COPY static/og/.gitkeep /app/static/og/
ENV HF_HUB_DISABLE_TELEMETRY=1 HF_HUB_ENABLE_HF_TRANSFER=1 PYTHONUNBUFFERED=1
CMD ["uvicorn", "server.app:app", "--host", "0.0.0.0", "--port", "8000"]
