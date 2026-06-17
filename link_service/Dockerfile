FROM python:3.11-slim

WORKDIR /app/link_service

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app/link-service

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host" , "0.0.0.0", "--port" , "8000"]
