# B2 Second Brain - Backend

sk-bd27b3162b924121a1c70bb7a52aa805

A FastAPI-based backend for the B2 Second Brain personal knowledge management system.

## Features

- **Multimodal Content Management**: Upload and process text, PDFs, images, audio, and video
- **RAG Q&A System**: Ask questions about your knowledge base with context-aware answers
- **Flashcard Generation**: AI-powered flashcard creation with SM-2 spaced repetition
- **Task Extraction**: Automatically extract action items from your content
- **Knowledge Graph**: Visualize connections between your content
- **Semantic Search**: Find relevant content using natural language queries

## Tech Stack

- **Framework**: FastAPI with async/await
- **Database**: PostgreSQL (SQLAlchemy 2.0) + MongoDB (Motor)
- **AI**: Gemini/OpenAI/Anthropic LLMs, SentenceTransformers embeddings
- **OCR**: Tesseract/PaddleOCR
- **STT**: OpenAI Whisper

## Quick Start

### Prerequisites

- Python 3.10+
- PostgreSQL 14+
- MongoDB 6+
- Tesseract OCR (for image text extraction)
- FFmpeg (for audio/video processing)

### Installation

1. **Create virtual environment**:
   ```bash
   python -m venv venv
   
   # Windows
   .\venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Initialize database**:
   ```bash
   # Create PostgreSQL database
   createdb b2_secondbrain
   
   # Run migrations
   alembic upgrade head
   ```

5. **Start the server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

6. **Access the API**:
   - API: http://localhost:8000
   - Docs: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## Project Structure

```
backend/
├── app/
│   ├── api/                 # API route handlers
│   │   ├── auth.py          # Authentication endpoints
│   │   ├── content.py       # Content management
│   │   ├── assistant.py     # RAG Q&A and chat
│   │   ├── flashcards.py    # Flashcard system
│   │   ├── tasks.py         # Task management
│   │   ├── dashboard.py     # Statistics and overview
│   │   └── mindmap.py       # Knowledge graph
│   │
│   ├── core/                # Core functionality
│   │   ├── config.py        # App configuration
│   │   ├── security.py      # JWT and auth
│   │   ├── database.py      # Database connections
│   │   ├── cache.py         # In-memory caching
│   │   └── background_tasks.py  # Async task manager
│   │
│   ├── models/              # Database models
│   │   └── database.py      # SQLAlchemy models
│   │
│   ├── schemas/             # Pydantic schemas
│   │   └── schemas.py       # Request/response models
│   │
│   ├── services/            # Business logic
│   │   ├── ai_service.py    # LLM abstraction
│   │   ├── embedding_service.py  # Vector embeddings
│   │   ├── rag_service.py   # RAG pipeline
│   │   ├── search_service.py    # Search functionality
│   │   ├── content_processor.py # Content processing
│   │   ├── chat_service.py  # Chat sessions
│   │   ├── ocr_service.py   # Image text extraction
│   │   ├── stt_service.py   # Audio transcription
│   │   ├── web_service.py   # URL fetching
│   │   ├── flashcard_service.py # Flashcard generation
│   │   └── task_service.py  # Task extraction
│   │
│   └── main.py              # FastAPI application
│
├── alembic/                 # Database migrations
├── uploads/                 # File upload directory
├── requirements.txt         # Python dependencies
├── alembic.ini             # Alembic configuration
└── .env.example            # Environment template
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login (OAuth2)
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user

### Content
- `POST /api/content/upload` - Upload file
- `POST /api/content/text` - Add text content
- `GET /api/content/` - List content
- `GET /api/content/{id}` - Get content details

### Assistant
- `POST /api/assistant/query` - RAG query
- `POST /api/assistant/search` - Semantic search
- `POST /api/assistant/chat` - Chat sessions

### Flashcards
- `GET /api/flashcards/decks` - List decks
- `POST /api/flashcards/decks` - Create deck
- `GET /api/flashcards/{deck_id}/cards` - Get cards
- `POST /api/flashcards/{deck_id}/review` - Submit review

### Tasks
- `GET /api/tasks/` - List tasks
- `POST /api/tasks/` - Create task
- `POST /api/tasks/extract/{content_id}` - Extract tasks from content

### Dashboard
- `GET /api/dashboard/stats` - Get overview stats
- `GET /api/dashboard/activity` - Get activity timeline

### Mind Map
- `GET /api/mindmap/` - Get knowledge graph
- `POST /api/mindmap/links` - Create content link

## Development

### Running Tests
```bash
pytest tests/ -v --cov=app
```

### Code Formatting
```bash
black app/
isort app/
flake8 app/
```

### Generate Migration
```bash
alembic revision --autogenerate -m "description"
alembic upgrade head
```

## License

MIT License
