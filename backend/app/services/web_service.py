"""
Web Service
Fetches and extracts content from URLs
"""

import logging
from typing import Optional, Dict, Any
import asyncio
import re
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


async def fetch_url_content(url: str) -> Optional[Dict[str, Any]]:
    """
    Fetch and extract content from a URL.
    """
    if not url:
        return None
    
    try:
        # Use trafilatura for content extraction (best for articles)
        result = await _fetch_with_trafilatura(url)
        if result and result.get("text"):
            return result
        
        # Fallback to newspaper3k
        result = await _fetch_with_newspaper(url)
        if result and result.get("text"):
            return result
        
        # Final fallback to basic requests + BeautifulSoup
        return await _fetch_with_beautifulsoup(url)
        
    except Exception as e:
        logger.error(f"Failed to fetch URL {url}: {e}")
        return None


async def _fetch_with_trafilatura(url: str) -> Optional[Dict[str, Any]]:
    """Extract content using trafilatura."""
    try:
        import trafilatura
        
        def _extract():
            # Download the page
            downloaded = trafilatura.fetch_url(url)
            if not downloaded:
                return None
            
            # Extract text
            text = trafilatura.extract(
                downloaded,
                include_comments=False,
                include_tables=True,
                no_fallback=False
            )
            
            # Extract metadata
            metadata = trafilatura.extract_metadata(downloaded)
            
            return {
                "text": text or "",
                "title": metadata.title if metadata else None,
                "author": metadata.author if metadata else None,
                "published_date": metadata.date if metadata else None,
                "description": metadata.description if metadata else None,
                "url": url,
                "source": "trafilatura"
            }
        
        return await asyncio.to_thread(_extract)
        
    except ImportError:
        logger.warning("trafilatura not installed")
        return None
    except Exception as e:
        logger.warning(f"trafilatura extraction failed: {e}")
        return None


async def _fetch_with_newspaper(url: str) -> Optional[Dict[str, Any]]:
    """Extract content using newspaper3k."""
    try:
        from newspaper import Article
        
        def _extract():
            article = Article(url)
            article.download()
            article.parse()
            
            return {
                "text": article.text or "",
                "title": article.title,
                "author": ", ".join(article.authors) if article.authors else None,
                "published_date": article.publish_date.isoformat() if article.publish_date else None,
                "description": article.meta_description,
                "url": url,
                "source": "newspaper"
            }
        
        return await asyncio.to_thread(_extract)
        
    except ImportError:
        logger.warning("newspaper3k not installed")
        return None
    except Exception as e:
        logger.warning(f"newspaper extraction failed: {e}")
        return None


async def _fetch_with_beautifulsoup(url: str) -> Optional[Dict[str, Any]]:
    """Basic content extraction with requests and BeautifulSoup."""
    try:
        import httpx
        from bs4 import BeautifulSoup
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                follow_redirects=True,
                timeout=30.0,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            )
            response.raise_for_status()
            html = response.text
        
        def _parse():
            soup = BeautifulSoup(html, "html.parser")
            
            # Remove script, style, nav elements
            for element in soup(["script", "style", "nav", "footer", "header", "aside"]):
                element.decompose()
            
            # Get title
            title = soup.title.string if soup.title else None
            
            # Get meta description
            description = None
            meta_desc = soup.find("meta", attrs={"name": "description"})
            if meta_desc:
                description = meta_desc.get("content")
            
            # Get main content
            main = soup.find("main") or soup.find("article") or soup.find("body")
            
            if main:
                # Get text
                text = main.get_text(separator="\n", strip=True)
                # Clean up whitespace
                text = re.sub(r'\n{3,}', '\n\n', text)
            else:
                text = soup.get_text(separator="\n", strip=True)
            
            return {
                "text": text,
                "title": title,
                "author": None,
                "published_date": None,
                "description": description,
                "url": url,
                "source": "beautifulsoup"
            }
        
        return await asyncio.to_thread(_parse)
        
    except ImportError as e:
        logger.error(f"Required library not installed: {e}")
        return None
    except Exception as e:
        logger.error(f"BeautifulSoup extraction failed: {e}")
        return None


async def fetch_youtube_transcript(url: str) -> Optional[Dict[str, Any]]:
    """Fetch transcript from a YouTube video."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        
        # Extract video ID
        video_id = _extract_youtube_id(url)
        if not video_id:
            return None
        
        def _fetch():
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            
            # Combine transcript segments
            text = " ".join([segment["text"] for segment in transcript_list])
            
            return {
                "text": text,
                "title": f"YouTube Video: {video_id}",
                "author": None,
                "published_date": None,
                "url": url,
                "source": "youtube_transcript",
                "segments": transcript_list
            }
        
        return await asyncio.to_thread(_fetch)
        
    except ImportError:
        logger.warning("youtube_transcript_api not installed")
        return None
    except Exception as e:
        logger.warning(f"YouTube transcript fetch failed: {e}")
        return None


def _extract_youtube_id(url: str) -> Optional[str]:
    """Extract YouTube video ID from URL."""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
        r'youtube\.com\/v\/([^&\n?#]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None


async def fetch_pdf_from_url(url: str) -> Optional[bytes]:
    """Download PDF from URL."""
    try:
        import httpx
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                follow_redirects=True,
                timeout=60.0
            )
            response.raise_for_status()
            
            content_type = response.headers.get("content-type", "")
            if "pdf" not in content_type.lower():
                logger.warning(f"URL does not point to PDF: {content_type}")
            
            return response.content
            
    except Exception as e:
        logger.error(f"PDF download failed: {e}")
        return None


def is_supported_url(url: str) -> bool:
    """Check if URL is supported for content extraction."""
    try:
        parsed = urlparse(url)
        
        # Check scheme
        if parsed.scheme not in ("http", "https"):
            return False
        
        # Check for known unsupported patterns
        unsupported_patterns = [
            r'login',
            r'signin',
            r'auth',
            r'checkout',
            r'cart'
        ]
        
        path_lower = parsed.path.lower()
        for pattern in unsupported_patterns:
            if re.search(pattern, path_lower):
                return False
        
        return True
        
    except Exception:
        return False
