#!/bin/bash

# LunaDX Production Environment Setup (Linux/Mac)

set -e

echo "🚀 Setting up LunaDX Production Environment..."

# Check Python version
python_version=$(python3 --version 2>&1 | grep -oP '\d+\.\d+')
echo "Found Python $python_version"

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv lunadx_env

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source lunadx_env/bin/activate

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install production dependencies
echo "📦 Installing production dependencies..."
pip install -r backend/requirements-production.txt

# Setup database
echo "🗄️ Setting up database..."
cd backend
python database.py

# Create environment file
if [ ! -f .env ]; then
    echo "📝 Creating .env from production template..."
    cp backend/.env.production .env
    echo "✅ Created .env from production template"
fi

echo ""
echo "✅ Production environment setup complete!"
echo ""
echo "📋 Environment Details:"
echo "   Virtual Environment: lunadx_env"
echo "   Python: Using venv Python"
echo "   Database: PostgreSQL ready"
echo "   Default Users: Created in database"
echo ""
echo "🚀 To start the server:"
echo "   1. Activate environment: source lunadx_env/bin/activate"
echo "   2. Start server: cd backend && python main.py"
echo ""
echo "🌐 Server will run on: http://127.0.0.1:8000"
echo "📚 API Docs: http://127.0.0.1:8000/docs"
echo ""

# Ask if user wants to start server now
read -p "Start server now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting LunaDX server..."
    python main.py
else
    echo "Environment is ready. Run 'source lunadx_env/bin/activate' to activate."
fi
