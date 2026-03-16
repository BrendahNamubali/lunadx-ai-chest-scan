#!/bin/bash

# LunaDX Backend Setup Script
# This script sets up the environment with GPU support

echo "🚀 Setting up LunaDX Backend with GPU support..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Upgrade pip
echo "⬆️ Upgrading pip..."
pip install --upgrade pip

# Install PyTorch with CUDA support
echo "🔥 Installing PyTorch with CUDA support..."
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# Install other dependencies
echo "📚 Installing other dependencies..."
pip install -r requirements.txt

# Create models directory
echo "📁 Creating models directory..."
mkdir -p models

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Get a Groq API key from https://console.groq.com/keys"
echo "2. Add it to .env file: GROQ_API_KEY=your_key_here"
echo "3. Run the server: python main.py"
echo ""
echo "🔥 GPU support will be automatically detected if available."
