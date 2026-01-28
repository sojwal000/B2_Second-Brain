# B2 Second Brain - Frontend

A React-based frontend for the B2 Second Brain personal knowledge management system.

## Features

- **Dashboard**: Overview of your knowledge base with stats and quick access
- **Content Management**: Upload, view, and organize your content
- **AI Assistant**: Chat with your knowledge base using RAG
- **Flashcards**: Spaced repetition learning with SM-2 algorithm
- **Tasks**: Manage to-dos and action items extracted from content
- **Mind Map**: Visualize connections in your knowledge graph
- **Settings**: Customize your preferences and AI settings

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: MUI Icons, Framer Motion
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **Routing**: React Router v6
- **Charts**: Recharts, D3.js (Mind Map)

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Access the app**:
   - Open http://localhost:3000

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
frontend/
├── public/              # Static assets
│   └── brain.svg        # App icon
├── src/
│   ├── components/      # Reusable components
│   │   ├── ui/          # UI primitives (Button, Card, etc.)
│   │   └── Layout.tsx   # Main layout with sidebar
│   ├── pages/           # Page components
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── ContentPage.tsx
│   │   ├── ContentDetailPage.tsx
│   │   ├── AssistantPage.tsx
│   │   ├── FlashcardsPage.tsx
│   │   ├── TasksPage.tsx
│   │   ├── MindMapPage.tsx
│   │   └── SettingsPage.tsx
│   ├── services/        # API service layer
│   │   ├── api.ts       # Axios instance with interceptors
│   │   ├── authService.ts
│   │   ├── contentService.ts
│   │   ├── assistantService.ts
│   │   ├── flashcardService.ts
│   │   ├── taskService.ts
│   │   ├── dashboardService.ts
│   │   └── mindmapService.ts
│   ├── store/           # Zustand stores
│   │   ├── authStore.ts
│   │   └── contentStore.ts
│   ├── types/           # TypeScript types
│   │   └── index.ts
│   ├── App.tsx          # Main app with routing
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── index.html           # HTML template
├── package.json         # Dependencies
├── tailwind.config.js   # Tailwind configuration
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite configuration
```

## Pages

### Dashboard
- Overview statistics (content count, due flashcards, pending tasks, streak)
- Today's focus with quick actions
- Recent activity feed
- Content breakdown by type

### Content
- File upload with drag & drop
- Text content creation
- Grid view with filters (favorites, pinned, archived)
- Search functionality
- Content type icons and badges

### Assistant
- Chat interface for RAG Q&A
- Message history with sources
- Suggested questions
- Markdown rendering with syntax highlighting

### Flashcards
- Deck management
- Card review with SM-2 ratings
- Progress tracking
- AI card generation

### Tasks
- Kanban-style columns (To Do, In Progress, Done)
- Priority levels with colors
- Due date tracking
- Quick toggle completion

### Mind Map
- D3.js force-directed graph
- Zoom and pan controls
- Node filtering
- Connection visualization

### Settings
- Profile management
- Theme selection
- Notification preferences
- AI provider configuration
- Data export/import

## Development

### Code Style
- ESLint for linting
- TypeScript strict mode
- Prettier for formatting (recommended)

### Adding New Features
1. Create service in `src/services/`
2. Add types in `src/types/`
3. Create page component in `src/pages/`
4. Add route in `src/App.tsx`
5. Update navigation in `src/components/Layout.tsx`

## License

MIT License
