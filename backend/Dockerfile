FROM python:3.11-slim

WORKDIR /app

# Install system runtime & compilation tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code and sqlite dataset for migration
COPY . .

# Normalize line endings and execution permissions on entrypoint
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/bin/bash", "entrypoint.sh"]
