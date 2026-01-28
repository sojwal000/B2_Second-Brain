"""
Content Processing Service
Handles text extraction, chunking, embedding generation, and metadata extraction
"""

import os
import re
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
import asyncio

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal, get_mongo_db, Collections
from app.models.database import Content, ContentChunk, ProcessingStatus, ContentType

logger = logging.getLogger(__name__)


# ============================================================================
# Main Processing Functions
# ============================================================================

async def process_content(content_id: int):
    """
    Main content processing pipeline.
    Called as a background task after content upload.
    """
    async with AsyncSessionLocal() as db:
        try:
            # Get content
            result = await db.execute(
                select(Content).where(Content.id == content_id)
            )
            content = result.scalar_one_or_none()
            
            if not content:
                logger.error(f"Content {content_id} not found")
                return
            
            # Update status
            content.processing_status = ProcessingStatus.PROCESSING
            await db.commit()
            
            logger.info(f"Processing content {content_id}: {content.title}")
            
            # Step 1: Extract text based on content type
            extracted_text = await _extract_text(content)
            
            if not extracted_text:
                content.processing_status = ProcessingStatus.FAILED
                content.processing_error = "Failed to extract text from content"
                await db.commit()
                return
            
            # Store extracted text
            content.text_content = extracted_text
            content.word_count = len(extracted_text.split())
            
            # Step 2: Generate summary
            try:
                from app.services.ai_service import AIService
                ai = AIService()
                summary = await ai.summarize(extracted_text, max_length=500)
                content.summary = summary
            except Exception as e:
                logger.warning(f"Summary generation failed: {e}")
                # Create a basic summary
                content.summary = extracted_text[:500] + "..." if len(extracted_text) > 500 else extracted_text
            
            # Step 3: Extract entities and keywords
            try:
                entities = await ai.extract_entities(extracted_text)
                content.metadata = content.metadata or {}
                content.metadata["entities"] = entities
                
                # Auto-tag based on entities
                if not content.tags:
                    content.tags = entities.get("keywords", [])[:10]
            except Exception as e:
                logger.warning(f"Entity extraction failed: {e}")
            
            # Step 4: Chunk the text
            chunks = await _chunk_text(extracted_text, content.id)
            
            # Step 5: Generate embeddings for chunks
            try:
                from app.services.embedding_service import EmbeddingService
                embedding_service = EmbeddingService()
                
                for chunk in chunks:
                    embedding = await embedding_service.generate_embedding(chunk["text"])
                    chunk["embedding"] = embedding
                
            except Exception as e:
                logger.warning(f"Embedding generation failed: {e}")
            
            # Step 6: Store chunks in PostgreSQL
            for i, chunk_data in enumerate(chunks):
                chunk = ContentChunk(
                    content_id=content_id,
                    chunk_index=i,
                    chunk_text=chunk_data["text"],
                    start_char=chunk_data.get("start", 0),
                    end_char=chunk_data.get("end", len(chunk_data["text"])),
                    embedding_model=settings.EMBEDDING_MODEL if chunk_data.get("embedding") else None,
                    token_count=len(chunk_data["text"].split()),
                    chunk_metadata=chunk_data.get("metadata", {})
                )
                db.add(chunk)
            
            # Step 7: Store embeddings in MongoDB for vector search
            if chunks and chunks[0].get("embedding"):
                mongo_db = await get_mongo_db()
                embeddings_collection = mongo_db[Collections.EMBEDDINGS]
                
                embedding_docs = [
                    {
                        "content_id": content_id,
                        "user_id": content.user_id,
                        "chunk_index": i,
                        "text": chunk["text"][:500],  # Store preview
                        "embedding": chunk["embedding"],
                        "created_at": datetime.utcnow()
                    }
                    for i, chunk in enumerate(chunks) if chunk.get("embedding")
                ]
                
                if embedding_docs:
                    await embeddings_collection.insert_many(embedding_docs)
            
            # Update content status
            content.processing_status = ProcessingStatus.COMPLETED
            content.is_processed = True
            
            await db.commit()
            logger.info(f"Content {content_id} processed successfully with {len(chunks)} chunks")
            
        except Exception as e:
            logger.error(f"Error processing content {content_id}: {e}", exc_info=True)
            content.processing_status = ProcessingStatus.FAILED
            content.processing_error = str(e)[:500]
            await db.commit()


async def process_web_content(content_id: int, url: str):
    """
    Process web content by fetching and extracting from URL.
    """
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(Content).where(Content.id == content_id)
            )
            content = result.scalar_one_or_none()
            
            if not content:
                logger.error(f"Content {content_id} not found")
                return
            
            content.processing_status = ProcessingStatus.PROCESSING
            await db.commit()
            
            # Fetch web content
            from app.services.web_service import fetch_url_content
            web_data = await fetch_url_content(url)
            
            if not web_data:
                content.processing_status = ProcessingStatus.FAILED
                content.processing_error = "Failed to fetch web content"
                await db.commit()
                return
            
            # Update content with fetched data
            content.title = web_data.get("title", url)[:255]
            content.text_content = web_data.get("text", "")
            content.metadata = {
                "url": url,
                "fetched_at": datetime.utcnow().isoformat(),
                "author": web_data.get("author"),
                "published_date": web_data.get("published_date")
            }
            
            await db.commit()
            
            # Continue with standard processing
            await process_content(content_id)
            
        except Exception as e:
            logger.error(f"Error processing web content {content_id}: {e}", exc_info=True)
            content.processing_status = ProcessingStatus.FAILED
            content.processing_error = str(e)[:500]
            await db.commit()


# ============================================================================
# Text Extraction
# ============================================================================

async def _extract_text(content: Content) -> Optional[str]:
    """Extract text from content based on its type."""
    
    if content.content_type == ContentType.TEXT:
        return content.text_content or ""
    
    elif content.content_type == ContentType.DOCUMENT:
        return await _extract_from_document(content.file_path)
    
    elif content.content_type == ContentType.IMAGE:
        from app.services.ocr_service import extract_text_from_image
        return await extract_text_from_image(content.file_path)
    
    elif content.content_type == ContentType.AUDIO:
        from app.services.stt_service import transcribe_audio
        return await transcribe_audio(content.file_path)
    
    elif content.content_type == ContentType.VIDEO:
        from app.services.stt_service import transcribe_video
        return await transcribe_video(content.file_path)
    
    elif content.content_type == ContentType.CODE:
        return await _extract_from_code_file(content.file_path)
    
    elif content.content_type == ContentType.WEB:
        return content.text_content or ""
    
    return None


async def _extract_from_document(file_path: str) -> Optional[str]:
    """Extract text from documents (PDF, DOCX, etc.)."""
    if not file_path or not os.path.exists(file_path):
        return None
    
    ext = os.path.splitext(file_path)[1].lower()
    
    try:
        if ext == ".pdf":
            return await _extract_from_pdf(file_path)
        elif ext in (".docx", ".doc"):
            return await _extract_from_docx(file_path)
        elif ext == ".txt":
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        elif ext == ".md":
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        else:
            logger.warning(f"Unsupported document type: {ext}")
            return None
    except Exception as e:
        logger.error(f"Error extracting from document: {e}")
        return None


async def _extract_from_pdf(file_path: str) -> str:
    """Extract text from PDF using PyMuPDF."""
    try:
        import fitz  # PyMuPDF
        
        text_parts = []
        with fitz.open(file_path) as doc:
            for page in doc:
                text_parts.append(page.get_text())
        
        return "\n\n".join(text_parts)
    except ImportError:
        # Fallback to pdfplumber
        try:
            import pdfplumber
            
            text_parts = []
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        text_parts.append(text)
            
            return "\n\n".join(text_parts)
        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            return ""


async def _extract_from_docx(file_path: str) -> str:
    """Extract text from DOCX files."""
    try:
        from docx import Document
        
        doc = Document(file_path)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n\n".join(paragraphs)
    except Exception as e:
        logger.error(f"DOCX extraction failed: {e}")
        return ""


async def _extract_from_code_file(file_path: str) -> Optional[str]:
    """Extract content from code files with syntax-aware processing."""
    if not file_path or not os.path.exists(file_path):
        return None
    
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            code = f.read()
        
        # Extract comments and docstrings as they contain important context
        comments = _extract_comments(code, os.path.splitext(file_path)[1])
        
        return f"Code:\n{code}\n\nComments and Documentation:\n{comments}"
    except Exception as e:
        logger.error(f"Code extraction failed: {e}")
        return None


def _extract_comments(code: str, ext: str) -> str:
    """Extract comments from code based on language."""
    comments = []
    
    # Python-style comments and docstrings
    if ext in (".py", ".pyw"):
        # Docstrings
        docstrings = re.findall(r'"""(.*?)"""', code, re.DOTALL)
        docstrings += re.findall(r"'''(.*?)'''", code, re.DOTALL)
        comments.extend(docstrings)
        
        # Single-line comments
        single_comments = re.findall(r'#\s*(.+)$', code, re.MULTILINE)
        comments.extend(single_comments)
    
    # JavaScript/TypeScript/Java/C-style comments
    elif ext in (".js", ".ts", ".jsx", ".tsx", ".java", ".cpp", ".c", ".go"):
        # Multi-line comments
        multi_comments = re.findall(r'/\*(.*?)\*/', code, re.DOTALL)
        comments.extend(multi_comments)
        
        # Single-line comments
        single_comments = re.findall(r'//\s*(.+)$', code, re.MULTILINE)
        comments.extend(single_comments)
    
    return "\n".join(comments)


# ============================================================================
# Text Chunking
# ============================================================================

async def _chunk_text(
    text: str,
    content_id: int,
    chunk_size: int = None,
    overlap: int = None
) -> List[Dict[str, Any]]:
    """
    Split text into chunks for embedding.
    Uses semantic-aware chunking when possible.
    """
    chunk_size = chunk_size or settings.CHUNK_SIZE
    overlap = overlap or settings.CHUNK_OVERLAP
    
    if not text:
        return []
    
    # Clean text
    text = _clean_text(text)
    
    if len(text) <= chunk_size:
        return [{
            "text": text,
            "start": 0,
            "end": len(text),
            "metadata": {"is_single_chunk": True}
        }]
    
    chunks = []
    
    # Try semantic chunking first (by paragraphs/sections)
    paragraphs = text.split("\n\n")
    
    current_chunk = ""
    current_start = 0
    char_pos = 0
    
    for para in paragraphs:
        para = para.strip()
        if not para:
            char_pos += 2  # Account for \n\n
            continue
        
        if len(current_chunk) + len(para) + 2 <= chunk_size:
            current_chunk += ("\n\n" if current_chunk else "") + para
        else:
            if current_chunk:
                chunks.append({
                    "text": current_chunk,
                    "start": current_start,
                    "end": char_pos,
                    "metadata": {}
                })
            
            # Start new chunk with overlap from previous
            if chunks and overlap > 0:
                prev_text = chunks[-1]["text"]
                overlap_text = prev_text[-overlap:] if len(prev_text) > overlap else prev_text
                current_chunk = overlap_text + "\n\n" + para
            else:
                current_chunk = para
            
            current_start = char_pos
        
        char_pos += len(para) + 2
    
    # Add final chunk
    if current_chunk:
        chunks.append({
            "text": current_chunk,
            "start": current_start,
            "end": len(text),
            "metadata": {}
        })
    
    return chunks


def _clean_text(text: str) -> str:
    """Clean and normalize text."""
    if not text:
        return ""
    
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\n\s*\n', '\n\n', text)
    
    # Remove excessive newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Strip leading/trailing whitespace
    text = text.strip()
    
    return text


# ============================================================================
# Reprocessing
# ============================================================================

async def reprocess_all_content(user_id: int):
    """Reprocess all content for a user (e.g., after model upgrade)."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Content).where(Content.user_id == user_id)
        )
        contents = result.scalars().all()
        
        for content in contents:
            content.processing_status = ProcessingStatus.PENDING
        
        await db.commit()
        
        # Queue processing tasks
        for content in contents:
            await process_content(content.id)
