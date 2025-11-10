FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential wget curl git \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./

# requirements.txt 里已剔除 faiss；如代码里 import 了 faiss，则固定一个可用版本
RUN sed -i '/faiss-cpu/d' requirements.txt && \
    pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install faiss-cpu==1.7.4

COPY . /app

# 兼容旧路径：让 /models 指向 /app/models
RUN mkdir -p /app/models && ln -sf /app/models /models

ENV PYTHONUNBUFFERED=1
ENV LOCAL_FILES_ONLY=0

# 预热模型（网络不稳时可先注释掉这一行，容器启动后再执行脚本）
RUN bash scripts/warmup_model.sh

EXPOSE 8000
CMD ["uvicorn","server.app:app","--host","0.0.0.0","--port","8000"]
