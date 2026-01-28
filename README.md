# B2 Second Brain v2.0

A personal AI-powered knowledge management system that captures, organizes, and retrieves multimodal content (text, images, audio, video, documents) using advanced AI capabilities.

![B2 Second Brain](frontend/public/brain.svg)

## ✨ Features

### 📚 Content Management
- **Multi-format Support**: Text, PDF, DOCX, images, audio, video, URLs
- **Smart Organization**: Auto-tagging, favorites, pinning, archival
- **OCR & STT**: Extract text from images and transcribe audio/video
- **Web Content**: Fetch and save content from URLs with YouTube support

### 🤖 AI-Powered Intelligence
- **RAG Q&A System**: Chat with your knowledge base using retrieval-augmented generation
- **Multi-Provider LLM**: Support for Gemini, OpenAI, and Anthropic
- **Hybrid Search**: Vector similarity + keyword search with reranking
- **Auto-Summarization**: AI-generated summaries for all content

### 📝 Flashcards & Learning
- **SM-2 Algorithm**: Spaced repetition for optimal retention
- **AI Generation**: Auto-generate flashcards from any content
- **Deck Management**: Organize cards into themed decks
- **Progress Tracking**: Monitor your learning streak and stats

### ✅ Task Management
- **AI Extraction**: Automatically identify action items from content
- **Priority Levels**: Organize by urgency and importance
- **Due Dates**: Track deadlines with smart suggestions
- **Status Tracking**: Todo, In Progress, Done workflow

### 🕸️ Knowledge Graph
- **Mind Maps**: Visualize connections between content
- **D3.js Visualization**: Interactive force-directed graphs
- **Relationship Discovery**: AI-suggested connections
- **Topic Clustering**: Auto-group related content

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI with async support
- **Databases**: PostgreSQL (relational) + MongoDB (documents/embeddings)
- **AI/ML**: SentenceTransformers, CrossEncoder, Multi-provider LLM
- **Auth**: JWT with HS256

### Frontend
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS + Framer Motion
- **State**: Zustand + React Query
- **Visualization**: D3.js + Recharts

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- MongoDB 6+
- Tesseract OCR (for image text extraction)
- FFmpeg (for audio/video processing)

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # or
   .\venv\Scripts\activate  # Windows
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and database credentials
   ```

5. **Run database migrations**:
   ```bash
   alembic upgrade head
   ```

6. **Start the server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## 📁 Project Structure

```
B2_SecondBrain/
├── backend/
│   ├── app/
│   │   ├── api/           # API route handlers
│   │   ├── core/          # Core modules (config, database, security)
│   │   ├── models/        # SQLAlchemy database models
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   └── services/      # Business logic services
│   ├── alembic/           # Database migrations
│   ├── requirements.txt   # Python dependencies
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service layer
│   │   ├── store/         # Zustand state stores
│   │   └── types/         # TypeScript interfaces
│   ├── package.json       # Node dependencies
│   └── README.md
└── README.md              # This file
```

## 🔧 Configuration

### Required API Keys

| Provider | Environment Variable | Purpose |
|----------|---------------------|---------|
| Google | `GOOGLE_API_KEY` | Gemini LLM |
| OpenAI | `OPENAI_API_KEY` | GPT models |
| Anthropic | `ANTHROPIC_API_KEY` | Claude models |

### Database Configuration

```env
# PostgreSQL
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/secondbrain

# MongoDB
MONGODB_URL=mongodb://localhost:27017/secondbrain
```

## 🎯 Usage

### 1. Create an Account
Register a new account or log in with existing credentials.

### 2. Add Content
- **Upload Files**: Drag & drop or click to upload
- **Create Text**: Write notes directly in the editor
- **Add URLs**: Paste web links to capture articles

### 3. Ask Questions
Use the AI Assistant to query your knowledge base:
- "What are the key points from my marketing notes?"
- "Summarize my research on machine learning"
- "What tasks do I have pending?"

### 4. Study with Flashcards
- Review due cards daily
- Generate new cards from content
- Track your learning progress

### 5. Manage Tasks
- View extracted action items
- Organize by priority and status
- Set and track due dates

### 6. Explore Knowledge Graph
- Visualize content relationships
- Discover hidden connections
- Filter by content type

## 📝 API Documentation

Once the backend is running, access interactive API docs at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React](https://reactjs.org/) - UI library
- [SentenceTransformers](https://www.sbert.net/) - Embeddings
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [D3.js](https://d3js.org/) - Visualization
