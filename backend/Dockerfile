FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends fonts-nanum && rm -rf /var/lib/apt/lists/*
RUN groupadd -r app && useradd -r -g app -u 1000 app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PYTHONUNBUFFERED=1
USER app
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8000"]
