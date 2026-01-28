"""
Speech-to-Text Service
Audio and video transcription using Whisper
"""

import os
import logging
from typing import Optional, Dict, Any
import asyncio
import tempfile

from app.core.config import settings

logger = logging.getLogger(__name__)


async def transcribe_audio(file_path: str) -> Optional[str]:
    """
    Transcribe audio file to text using Whisper.
    """
    if not file_path or not os.path.exists(file_path):
        logger.error(f"Audio file not found: {file_path}")
        return None
    
    try:
        # Use local Whisper model
        return await _transcribe_with_whisper(file_path)
    except Exception as e:
        logger.warning(f"Local Whisper failed, trying API: {e}")
        
        try:
            # Fallback to OpenAI Whisper API
            return await _transcribe_with_openai_api(file_path)
        except Exception as e2:
            logger.error(f"All transcription methods failed: {e2}")
            return None


async def transcribe_video(file_path: str) -> Optional[str]:
    """
    Transcribe video file by extracting audio first.
    """
    if not file_path or not os.path.exists(file_path):
        logger.error(f"Video file not found: {file_path}")
        return None
    
    try:
        # Extract audio from video
        audio_path = await _extract_audio_from_video(file_path)
        
        if audio_path:
            # Transcribe the extracted audio
            text = await transcribe_audio(audio_path)
            
            # Clean up temp file
            try:
                os.remove(audio_path)
            except:
                pass
            
            return text
        
        return None
        
    except Exception as e:
        logger.error(f"Video transcription failed: {e}")
        return None


async def _transcribe_with_whisper(file_path: str) -> str:
    """Transcribe using local Whisper model."""
    try:
        import whisper
        
        def _transcribe():
            # Load model (cached after first load)
            model = whisper.load_model(settings.WHISPER_MODEL)
            
            # Transcribe
            result = model.transcribe(
                file_path,
                language="en",
                verbose=False
            )
            
            return result["text"].strip()
        
        return await asyncio.to_thread(_transcribe)
        
    except ImportError:
        raise ImportError("openai-whisper not installed")
    except Exception as e:
        raise Exception(f"Whisper transcription failed: {e}")


async def _transcribe_with_openai_api(file_path: str) -> str:
    """Transcribe using OpenAI Whisper API."""
    try:
        from openai import AsyncOpenAI
        
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        
        with open(file_path, "rb") as audio_file:
            response = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="text"
            )
        
        return response.strip()
        
    except ImportError:
        raise ImportError("openai not installed")
    except Exception as e:
        raise Exception(f"OpenAI Whisper API failed: {e}")


async def _extract_audio_from_video(video_path: str) -> Optional[str]:
    """Extract audio track from video file."""
    try:
        import subprocess
        
        # Create temp file for audio
        temp_audio = tempfile.NamedTemporaryFile(
            suffix=".wav",
            delete=False
        )
        temp_audio.close()
        
        def _extract():
            # Use ffmpeg to extract audio
            cmd = [
                "ffmpeg",
                "-i", video_path,
                "-vn",  # No video
                "-acodec", "pcm_s16le",  # WAV format
                "-ar", "16000",  # 16kHz sample rate
                "-ac", "1",  # Mono
                "-y",  # Overwrite
                temp_audio.name
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                raise Exception(f"ffmpeg failed: {result.stderr}")
            
            return temp_audio.name
        
        return await asyncio.to_thread(_extract)
        
    except Exception as e:
        logger.error(f"Audio extraction failed: {e}")
        return None


async def transcribe_with_timestamps(file_path: str) -> Dict[str, Any]:
    """
    Transcribe audio with word-level timestamps.
    Useful for video subtitles or audio navigation.
    """
    try:
        import whisper
        
        def _transcribe():
            model = whisper.load_model(settings.WHISPER_MODEL)
            
            result = model.transcribe(
                file_path,
                language="en",
                word_timestamps=True,
                verbose=False
            )
            
            segments = []
            for segment in result.get("segments", []):
                segments.append({
                    "start": segment["start"],
                    "end": segment["end"],
                    "text": segment["text"].strip(),
                    "words": segment.get("words", [])
                })
            
            return {
                "text": result["text"].strip(),
                "segments": segments,
                "language": result.get("language", "en")
            }
        
        return await asyncio.to_thread(_transcribe)
        
    except Exception as e:
        logger.error(f"Timestamped transcription failed: {e}")
        return {
            "text": await transcribe_audio(file_path) or "",
            "segments": [],
            "language": "en"
        }


async def detect_language(file_path: str) -> str:
    """Detect the language of audio content."""
    try:
        import whisper
        
        def _detect():
            model = whisper.load_model("base")
            
            # Load audio and pad/trim to 30 seconds
            audio = whisper.load_audio(file_path)
            audio = whisper.pad_or_trim(audio)
            
            # Make log-Mel spectrogram
            mel = whisper.log_mel_spectrogram(audio).to(model.device)
            
            # Detect language
            _, probs = model.detect_language(mel)
            
            return max(probs, key=probs.get)
        
        return await asyncio.to_thread(_detect)
        
    except Exception as e:
        logger.error(f"Language detection failed: {e}")
        return "en"


async def transcribe_realtime(audio_stream) -> str:
    """
    Real-time transcription for streaming audio.
    This is a placeholder for future implementation.
    """
    # Would require a streaming-capable STT service
    # like Google Cloud Speech-to-Text or AssemblyAI
    raise NotImplementedError("Real-time transcription not yet implemented")
