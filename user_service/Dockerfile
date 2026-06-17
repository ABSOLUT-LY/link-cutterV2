FROM python:3.11-slim

WORKDIR /app/user_service

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app/user_service

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host" , "0.0.0.0", "--port" , "8001"]
