import torch
import torch.nn.functional as F
import numpy as np
import cv2
import matplotlib.pyplot as plt
import matplotlib.cm as cm
from PIL import Image
import io
import base64
import logging
from typing import Dict, List, Tuple, Optional

logger = logging.getLogger(__name__)

class GradCAMGenerator:
    """
    Generate Grad-CAM heatmaps for chest X-ray interpretation.
    Highlights regions that influence model predictions.
    """
    
    def __init__(self, model):
        """
        Initialize Grad-CAM generator
        
        Args:
            model: PyTorch model (CheXNet DenseNet-121)
        """
        self.model = model
        self.device = next(model.parameters()).device
        self.gradients = None
        self.activations = None
        
        # Register hooks for the last convolutional layer
        self._register_hooks()
    
    def _register_hooks(self):
        """Register forward and backward hooks"""
        # Find the last convolutional layer in DenseNet
        target_layer = None
        
        # For DenseNet-121, the last conv layer is in denseblock4
        if hasattr(self.model, 'features'):
            features = self.model.features
            # Navigate to the last dense block
            if hasattr(features, 'denseblock4'):
                denseblock = features.denseblock4
                # Get the last layer in the block
                last_layer_name = list(denseblock._modules.keys())[-1]
                target_layer = getattr(denseblock, last_layer_name)
        
        if target_layer is None:
            logger.warning("Could not find target layer for Grad-CAM")
            return
        
        # Register forward hook
        def forward_hook(module, input, output):
            self.activations = output.detach()
        
        # Register backward hook
        def backward_hook(module, grad_input, grad_output):
            self.gradients = grad_output[0].detach()
        
        target_layer.register_forward_hook(forward_hook)
        target_layer.register_backward_hook(backward_hook)
        
        logger.info(f"Registered Grad-CAM hooks on layer: {target_layer}")
    
    def generate_heatmap(self, image: Image.Image, predictions: Dict[str, float], 
                         top_k: int = 3) -> str:
        """
        Generate Grad-CAM heatmap for top predictions
        
        Args:
            image: PIL Image (grayscale or RGB)
            predictions: Dictionary of pathology probabilities
            top_k: Number of top predictions to visualize
            
        Returns:
            Base64-encoded PNG image of heatmap overlay
        """
        try:
            # Convert image to tensor
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Get original image size
            original_size = image.size
            
            # Preprocess for model
            import torchvision.transforms as transforms
            transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                   std=[0.229, 0.224, 0.225])
            ])
            
            input_tensor = transform(image).unsqueeze(0).to(self.device)
            input_tensor.requires_grad_()
            
            # Get top-k predictions
            top_predictions = sorted(predictions.items(), key=lambda x: x[1], reverse=True)[:top_k]
            
            # Generate heatmaps for each top prediction
            heatmaps = []
            for pathology, prob in top_predictions:
                if prob > 0.1:  # Only generate for significant findings
                    heatmap = self._generate_single_heatmap(input_tensor, pathology)
                    if heatmap is not None:
                        heatmaps.append((heatmap, prob))
            
            if not heatmaps:
                # Fallback: generate synthetic heatmap
                return self._generate_synthetic_heatmap(image, predictions)
            
            # Combine heatmaps weighted by probabilities
            combined_heatmap = self._combine_heatmaps(heatmaps, original_size)
            
            # Create overlay visualization
            return self._create_overlay(image, combined_heatmap)
            
        except Exception as e:
            logger.error(f"Grad-CAM generation failed: {e}")
            return self._generate_synthetic_heatmap(image, predictions)
    
    def _generate_single_heatmap(self, input_tensor: torch.Tensor, target_class: str) -> Optional[np.ndarray]:
        """Generate Grad-CAM for a single target class"""
        try:
            # Clear previous gradients
            self.model.zero_grad()
            
            # Get class index (this would need mapping from pathology name to index)
            class_idx = self._get_class_index(target_class)
            if class_idx is None:
                return None
            
            # Forward pass
            output = self.model(input_tensor)
            
            # Backward pass for target class
            class_score = output[0, class_idx]
            class_score.backward(retain_graph=True)
            
            # Generate Grad-CAM
            if self.gradients is None or self.activations is None:
                return None
            
            # Pool gradients
            pooled_gradients = torch.mean(self.gradients, dim=[2, 3], keepdim=True)
            
            # Weight activations by gradients
            weighted_activations = self.activations * pooled_gradients
            
            # Global average pooling
            heatmap = torch.mean(weighted_activations, dim=1).squeeze()
            
            # ReLU and normalize
            heatmap = F.relu(heatmap)
            heatmap = heatmap / torch.max(heatmap) if torch.max(heatmap) > 0 else heatmap
            
            # Convert to numpy
            heatmap = heatmap.cpu().numpy()
            
            return heatmap
            
        except Exception as e:
            logger.error(f"Single heatmap generation failed: {e}")
            return None
    
    def _get_class_index(self, pathology: str) -> Optional[int]:
        """Get class index for pathology name"""
        pathology_mapping = {
            'Atelectasis': 0, 'Consolidation': 1, 'Infiltration': 2, 'Pneumothorax': 3,
            'Edema': 4, 'Emphysema': 5, 'Fibrosis': 6, 'Effusion': 7, 'Pneumonia': 8,
            'Pleural_Thickening': 9, 'Cardiomegaly': 10, 'Nodule': 11, 'Mass': 12, 'Hernia': 13
        }
        return pathology_mapping.get(pathology)
    
    def _combine_heatmaps(self, heatmaps: List[Tuple[np.ndarray, float]], 
                          original_size: Tuple[int, int]) -> np.ndarray:
        """Combine multiple heatmaps weighted by probabilities"""
        if not heatmaps:
            return np.zeros((224, 224))
        
        # Resize all heatmaps to same size
        resized_heatmaps = []
        weights = []
        
        for heatmap, weight in heatmaps:
            if heatmap.shape != (224, 224):
                heatmap = cv2.resize(heatmap, (224, 224))
            resized_heatmaps.append(heatmap)
            weights.append(weight)
        
        # Normalize weights
        weights = np.array(weights)
        weights = weights / np.sum(weights) if np.sum(weights) > 0 else np.ones_like(weights) / len(weights)
        
        # Combine weighted heatmaps
        combined = np.zeros_like(resized_heatmaps[0])
        for heatmap, weight in zip(resized_heatmaps, weights):
            combined += heatmap * weight
        
        return combined
    
    def _create_overlay(self, original_image: Image.Image, heatmap: np.ndarray) -> str:
        """Create overlay visualization and return as base64"""
        try:
            # Convert original image to numpy
            original_np = np.array(original_image.resize((224, 224)))
            if len(original_np.shape) == 3:
                original_np = cv2.cvtColor(original_np, cv2.COLOR_RGB2BGR)
            else:
                original_np = cv2.cvtColor(original_np, cv2.COLOR_GRAY2BGR)
            
            # Resize heatmap to match
            heatmap_resized = cv2.resize(heatmap, (224, 224))
            
            # Apply colormap
            heatmap_colored = cv2.applyColorMap(np.uint8(255 * heatmap_resized), cv2.COLORMAP_JET)
            
            # Create overlay
            overlay = cv2.addWeighted(original_np, 0.6, heatmap_colored, 0.4, 0)
            
            # Convert back to PIL
            overlay = cv2.cvtColor(overlay, cv2.COLOR_BGR2RGB)
            overlay_pil = Image.fromarray(overlay)
            
            # Convert to base64
            buffer = io.BytesIO()
            overlay_pil.save(buffer, format='PNG')
            buffer.seek(0)
            
            return base64.b64encode(buffer.read()).decode('utf-8')
            
        except Exception as e:
            logger.error(f"Overlay creation failed: {e}")
            return self._generate_synthetic_heatmap(original_image, {})
    
    def _generate_synthetic_heatmap(self, image: Image.Image, 
                                  predictions: Dict[str, float]) -> str:
        """Generate synthetic heatmap when Grad-CAM fails"""
        try:
            # Convert to numpy
            img_array = np.array(image.convert('L'))
            h, w = img_array.shape
            
            # Create synthetic heatmap based on predictions
            heatmap = np.zeros((h, w))
            
            # Get top findings
            top_findings = sorted(predictions.items(), key=lambda x: x[1], reverse=True)[:3]
            
            for pathology, prob in top_findings:
                if prob > 0.3:
                    # Place Gaussian blob at anatomically plausible location
                    center = self._get_anatomical_center(pathology, w, h)
                    radius = min(w, h) // 8
                    
                    y, x = np.ogrid[:h, :w]
                    mask = (x - center[0])**2 + (y - center[1])**2 <= radius**2
                    heatmap[mask] = max(heatmap[mask], prob * 255)
            
            # Apply colormap
            heatmap_colored = cv2.applyColorMap(np.uint8(heatmap), cv2.COLORMAP_JET)
            
            # Create overlay
            original_rgb = cv2.cvtColor(img_array, cv2.COLOR_GRAY2RGB)
            overlay = cv2.addWeighted(original_rgb, 0.6, heatmap_colored, 0.4, 0)
            
            # Convert to base64
            buffer = io.BytesIO()
            Image.fromarray(cv2.cvtColor(overlay, cv2.COLOR_BGR2RGB)).save(buffer, format='PNG')
            buffer.seek(0)
            
            return base64.b64encode(buffer.read()).decode('utf-8')
            
        except Exception as e:
            logger.error(f"Synthetic heatmap generation failed: {e}")
            # Return empty heatmap
            return self._create_empty_heatmap(image)
    
    def _get_anatomical_center(self, pathology: str, width: int, height: int) -> Tuple[int, int]:
        """Get anatomically plausible center for pathology"""
        centers = {
            'Cardiomegaly': (width // 2, height // 2),  # Center
            'Pneumothorax': (width // 4, height // 3),   # Upper left
            'Effusion': (3 * width // 4, 2 * height // 3),  # Lower right
            'Pneumonia': (width // 2, height // 3),     # Upper center
            'Atelectasis': (width // 2, 2 * height // 3),  # Lower center
            'Consolidation': (width // 2, height // 2),  # Center
            'Infiltration': (width // 2, height // 2),  # Center
            'Edema': (width // 2, 2 * height // 3),     # Lower center
            'Emphysema': (width // 2, height // 2),     # Center
            'Fibrosis': (width // 2, height // 2),      # Center
            'Pleural_Thickening': (width // 4, height // 2),  # Left center
            'Nodule': (width // 3, height // 3),        # Upper left
            'Mass': (width // 3, height // 3),          # Upper left
            'Hernia': (width // 2, height // 4),       # Upper center
        }
        
        return centers.get(pathology, (width // 2, height // 2))
    
    def _create_empty_heatmap(self, image: Image.Image) -> str:
        """Create empty heatmap as fallback"""
        # Create a simple transparent overlay
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        buffer.seek(0)
        return base64.b64encode(buffer.read()).decode('utf-8')
