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

# Supabase + app configuration
# These values should be provided through the host environment or a .env file when running Docker.
ARG SUPABASE_URL=https://yykqafwozfpropcbuqjm.supabase.co
ARG SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ARG VITE_SUPABASE_URL=https://yykqafwozfpropcbuqjm.supabase.co
ARG VITE_SUPABASE_PROJECT_ID=yykqafwozfpropcbuqjm
ARG VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ExSGmHmFwNDOOdd_c-RaLw_dzKY8kH6
ARG DEFAULT_SUPER_ADMIN_EMAIL=admin@lunadx.com
ARG DEFAULT_SUPER_ADMIN_PASSWORD=admin123
ARG DEFAULT_SUPER_ADMIN_FULL_NAME=LunaDX Administrator
ARG IOTEC_CLIENT_ID=pay-01a0b4d5-9ee8-7489-a2a0-917d7e7dc30d
ARG IOTEC_CLIENT_SECRET
ARG IOTEC_WALLET_ID=01a0b4d5-9f92-70cf-aa3d-f09ae93aff07
ARG IOTEC_GRANT_TYPE=client_credentials
ARG IOTEC_AUTH_URL=https://id.iotec.io/connect/token
ARG IOTEC_API_BASE=https://pay.iotec.io/api

ENV DATABASE_URL=postgresql://lunadx:password@db:5432/lunadx
ENV GROQ_API_KEY=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
ENV MODEL_PATH=/app/models/chexnet.pth
ENV SIMULATION_MODE=false
ENV SUPABASE_URL=${SUPABASE_URL}
ENV SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
ENV SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_PROJECT_ID=${VITE_SUPABASE_PROJECT_ID}
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
ENV DEFAULT_SUPER_ADMIN_EMAIL=${DEFAULT_SUPER_ADMIN_EMAIL}
ENV DEFAULT_SUPER_ADMIN_PASSWORD=${DEFAULT_SUPER_ADMIN_PASSWORD}
ENV DEFAULT_SUPER_ADMIN_FULL_NAME=${DEFAULT_SUPER_ADMIN_FULL_NAME}
ENV IOTEC_CLIENT_ID=${IOTEC_CLIENT_ID}
ENV IOTEC_CLIENT_SECRET=${IOTEC_CLIENT_SECRET}
ENV IOTEC_WALLET_ID=${IOTEC_WALLET_ID}
ENV IOTEC_GRANT_TYPE=${IOTEC_GRANT_TYPE}
ENV IOTEC_AUTH_URL=${IOTEC_AUTH_URL}
ENV IOTEC_API_BASE=${IOTEC_API_BASE}

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
