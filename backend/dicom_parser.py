import io
from PIL import Image
import pydicom
import numpy as np
from typing import Tuple, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class DICOMParser:
    """
    Parse DICOM files and standard images, returning normalized PIL Images and metadata.
    """
    
    def __init__(self):
        self.supported_formats = ['.dcm', '.dicom', '.jpg', '.jpeg', '.png']
    
    def parse(self, file_bytes: bytes) -> Tuple[Image.Image, Dict[str, Any]]:
        """
        Parse image bytes and return (PIL Image, metadata dict)
        
        Args:
            file_bytes: Raw bytes from uploaded file
            
        Returns:
            Tuple of (PIL Image, metadata dictionary)
        """
        try:
            # Try DICOM first
            return self._parse_dicom(file_bytes)
        except Exception as e:
            logger.debug(f"DICOM parsing failed, trying standard image: {e}")
            try:
                # Fall back to standard image
                return self._parse_standard_image(file_bytes)
            except Exception as e2:
                logger.error(f"Both DICOM and standard image parsing failed: {e2}")
                raise ValueError(f"Unable to parse image: {e2}")
    
    def _parse_dicom(self, file_bytes: bytes) -> Tuple[Image.Image, Dict[str, Any]]:
        """Parse DICOM file"""
        try:
            # Read DICOM from bytes
            ds = pydicom.dcmread(io.BytesIO(file_bytes))
            
            # Extract pixel data
            pixel_array = ds.pixel_array
            
            # Handle different pixel representations
            if hasattr(ds, 'PhotometricInterpretation'):
                photometric = ds.PhotometricInterpretation
            else:
                photometric = 'MONOCHROME2'  # Default assumption
            
            # Normalize pixel values to 0-255
            if pixel_array.dtype != np.uint8:
                if hasattr(ds, 'WindowCenter') and hasattr(ds, 'WindowWidth'):
                    # Apply windowing if available
                    center = ds.WindowCenter
                    width = ds.WindowWidth
                    if isinstance(center, list):
                        center = center[0]
                    if isinstance(width, list):
                        width = width[0]
                    
                    pixel_array = self._apply_window(pixel_array, center, width)
                else:
                    # Simple normalization
                    pixel_array = self._normalize_pixel_array(pixel_array)
            
            # Convert to PIL Image
            if len(pixel_array.shape) == 2:
                # Grayscale
                image = Image.fromarray(pixel_array.astype(np.uint8), mode='L')
            else:
                # RGB (rare for medical images)
                image = Image.fromarray(pixel_array.astype(np.uint8), mode='RGB')
            
            # Extract metadata
            metadata = self._extract_dicom_metadata(ds)
            
            logger.info(f"Successfully parsed DICOM: {metadata.get('PatientName', 'Unknown')}")
            return image, metadata
            
        except Exception as e:
            raise ValueError(f"DICOM parsing failed: {e}")
    
    def _parse_standard_image(self, file_bytes: bytes) -> Tuple[Image.Image, Dict[str, Any]]:
        """Parse standard image formats (JPEG, PNG)"""
        try:
            # Open image with PIL
            image = Image.open(io.BytesIO(file_bytes))
            
            # Convert to RGB if needed
            if image.mode not in ['RGB', 'L']:
                image = image.convert('RGB')
            
            # Ensure we're in a consistent format
            if image.mode == 'RGB':
                # Convert to grayscale for medical analysis
                image = image.convert('L')
            
            # Extract basic metadata
            metadata = {
                'format': image.format,
                'mode': image.mode,
                'size': image.size,
                'PatientName': '',
                'PatientID': '',
                'StudyDate': '',
                'Modality': 'XC',  # External camera for regular images
                'ViewPosition': 'PA'  # Default assumption
            }
            
            logger.info(f"Successfully parsed standard image: {metadata['format']}")
            return image, metadata
            
        except Exception as e:
            raise ValueError(f"Standard image parsing failed: {e}")
    
    def _normalize_pixel_array(self, pixel_array: np.ndarray) -> np.ndarray:
        """Normalize pixel array to 0-255 range"""
        pixel_array = pixel_array.astype(np.float32)
        
        # Handle different bit depths
        if pixel_array.max() > 255:
            # Assume 12-bit or 16-bit
            pixel_array = (pixel_array / pixel_array.max()) * 255
        
        # Clip to valid range
        pixel_array = np.clip(pixel_array, 0, 255)
        
        return pixel_array.astype(np.uint8)
    
    def _apply_window(self, pixel_array: np.ndarray, center: float, width: float) -> np.ndarray:
        """Apply windowing to DICOM pixel array"""
        pixel_array = pixel_array.astype(np.float32)
        
        # Calculate window bounds
        min_val = center - width / 2
        max_val = center + width / 2
        
        # Apply windowing
        pixel_array = np.clip(pixel_array, min_val, max_val)
        pixel_array = ((pixel_array - min_val) / (max_val - min_val)) * 255
        
        return pixel_array.astype(np.uint8)
    
    def _extract_dicom_metadata(self, ds: pydicom.Dataset) -> Dict[str, Any]:
        """Extract relevant metadata from DICOM dataset"""
        metadata = {}
        
        # Common DICOM fields
        fields = [
            'PatientName', 'PatientID', 'StudyDate', 'StudyTime', 
            'Modality', 'ViewPosition', 'BodyPartExamined',
            'PatientAge', 'PatientSex', 'StudyDescription',
            'SeriesDescription', 'InstitutionName'
        ]
        
        for field in fields:
            try:
                value = getattr(ds, field, '')
                if hasattr(value, 'value'):  # Handle DICOM VR types
                    value = value.value
                metadata[field] = str(value) if value else ''
            except:
                metadata[field] = ''
        
        # Add image-specific metadata
        if hasattr(ds, 'pixel_array'):
            pixel_array = ds.pixel_array
            metadata['image_shape'] = pixel_array.shape
            metadata['image_dtype'] = str(pixel_array.dtype)
            metadata['pixel_spacing'] = getattr(ds, 'PixelSpacing', None)
            metadata['photometric_interpretation'] = getattr(ds, 'PhotometricInterpretation', 'MONOCHROME2')
        
        return metadata
    
    def get_supported_formats(self) -> list:
        """Return list of supported file formats"""
        return self.supported_formats.copy()
