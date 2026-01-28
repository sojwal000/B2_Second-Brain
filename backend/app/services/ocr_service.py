"""
OCR Service
Text extraction from images using Tesseract or PaddleOCR
"""

import os
import logging
from typing import Optional
import asyncio

from app.core.config import settings

logger = logging.getLogger(__name__)


async def extract_text_from_image(file_path: str) -> Optional[str]:
    """
    Extract text from an image using OCR.
    """
    if not file_path or not os.path.exists(file_path):
        logger.error(f"Image file not found: {file_path}")
        return None
    
    try:
        # Try Tesseract first
        return await _extract_with_tesseract(file_path)
    except Exception as e:
        logger.warning(f"Tesseract failed, trying alternative: {e}")
        
        try:
            # Fallback to PaddleOCR
            return await _extract_with_paddleocr(file_path)
        except Exception as e2:
            logger.error(f"All OCR methods failed: {e2}")
            return None


async def _extract_with_tesseract(file_path: str) -> str:
    """Extract text using Tesseract OCR."""
    try:
        import pytesseract
        from PIL import Image
        
        def _ocr():
            image = Image.open(file_path)
            
            # Preprocess image for better OCR
            image = _preprocess_image(image)
            
            # Extract text
            text = pytesseract.image_to_string(
                image,
                lang='eng',
                config='--psm 1 --oem 3'
            )
            
            return text.strip()
        
        return await asyncio.to_thread(_ocr)
        
    except ImportError:
        raise ImportError("pytesseract not installed")
    except Exception as e:
        raise Exception(f"Tesseract OCR failed: {e}")


async def _extract_with_paddleocr(file_path: str) -> str:
    """Extract text using PaddleOCR."""
    try:
        from paddleocr import PaddleOCR
        
        def _ocr():
            ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
            result = ocr.ocr(file_path, cls=True)
            
            if not result or not result[0]:
                return ""
            
            # Extract text from result
            texts = []
            for line in result[0]:
                if line[1]:
                    texts.append(line[1][0])
            
            return "\n".join(texts)
        
        return await asyncio.to_thread(_ocr)
        
    except ImportError:
        raise ImportError("paddleocr not installed")
    except Exception as e:
        raise Exception(f"PaddleOCR failed: {e}")


def _preprocess_image(image):
    """Preprocess image for better OCR results."""
    from PIL import Image, ImageEnhance, ImageFilter
    
    # Convert to RGB if needed
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Convert to grayscale
    image = image.convert('L')
    
    # Enhance contrast
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(2.0)
    
    # Apply sharpening
    image = image.filter(ImageFilter.SHARPEN)
    
    # Binarize (convert to black and white)
    threshold = 128
    image = image.point(lambda p: 255 if p > threshold else 0)
    
    return image


async def extract_text_from_pdf_images(file_path: str) -> str:
    """Extract text from PDF pages as images (for scanned PDFs)."""
    try:
        import fitz  # PyMuPDF
        from PIL import Image
        import io
        
        def _extract():
            texts = []
            
            with fitz.open(file_path) as doc:
                for page_num, page in enumerate(doc):
                    # Render page to image
                    mat = fitz.Matrix(2, 2)  # 2x zoom for better quality
                    pix = page.get_pixmap(matrix=mat)
                    
                    # Convert to PIL Image
                    img_data = pix.tobytes("png")
                    image = Image.open(io.BytesIO(img_data))
                    
                    # Preprocess
                    image = _preprocess_image(image)
                    
                    # OCR
                    import pytesseract
                    text = pytesseract.image_to_string(image, lang='eng')
                    
                    if text.strip():
                        texts.append(f"[Page {page_num + 1}]\n{text.strip()}")
            
            return "\n\n".join(texts)
        
        return await asyncio.to_thread(_extract)
        
    except Exception as e:
        logger.error(f"PDF image extraction failed: {e}")
        return ""


async def detect_handwriting(file_path: str) -> str:
    """
    Detect and extract handwritten text from images.
    Uses specialized models for handwriting recognition.
    """
    # For now, use standard OCR
    # Could be enhanced with specialized handwriting recognition models
    return await extract_text_from_image(file_path)


async def extract_from_screenshot(file_path: str) -> dict:
    """
    Extract text and detect UI elements from screenshots.
    Useful for extracting text from app screenshots, web pages, etc.
    """
    text = await extract_text_from_image(file_path)
    
    return {
        "text": text,
        "type": "screenshot",
        "elements": []  # Could detect buttons, text fields, etc.
    }
