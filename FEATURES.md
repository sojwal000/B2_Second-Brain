# B2 Second Brain - Features Overview

**B2 Second Brain** is an AI-powered personal knowledge management system that helps you capture, organize, and retrieve information effortlessly. Built with FastAPI backend and React TypeScript frontend, it combines modern AI capabilities with a clean, intuitive interface.

---

## ✨ Core Features

### 📚 **Content Management**
- **Multimodal Upload**: Support for text, PDFs, images, audio, and video files
- **Web Import**: Extract content directly from URLs
- **Rich Text Editor**: Create and edit text-based notes with formatting
- **Content Organization**: Tag, categorize, and search your knowledge base
- **Favorites & Pinning**: Quick access to important content

### 🤖 **AI Assistant**
- **RAG-Powered Q&A**: Ask questions about your stored content with context-aware answers
- **Semantic Search**: Find relevant information using natural language queries
- **Chat Sessions**: Conversational interface for exploring your knowledge base
- **Multi-Provider Support**: Compatible with Gemini, OpenAI, and Anthropic models

### 🎴 **Flashcard System**
- **AI-Generated Flashcards**: Automatically create study cards from your content
- **FSRS Algorithm**: Advanced spaced repetition for optimal learning
- **Deck Management**: Organize flashcards by subject or topic
- **Review Tracking**: Monitor your learning progress with difficulty ratings (Again, Hard, Good, Easy)
- **Study Stats**: Track mastery levels (New, Learning, Young, Mature)

### ✅ **Task Management**
- **Manual Task Creation**: Add tasks with priority levels, due dates, and descriptions
- **Voice Input**: 🎤 Create tasks hands-free using speech recognition
- **AI Task Extraction**: Automatically extract action items from documents
- **Kanban Board**: Organize tasks by status (To Do, In Progress, Done)
- **Priority Levels**: Urgent, High, Medium, Low
- **Project Grouping**: Organize tasks by project categories

### 🕸️ **Mind Mapping**
- **Knowledge Graph**: Visualize connections between your content
- **Interactive Nodes**: Explore relationships and dependencies
- **Link Creation**: Manually connect related pieces of information

### 📊 **Dashboard & Analytics**
- **Activity Timeline**: Track your knowledge management journey
- **Statistics Overview**: Monitor content uploads, flashcard reviews, and task completion
- **Progress Metrics**: View learning streaks and productivity insights

---

## 🔧 Technical Highlights

- **Modern Stack**: FastAPI + React + TypeScript + PostgreSQL
- **Async Architecture**: Non-blocking operations for better performance
- **RESTful API**: Well-documented endpoints with OpenAPI/Swagger
- **JWT Authentication**: Secure user sessions and data privacy
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Updates**: Instant feedback on all operations

---

## ✅ Currently Working

- ✅ User authentication (register/login)
- ✅ Content upload and management (all file types)
- ✅ Flashcard generation and review system
- ✅ Task creation (manual + voice input)
- ✅ Task board with drag-and-drop status updates
- ✅ Content search and filtering
- ✅ Deck organization for flashcards
- ✅ Priority and status management for tasks
- ✅ Content editing and deletion
- ✅ Favorites and pinning system

---

## 🚀 Getting Started

1. **Backend Setup**: Configure PostgreSQL, install dependencies, run migrations
2. **Frontend Setup**: Install npm packages, configure API endpoint
3. **Environment**: Set up `.env` with database credentials and AI provider API keys
4. **Launch**: Start backend server (port 8000) and frontend dev server (port 5173)

For detailed setup instructions, see [README.md](README.md).

---

## 📝 License

MIT License - feel free to use and modify for personal or commercial projects.
