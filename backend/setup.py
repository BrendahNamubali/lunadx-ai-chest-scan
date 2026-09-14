import os
import requests
import logging

logger = logging.getLogger(__name__)

def download_chexnet_weights(model_path: str = "models/chexnet.pth") -> bool:
    """
    Download pre-trained CheXNet model weights.
    Since the original CheXNet weights aren't publicly available,
    we'll create a model based on DenseNet-121 with ImageNet weights.
    """
    try:
        logger.info("🔄 Setting up CheXNet model...")
        
        # Create models directory
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        
        # We'll create the model on first run instead of downloading
        # This is more reliable than trying to find external weights
        logger.info("✅ Model will be created on first run")
        logger.info("📝 Using ImageNet-pretrained DenseNet-121 as base")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to setup model: {e}")
        return False

def setup_groq_api():
    """Guide user through Groq API setup"""
    print("🔑 Setting up Groq API for AI report generation...")
    print()
    print("1. Go to https://console.groq.com/keys")
    print("2. Create a free account or sign in")
    print("3. Generate a new API key")
    print("4. Add it to your .env file:")
    print()
    print("   GROQ_API_KEY=gsk_your_actual_key_here")
    print()
    print("Benefits of Groq API:")
    print("- 🚀 Fast LLM inference (Llama 3.3 70B)")
    print("- 💰 Free tier available")
    print("- 🧠 Better medical report generation")
    print("- 🔄 Fallback to template if API fails")

def check_gpu_support():
    """Check GPU availability and provide setup guidance"""
    try:
        import torch
        
        if torch.cuda.is_available():
            gpu_count = torch.cuda.device_count()
            gpu_name = torch.cuda.get_device_name(0)
            memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
            
            print(f"🔥 GPU Support Available!")
            print(f"   GPU: {gpu_name}")
            print(f"   Memory: {memory:.1f} GB")
            print(f"   Devices: {gpu_count}")
            print()
            print("✅ PyTorch will automatically use GPU for inference")
            return True
        else:
            print("💻 No GPU detected - will use CPU")
            print()
            print("To enable GPU support:")
            print("1. Install CUDA-compatible PyTorch:")
            print("   pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118")
            print("2. Ensure NVIDIA drivers are installed")
            print("3. Check CUDA installation: nvidia-smi")
            return False
            
    except ImportError:
        print("⚠️ PyTorch not installed - run setup first")
        return False

if __name__ == "__main__":
    print("🏥 LunaDX Backend Setup")
    print("=" * 40)
    
    # Check GPU support
    check_gpu_support()
    print()
    
    # Setup model
    download_chexnet_weights()
    print()
    
    # Setup API
    setup_groq_api()
    print()
    
    print("🎯 Setup complete! Run 'python main.py' to start the server.")
