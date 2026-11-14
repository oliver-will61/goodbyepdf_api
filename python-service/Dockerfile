# serviço de conversão (FastAPI): interno, acessado apenas pelo Express
FROM python:3.13-slim
WORKDIR /app
# LibreOffice sem interface gráfica (Calc), usado na conversão Excel -> PDF,
# e fontes livres compatíveis em métricas com Arial/Calibri/Times (evita texto desalinhado)
RUN apt-get update \
    && apt-get install -y --no-install-recommends libreoffice-calc-nogui fonts-liberation fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000", "--workers", "4"]
