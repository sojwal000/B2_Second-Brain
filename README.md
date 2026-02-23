<div align="center">

# B2 — Second Brain

**Your AI-powered knowledge management system.**

Capture, organize, and retrieve multimodal content — text, images, audio, video, and documents — with intelligent search, spaced repetition, and a conversational AI assistant.

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

---

## Overview

B2 Second Brain is a full-stack application that turns scattered notes, files, and web content into a structured, searchable knowledge base. It combines **RAG-based AI chat**, **spaced repetition flashcards**, **automated task extraction**, and an **interactive knowledge graph** — all in a polished dark-themed interface.

---

## Key Features

### Content Management
- Ingest text, PDF, DOCX, images, audio, video, and web URLs (including YouTube)
- Automatic OCR for images and speech-to-text for audio/video
- Smart tagging, favorites, pinning, and archival

### AI Assistant (RAG)
- Conversational Q&A grounded in your personal knowledge base
- Hybrid search: vector similarity + BM25 keyword matching with cross-encoder reranking
- Multi-provider LLM support — **Google Gemini**, **OpenAI GPT-4**, **Anthropic Claude**
- Auto-generated summaries and smart content recommendations

### Flashcards & Spaced Repetition
- SM-2 algorithm for scientifically optimized review scheduling
- One-click AI generation of flashcard decks from any content
- Deck organization, progress tracking, and streak monitoring

### Task Management
- AI-powered extraction of action items from uploaded content
- Priority levels, due dates, and kanban-style status tracking (Todo → In Progress → Done)
- Voice input support for hands-free task creation

### Knowledge Graph
- Interactive D3.js force-directed visualization of content relationships
- AI-driven link discovery across semantically similar content
- Filter by subject, tags, and content type

### Collaborative Workspaces
- Create shared workspaces and invite team members
- Role-based access control (Owner, Admin, Editor, Viewer)
- Share individual content items with granular permissions

### Quiz Engine
- AI-generated quizzes (MCQ, True/False, Short Answer) from any content
- Configurable difficulty, question count, and topic focus
- Instant scoring with detailed explanations

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | FastAPI · SQLAlchemy 2.0 (async) · Alembic · JWT Auth |
| **Databases** | PostgreSQL (relational) · MongoDB (documents & embeddings) |
| **AI / ML** | SentenceTransformers · CrossEncoder · Gemini / GPT-4 / Claude |
| **Frontend** | React 18 · TypeScript · Vite · Tailwind CSS · Framer Motion |
| **State** | Zustand · React Query |
| **Visualization** | D3.js (knowledge graph) · Recharts (dashboard analytics) |

---

## Getting Started

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Python | 3.10+ |
| Node.js | 18+ |
| PostgreSQL | 14+ |
| MongoDB | 6+ |
| Tesseract OCR | Latest |
| FFmpeg | Latest |

### 1. Backend

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file (or copy from `.env.example`) with your credentials:

```env
# Databases
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/secondbrain
MONGODB_URL=mongodb://localhost:27017/secondbrain

# AI Providers (at least one required)
GOOGLE_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Auth
SECRET_KEY=your_jwt_secret
```

Run migrations and start the server:

```bash
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Access

| Service | URL |
|---------|-----|
| Application | http://localhost:3000 |
| API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |

---

## API Keys

At least one AI provider key is required for LLM features:

| Provider | Variable | Models |
|----------|----------|--------|
| Google | `GOOGLE_API_KEY` | Gemini 1.5 Pro / Flash |
| OpenAI | `OPENAI_API_KEY` | GPT-4o / GPT-4 |
| Anthropic | `ANTHROPIC_API_KEY` | Claude 3.5 Sonnet |

---

## License

MIT — see [LICENSE](LICENSE) for details.
