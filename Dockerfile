# LunaDX Production Docker Setup
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ .

# Create directories
RUN mkdir -p /app/models /app/logs

# Set environment variables
ENV DATABASE_URL=postgresql://lunadx:password@db:5432/lunadx
ENV GROQ_API_KEY=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
ENV MODEL_PATH=/app/models/chexnet.pth
ENV SIMULATION_MODE=false

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
