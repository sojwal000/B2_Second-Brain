# B2 Second Brain - System Specification Document

**Document Version:** 1.0  
**Date:** January 17, 2026  
**Classification:** Technical Specification  

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Functional Requirements](#2-functional-requirements)
3. [Non-Functional Requirements](#3-non-functional-requirements)
4. [System Architecture](#4-system-architecture)
5. [Component Specifications](#5-component-specifications)
6. [Data Specifications](#6-data-specifications)
7. [API Specifications](#7-api-specifications)
8. [Integration Specifications](#8-integration-specifications)
9. [Security Specifications](#9-security-specifications)
10. [Deployment Specifications](#10-deployment-specifications)
11. [Testing Specifications](#11-testing-specifications)
12. [Monitoring & Observability](#12-monitoring--observability)

---

## 1. System Overview

### 1.1 Purpose

B2 Second Brain is a personal knowledge management system that enables users to:
- Capture and store multimodal content (text, images, audio, video, documents)
- Organize knowledge with AI-powered tagging, categorization, and linking
- Retrieve information using natural language queries (RAG)
- Learn effectively through AI-generated flashcards with spaced repetition
- Track tasks and deadlines extracted from content
- Visualize knowledge relationships through mind maps

### 1.2 Scope

| In Scope | Out of Scope |
|----------|--------------|
| Personal knowledge management | Team/enterprise collaboration |
| Multimodal content processing | Real-time collaboration editing |
| AI-powered search and retrieval | Social features |
| Flashcard-based learning | Gamification |
| Task extraction and management | Project management |
| Mind map visualization | Advanced diagramming tools |
| Single-user data isolation | Multi-tenant architecture |

### 1.3 System Context Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM CONTEXT                                       │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│                           ┌─────────────────┐                                    │
│                           │                 │                                    │
│    ┌──────────────┐       │   B2 Second     │       ┌──────────────┐            │
│    │              │       │   Brain System  │       │              │            │
│    │    User      │◄─────►│                 │◄─────►│  AI Services │            │
│    │  (Browser/   │       │  ┌───────────┐  │       │  (LLM, OCR,  │            │
│    │   Mobile)    │       │  │ Frontend  │  │       │   STT, etc.) │            │
│    │              │       │  └───────────┘  │       │              │            │
│    └──────────────┘       │        │        │       └──────────────┘            │
│                           │        ▼        │                                    │
│                           │  ┌───────────┐  │       ┌──────────────┐            │
│                           │  │ Backend   │  │       │              │            │
│                           │  │ Services  │◄─┼──────►│  Databases   │            │
│                           │  └───────────┘  │       │  (SQL, NoSQL,│            │
│                           │        │        │       │   Vector)    │            │
│                           │        ▼        │       │              │            │
│                           │  ┌───────────┐  │       └──────────────┘            │
│                           │  │ File      │  │                                    │
│                           │  │ Storage   │  │       ┌──────────────┐            │
│                           │  └───────────┘  │       │              │            │
│                           │                 │◄─────►│  Message     │            │
│                           └─────────────────┘       │  Queue       │            │
│                                                     │              │            │
│                                                     └──────────────┘            │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Key Stakeholders

| Stakeholder | Role | Responsibilities |
|-------------|------|------------------|
| End User | Primary user | Captures, organizes, retrieves personal knowledge |
| System Administrator | Operations | Deploys, maintains, monitors system |
| Developer | Development | Implements features, fixes bugs |
| Data Scientist | AI/ML | Optimizes AI pipelines, model selection |

---

## 2. Functional Requirements

### 2.1 User Management (FR-UM)

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-UM-001 | User Registration | P0 | System shall allow users to register with email, username, and password |
| FR-UM-002 | User Authentication | P0 | System shall authenticate users via username/password and issue JWT tokens |
| FR-UM-003 | Password Reset | P1 | System shall allow users to reset password via email verification |
| FR-UM-004 | Profile Management | P1 | System shall allow users to update profile information |
| FR-UM-005 | Preferences Storage | P1 | System shall persist user preferences (theme, default settings) |
| FR-UM-006 | Session Management | P0 | System shall manage user sessions with configurable expiry |
| FR-UM-007 | OAuth Integration | P2 | System shall support OAuth2 login (Google, GitHub) |
| FR-UM-008 | Account Deletion | P1 | System shall allow users to delete account and all associated data |

### 2.2 Content Management (FR-CM)

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-CM-001 | Text Content Creation | P0 | System shall allow creation of text notes with title and body |
| FR-CM-002 | File Upload | P0 | System shall accept file uploads (images, audio, video, documents) |
| FR-CM-003 | Content Type Detection | P0 | System shall automatically detect and classify content type |
| FR-CM-004 | Text Extraction | P0 | System shall extract text from uploaded files (OCR, STT, PDF parsing) |
| FR-CM-005 | Metadata Storage | P0 | System shall store content metadata (title, tags, subject, source) |
| FR-CM-006 | Content Listing | P0 | System shall list user content with pagination |
| FR-CM-007 | Content Search | P0 | System shall support keyword search across content |
| FR-CM-008 | Content Filtering | P1 | System shall filter content by type, tags, subject, date |
| FR-CM-009 | Content Sorting | P1 | System shall sort content by date, title, relevance, priority |
| FR-CM-010 | Content Update | P0 | System shall allow updating content metadata |
| FR-CM-011 | Content Deletion | P0 | System shall allow permanent content deletion |
| FR-CM-012 | Favorite/Pin | P1 | System shall allow users to favorite and pin content |
| FR-CM-013 | Content Archiving | P2 | System shall allow archiving content without deletion |
| FR-CM-014 | Bulk Operations | P2 | System shall support bulk tag/delete/archive operations |
| FR-CM-015 | Web Import | P2 | System shall import content from URLs (web scraping) |
| FR-CM-016 | File Size Limits | P0 | System shall enforce configurable file size limits |

### 2.3 AI Processing (FR-AI)

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-AI-001 | Summary Generation | P0 | System shall generate summaries for all content |
| FR-AI-002 | Entity Extraction | P1 | System shall extract named entities (people, places, concepts) |
| FR-AI-003 | Topic Detection | P1 | System shall detect and assign topics to content |
| FR-AI-004 | Embedding Generation | P0 | System shall generate vector embeddings for content chunks |
| FR-AI-005 | Task Extraction | P1 | System shall extract action items and deadlines from content |
| FR-AI-006 | Auto-Tagging | P2 | System shall suggest tags based on content analysis |
| FR-AI-007 | Content Linking | P2 | System shall suggest relationships between content items |
| FR-AI-008 | Confidence Scoring | P1 | System shall provide confidence scores for AI-generated data |

### 2.4 Search & Retrieval (FR-SR)

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-SR-001 | Semantic Search | P0 | System shall perform vector similarity search on content |
| FR-SR-002 | Keyword Search | P0 | System shall perform full-text keyword search |
| FR-SR-003 | Hybrid Search | P1 | System shall combine semantic and keyword search results |
| FR-SR-004 | Filtered Search | P1 | System shall apply filters during search (type, date, tags) |
| FR-SR-005 | Search Ranking | P0 | System shall rank results by relevance score |
| FR-SR-006 | Search History | P2 | System shall store and display recent searches |
| FR-SR-007 | Search Suggestions | P2 | System shall suggest related queries |

### 2.5 RAG Q&A (FR-RAG)

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-RAG-001 | Natural Language Query | P0 | System shall accept natural language questions |
| FR-RAG-002 | Context Retrieval | P0 | System shall retrieve relevant content for query context |
| FR-RAG-003 | Answer Generation | P0 | System shall generate answers using LLM with retrieved context |
| FR-RAG-004 | Source Citation | P0 | System shall cite sources used in answer generation |
| FR-RAG-005 | Context Style | P1 | System shall adapt answer style (teacher, client, self) |
| FR-RAG-006 | Follow-up Questions | P2 | System shall suggest follow-up questions |
| FR-RAG-007 | Conversation History | P2 | System shall maintain multi-turn conversation context |
| FR-RAG-008 | Answer Confidence | P1 | System shall indicate confidence level of answers |

### 2.6 Flashcard System (FR-FC)

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-FC-001 | Manual Creation | P0 | System shall allow manual flashcard creation (Q&A) |
| FR-FC-002 | AI Generation | P0 | System shall generate flashcards from content using AI |
| FR-FC-003 | Deck Organization | P1 | System shall organize flashcards into decks |
| FR-FC-004 | Spaced Repetition | P0 | System shall schedule reviews using spaced repetition (SM-2/FSRS) |
| FR-FC-005 | Review Session | P0 | System shall present due cards for review |
| FR-FC-006 | Difficulty Rating | P0 | System shall accept user rating (easy, medium, hard, again) |
| FR-FC-007 | Progress Tracking | P1 | System shall track review statistics |
| FR-FC-008 | Card Types | P2 | System shall support multiple card types (basic, cloze, image) |
| FR-FC-009 | Bulk Generation | P1 | System shall generate multiple cards from single content |
| FR-FC-010 | Card Editing | P0 | System shall allow editing existing flashcards |

### 2.7 Task Management (FR-TM)

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-TM-001 | Manual Creation | P0 | System shall allow manual task creation |
| FR-TM-002 | AI Extraction | P1 | System shall extract tasks from content automatically |
| FR-TM-003 | Status Management | P0 | System shall track task status (pending, in progress, completed) |
| FR-TM-004 | Priority Setting | P1 | System shall assign priority levels to tasks |
| FR-TM-005 | Due Date | P0 | System shall track task due dates |
| FR-TM-006 | Content Linking | P1 | System shall link tasks to source content |
| FR-TM-007 | Task Listing | P0 | System shall list tasks with filtering and sorting |
| FR-TM-008 | Overdue Detection | P1 | System shall identify and highlight overdue tasks |
| FR-TM-009 | Task Completion | P0 | System shall mark tasks as completed |

### 2.8 Mind Map / Knowledge Graph (FR-MM)

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-MM-001 | Link Creation | P1 | System shall allow manual content linking |
| FR-MM-002 | Link Types | P1 | System shall support different relationship types |
| FR-MM-003 | Auto-Linking | P2 | System shall suggest links based on similarity |
| FR-MM-004 | Graph Visualization | P1 | System shall render content relationships as graph |
| FR-MM-005 | Graph Navigation | P1 | System shall allow interactive graph exploration |
| FR-MM-006 | Link Deletion | P1 | System shall allow removing content links |

### 2.9 Dashboard & Analytics (FR-DA)

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-DA-001 | Summary Stats | P1 | System shall display content and task statistics |
| FR-DA-002 | Recent Activity | P1 | System shall show recently added/accessed content |
| FR-DA-003 | Upcoming Tasks | P1 | System shall display upcoming task deadlines |
| FR-DA-004 | Suggested Recalls | P2 | System shall suggest content for review |
| FR-DA-005 | Study Progress | P2 | System shall show flashcard study progress |

### 2.10 Settings & Preferences (FR-SP)

| ID | Requirement | Priority | Description |
|----|-------------|----------|-------------|
| FR-SP-001 | Theme Selection | P1 | System shall support light/dark theme |
| FR-SP-002 | User Mode | P1 | System shall support modes (Learning, Work, Research, All) |
| FR-SP-003 | Default Context Style | P2 | System shall allow setting default AI context style |
| FR-SP-004 | Auto-Processing | P2 | System shall allow enabling/disabling auto AI processing |
| FR-SP-005 | Data Export | P1 | System shall allow exporting user data |

---

## 3. Non-Functional Requirements

### 3.1 Performance Requirements (NFR-P)

| ID | Requirement | Target | Measurement |
|----|-------------|--------|-------------|
| NFR-P-001 | Page Load Time | < 2 seconds | Time to interactive |
| NFR-P-002 | API Response Time (Simple) | < 200ms | P95 latency |
| NFR-P-003 | API Response Time (Search) | < 500ms | P95 latency |
| NFR-P-004 | API Response Time (RAG) | < 5 seconds | P95 latency |
| NFR-P-005 | File Upload Start | < 1 second | Time to begin processing |
| NFR-P-006 | Concurrent Users | 100 | Simultaneous active sessions |
| NFR-P-007 | Content Processing | < 30 seconds | P95 for standard documents |
| NFR-P-008 | Embedding Generation | < 100ms/chunk | Average processing time |

### 3.2 Scalability Requirements (NFR-S)

| ID | Requirement | Target | Notes |
|----|-------------|--------|-------|
| NFR-S-001 | Users per Instance | 1,000 | Single deployment |
| NFR-S-002 | Content per User | 100,000 items | With acceptable performance |
| NFR-S-003 | Embeddings per User | 1,000,000 chunks | Vector DB scaling |
| NFR-S-004 | Storage per User | 50 GB | File storage limit |
| NFR-S-005 | Horizontal Scaling | Supported | API servers stateless |

### 3.3 Availability Requirements (NFR-A)

| ID | Requirement | Target | Notes |
|----|-------------|--------|-------|
| NFR-A-001 | System Uptime | 99.5% | Monthly availability |
| NFR-A-002 | Planned Downtime | < 4 hours/month | Maintenance windows |
| NFR-A-003 | Recovery Time (RTO) | < 4 hours | From major failure |
| NFR-A-004 | Recovery Point (RPO) | < 1 hour | Maximum data loss |

### 3.4 Security Requirements (NFR-SEC)

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-SEC-001 | Authentication | All API endpoints require authentication except auth routes |
| NFR-SEC-002 | Password Storage | Passwords hashed with bcrypt (cost factor ≥ 12) |
| NFR-SEC-003 | Token Security | JWT tokens with RS256, 15-min access / 7-day refresh |
| NFR-SEC-004 | Data Encryption (Transit) | TLS 1.2+ for all connections |
| NFR-SEC-005 | Data Encryption (Rest) | AES-256 for sensitive data |
| NFR-SEC-006 | Input Validation | All inputs validated and sanitized |
| NFR-SEC-007 | Rate Limiting | API rate limits enforced per user |
| NFR-SEC-008 | CORS | Restricted to allowed origins |
| NFR-SEC-009 | SQL Injection | Parameterized queries only |
| NFR-SEC-010 | XSS Prevention | Output encoding, CSP headers |

### 3.5 Reliability Requirements (NFR-R)

| ID | Requirement | Target | Notes |
|----|-------------|--------|-------|
| NFR-R-001 | Error Rate | < 0.1% | 5xx errors / total requests |
| NFR-R-002 | Data Durability | 99.999% | No data loss |
| NFR-R-003 | Graceful Degradation | Required | Fallback when AI services unavailable |
| NFR-R-004 | Backup Frequency | Daily | Full database backup |
| NFR-R-005 | Backup Retention | 30 days | Rolling retention |

### 3.6 Maintainability Requirements (NFR-M)

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-M-001 | Code Coverage | Minimum 80% unit test coverage |
| NFR-M-002 | Documentation | API documentation auto-generated (OpenAPI) |
| NFR-M-003 | Logging | Structured logging with correlation IDs |
| NFR-M-004 | Configuration | Environment-based configuration |
| NFR-M-005 | Dependency Management | Pinned versions, regular updates |

### 3.7 Usability Requirements (NFR-U)

| ID | Requirement | Description |
|----|-------------|-------------|
| NFR-U-001 | Responsive Design | Support desktop (1920px) to mobile (320px) |
| NFR-U-002 | Browser Support | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| NFR-U-003 | Accessibility | WCAG 2.1 Level AA compliance |
| NFR-U-004 | Loading States | Visual feedback for all async operations |
| NFR-U-005 | Error Messages | User-friendly error messages with recovery hints |

---

## 4. System Architecture

### 4.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           SYSTEM ARCHITECTURE                                     │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                              PRESENTATION LAYER                              │ │
│  │                                                                              │ │
│  │   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐       │ │
│  │   │   Web Client     │   │   Mobile Web     │   │   Desktop App    │       │ │
│  │   │   (React/Next.js)│   │   (PWA)          │   │   (Tauri/Future) │       │ │
│  │   └────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘       │ │
│  │            │                      │                      │                  │ │
│  └────────────┼──────────────────────┼──────────────────────┼──────────────────┘ │
│               │                      │                      │                    │
│               └──────────────────────┼──────────────────────┘                    │
│                                      │                                           │
│                                      ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                              API GATEWAY LAYER                               │ │
│  │                                                                              │ │
│  │   ┌────────────────────────────────────────────────────────────────────┐   │ │
│  │   │                    API Gateway / Load Balancer                      │   │ │
│  │   │         (Rate Limiting, Authentication, Routing, SSL)               │   │ │
│  │   └────────────────────────────────┬───────────────────────────────────┘   │ │
│  │                                    │                                        │ │
│  └────────────────────────────────────┼────────────────────────────────────────┘ │
│                                       │                                          │
│                    ┌──────────────────┼──────────────────┐                      │
│                    │                  │                  │                      │
│                    ▼                  ▼                  ▼                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                              APPLICATION LAYER                               │ │
│  │                                                                              │ │
│  │   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │ │
│  │   │   Auth Service   │  │  Content Service │  │   RAG Service    │         │ │
│  │   │   ────────────   │  │  ──────────────  │  │   ───────────    │         │ │
│  │   │ • Registration   │  │ • CRUD Content   │  │ • Query Process  │         │ │
│  │   │ • Login/Logout   │  │ • File Upload    │  │ • Vector Search  │         │ │
│  │   │ • Token Mgmt     │  │ • Search/Filter  │  │ • Answer Gen     │         │ │
│  │   │ • User Profile   │  │ • Organization   │  │ • Citation       │         │ │
│  │   └──────────────────┘  └──────────────────┘  └──────────────────┘         │ │
│  │                                                                              │ │
│  │   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │ │
│  │   │ Flashcard Service│  │   Task Service   │  │ Dashboard Service│         │ │
│  │   │ ────────────────│  │  ──────────────  │  │ ────────────────│         │ │
│  │   │ • CRUD Cards     │  │ • CRUD Tasks     │  │ • Statistics     │         │ │
│  │   │ • AI Generation  │  │ • AI Extraction  │  │ • Recent Items   │         │ │
│  │   │ • Review Logic   │  │ • Due Date Mgmt  │  │ • Suggestions    │         │ │
│  │   │ • SRS Algorithm  │  │ • Status Tracking│  │ • Analytics      │         │ │
│  │   └──────────────────┘  └──────────────────┘  └──────────────────┘         │ │
│  │                                                                              │ │
│  └──────────────────────────────────────────────────────────────────────────────┘ │
│                                       │                                          │
│                                       ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                              PROCESSING LAYER                                │ │
│  │                                                                              │ │
│  │   ┌─────────────────────────────────────────────────────────────────────┐  │ │
│  │   │                      Message Queue (Redis/RabbitMQ)                  │  │ │
│  │   └───────────────────────────────┬─────────────────────────────────────┘  │ │
│  │                                   │                                         │ │
│  │            ┌──────────────────────┼──────────────────────┐                 │ │
│  │            ▼                      ▼                      ▼                 │ │
│  │   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐        │ │
│  │   │ Content Worker   │  │ Embedding Worker │  │   AI Worker      │        │ │
│  │   │ ───────────────  │  │ ───────────────  │  │   ──────────     │        │ │
│  │   │ • OCR Processing │  │ • Chunk Text     │  │ • Summarization  │        │ │
│  │   │ • STT Processing │  │ • Gen Embeddings │  │ • Entity Extract │        │ │
│  │   │ • Doc Parsing    │  │ • Store Vectors  │  │ • Task Extract   │        │ │
│  │   │ • File Handling  │  │ • Index Update   │  │ • Card Generation│        │ │
│  │   └──────────────────┘  └──────────────────┘  └──────────────────┘        │ │
│  │                                                                              │ │
│  └──────────────────────────────────────────────────────────────────────────────┘ │
│                                       │                                          │
│                                       ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                                DATA LAYER                                    │ │
│  │                                                                              │ │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │ │
│  │   │  PostgreSQL  │  │   Vector DB  │  │   MongoDB    │  │    Redis     │   │ │
│  │   │  ──────────  │  │  ──────────  │  │  ──────────  │  │   ────────   │   │ │
│  │   │ • Users      │  │ • Embeddings │  │ • Raw Content│  │ • Cache      │   │ │
│  │   │ • Content    │  │ • Index      │  │ • Documents  │  │ • Sessions   │   │ │
│  │   │ • Tasks      │  │ • Metadata   │  │ • Backups    │  │ • Queue      │   │ │
│  │   │ • Flashcards │  │              │  │              │  │              │   │ │
│  │   │ • Links      │  │              │  │              │  │              │   │ │
│  │   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │ │
│  │                                                                              │ │
│  │   ┌─────────────────────────────────────────────────────────────────────┐  │ │
│  │   │                     Object Storage (MinIO/S3)                        │  │ │
│  │   │                     • Uploaded Files                                 │  │ │
│  │   │                     • Processed Media                                │  │ │
│  │   │                     • Backups                                        │  │ │
│  │   └─────────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                              │ │
│  └──────────────────────────────────────────────────────────────────────────────┘ │
│                                       │                                          │
│                                       ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                            EXTERNAL SERVICES                                 │ │
│  │                                                                              │ │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │ │
│  │   │  LLM API     │  │   OCR API    │  │   STT API    │  │  Email API   │   │ │
│  │   │  (Gemini/    │  │  (Azure/     │  │  (Whisper/   │  │  (SMTP/      │   │ │
│  │   │   OpenAI)    │  │   Google)    │  │   Assembly)  │  │   SendGrid)  │   │ │
│  │   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │ │
│  │                                                                              │ │
│  └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Technology Stack Specification

| Layer | Component | Technology | Version | Purpose |
|-------|-----------|------------|---------|---------|
| **Frontend** | Framework | React | 18.x | UI framework |
| | Build Tool | Vite | 5.x | Development/bundling |
| | Routing | React Router | 6.x | Client-side routing |
| | State | TanStack Query | 5.x | Server state management |
| | Styling | TailwindCSS | 3.x | Utility-first CSS |
| | Icons | Heroicons | 2.x | Icon library |
| | HTTP Client | Axios | 1.x | API communication |
| **Backend** | Framework | FastAPI | 0.109+ | API framework |
| | ORM | SQLAlchemy | 2.0+ | Database ORM |
| | Validation | Pydantic | 2.x | Data validation |
| | Auth | python-jose | 3.x | JWT handling |
| | Password | passlib/bcrypt | 1.7+ | Password hashing |
| | AI Framework | LangChain | 0.1+ | LLM orchestration |
| **Databases** | Relational | PostgreSQL | 14+ | Primary data store |
| | Vector | pgvector/Qdrant | - | Vector embeddings |
| | Document | MongoDB | 6+ | Raw content storage |
| | Cache | Redis | 7+ | Caching, sessions, queue |
| **AI/ML** | LLM | Gemini/OpenAI | - | Text generation |
| | Embeddings | SentenceTransformers | 2.x | Vector embeddings |
| | OCR | Tesseract/PaddleOCR | - | Image text extraction |
| | STT | Whisper | - | Speech transcription |
| | Documents | PyPDF | 3.x | PDF parsing |
| **Infrastructure** | Container | Docker | 24+ | Containerization |
| | Orchestration | Docker Compose | 2.x | Local orchestration |
| | Reverse Proxy | Nginx/Traefik | - | Load balancing, SSL |
| | Object Storage | MinIO/S3 | - | File storage |

### 4.3 Deployment Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           DEPLOYMENT ARCHITECTURE                                 │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                              Internet                                        │ │
│  └─────────────────────────────────┬───────────────────────────────────────────┘ │
│                                    │                                              │
│                                    ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                      CDN (CloudFlare/AWS CloudFront)                         │ │
│  │                           Static Assets, SSL                                 │ │
│  └─────────────────────────────────┬───────────────────────────────────────────┘ │
│                                    │                                              │
│                                    ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                      Load Balancer (Nginx/ALB)                               │ │
│  │                           SSL Termination                                    │ │
│  └────────────────┬────────────────┬────────────────┬──────────────────────────┘ │
│                   │                │                │                             │
│         ┌─────────┴────────┐ ┌────┴─────┐ ┌───────┴────────┐                    │
│         ▼                  ▼ ▼          ▼ ▼                ▼                    │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐         │
│  │ Frontend    │   │ API Server  │   │ API Server  │   │ API Server  │         │
│  │ Container   │   │ Container 1 │   │ Container 2 │   │ Container N │         │
│  │ (Nginx+React)│  │ (FastAPI)   │   │ (FastAPI)   │   │ (FastAPI)   │         │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘         │
│                           │                │                │                    │
│                           └────────────────┼────────────────┘                    │
│                                            │                                     │
│  ┌─────────────────────────────────────────┼───────────────────────────────────┐ │
│  │                      Internal Network   │                                    │ │
│  │                                         ▼                                    │ │
│  │      ┌──────────────────────────────────────────────────────────────────┐   │ │
│  │      │                     Redis (Message Queue)                         │   │ │
│  │      └──────────────┬──────────────┬──────────────┬─────────────────────┘   │ │
│  │                     │              │              │                          │ │
│  │           ┌─────────┴────┐   ┌─────┴────┐   ┌────┴─────┐                    │ │
│  │           ▼              ▼   ▼          ▼   ▼          ▼                    │ │
│  │    ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐              │ │
│  │    │  Worker   │  │  Worker   │  │  Worker   │  │  Worker   │              │ │
│  │    │  (CPU)    │  │  (CPU)    │  │  (GPU)    │  │  (GPU)    │              │ │
│  │    └───────────┘  └───────────┘  └───────────┘  └───────────┘              │ │
│  │                                                                              │ │
│  │      ┌──────────────────────────────────────────────────────────────────┐   │ │
│  │      │                      Database Cluster                             │   │ │
│  │      │                                                                   │   │ │
│  │      │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │   │ │
│  │      │  │ PostgreSQL  │  │   MongoDB   │  │  Vector DB  │               │   │ │
│  │      │  │  Primary    │  │   Replica   │  │  (Qdrant)   │               │   │ │
│  │      │  └──────┬──────┘  └─────────────┘  └─────────────┘               │   │ │
│  │      │         │                                                         │   │ │
│  │      │  ┌──────▼──────┐                                                  │   │ │
│  │      │  │ PostgreSQL  │                                                  │   │ │
│  │      │  │  Replica    │                                                  │   │ │
│  │      │  └─────────────┘                                                  │   │ │
│  │      │                                                                   │   │ │
│  │      └──────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                              │ │
│  │      ┌──────────────────────────────────────────────────────────────────┐   │ │
│  │      │                     Object Storage (MinIO)                        │   │ │
│  │      │                         Uploaded Files                            │   │ │
│  │      └──────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                              │ │
│  └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Component Specifications

### 5.1 Frontend Components

#### 5.1.1 Application Shell

```
src/
├── App.jsx                    # Root component, routing setup
├── main.jsx                   # Entry point
├── index.css                  # Global styles
├── components/
│   ├── Layout.jsx             # Main layout wrapper
│   ├── Sidebar.jsx            # Navigation sidebar
│   ├── Header.jsx             # Top header/navbar
│   ├── LoadingSpinner.jsx     # Loading indicator
│   └── ErrorBoundary.jsx      # Error handling wrapper
├── context/
│   ├── AuthContext.jsx        # Authentication state
│   └── ThemeContext.jsx       # Theme preferences
├── hooks/
│   ├── useAuth.js             # Auth hook
│   ├── useDebounce.js         # Input debouncing
│   └── useLocalStorage.js     # Persistent storage
├── services/
│   └── api.js                 # Axios instance, interceptors
└── utils/
    ├── formatters.js          # Date, number formatting
    └── validators.js          # Input validation
```

#### 5.1.2 Page Components

| Page | Route | Purpose | Key Features |
|------|-------|---------|--------------|
| Login | `/login` | User authentication | Email/password form, OAuth buttons |
| Register | `/register` | New user signup | Registration form with validation |
| Dashboard | `/dashboard` | Overview | Stats, recent items, quick actions |
| Capture | `/capture` | Content creation | File upload, text input, voice recording |
| Library | `/library` | Content browsing | Grid/list view, search, filters, sort |
| Assistant | `/assistant` | RAG Q&A | Chat interface, source citations |
| Flashcards | `/flashcards` | Study cards | Review interface, deck management |
| Tasks | `/tasks` | Task management | Task list, status filters, due dates |
| Mind Map | `/mindmap` | Knowledge graph | Force-directed graph, link editing |
| Settings | `/settings` | Preferences | Profile, theme, mode, data export |

#### 5.1.3 Component State Management

```javascript
// React Query Configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5 minutes
      cacheTime: 30 * 60 * 1000,       // 30 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

// Query Keys Convention
const queryKeys = {
  content: {
    all: ['content'],
    list: (params) => ['content', 'list', params],
    detail: (id) => ['content', id],
  },
  tasks: {
    all: ['tasks'],
    list: (status) => ['tasks', 'list', status],
    detail: (id) => ['tasks', id],
  },
  flashcards: {
    all: ['flashcards'],
    due: () => ['flashcards', 'due'],
    deck: (deckId) => ['flashcards', 'deck', deckId],
  },
};
```

### 5.2 Backend Components

#### 5.2.1 API Router Structure

```
app/
├── main.py                    # FastAPI app initialization
├── api/
│   ├── __init__.py
│   ├── auth.py               # Authentication endpoints
│   ├── content.py            # Content management endpoints
│   ├── assistant.py          # RAG/Search endpoints
│   ├── flashcards.py         # Flashcard endpoints
│   ├── tasks.py              # Task endpoints
│   ├── mindmap.py            # Content linking endpoints
│   ├── dashboard.py          # Dashboard data endpoints
│   └── settings.py           # User settings endpoints
├── core/
│   ├── config.py             # Application configuration
│   ├── database.py           # Database connections
│   └── security.py           # Auth utilities
├── models/
│   └── database.py           # SQLAlchemy models
├── schemas/
│   └── schemas.py            # Pydantic schemas
└── services/
    ├── ai_service.py         # AI/LLM operations
    ├── content_processor.py  # Content processing pipeline
    ├── ocr_service.py        # OCR operations
    ├── stt_service.py        # Speech-to-text
    ├── document_service.py   # Document parsing
    ├── rag_service.py        # RAG Q&A logic
    ├── search_service.py     # Search operations
    └── task_extraction_service.py  # Task extraction
```

#### 5.2.2 Service Layer Specifications

##### ContentProcessorService

```python
class ContentProcessorService:
    """
    Orchestrates content processing pipeline.
    """
    
    async def process_upload(
        self,
        file: UploadFile,
        user_id: int,
        title: Optional[str],
        tags: List[str],
        subject: Optional[str],
        source: Optional[str],
        context_style: Optional[str]
    ) -> Content:
        """
        Process uploaded file through complete pipeline.
        
        Pipeline Steps:
        1. Validate file (size, type)
        2. Save to storage
        3. Detect content type
        4. Extract text (OCR/STT/PDF)
        5. Store in database
        6. Queue AI enrichment
        
        Returns:
            Content: Created content record (processing may be ongoing)
        """
        pass
    
    async def process_text(
        self,
        user_id: int,
        title: str,
        text_content: str,
        tags: List[str],
        subject: Optional[str],
        source: Optional[str],
        context_style: Optional[str]
    ) -> Content:
        """
        Process text note through pipeline.
        """
        pass
```

##### RAGService

```python
class RAGService:
    """
    Handles Retrieval-Augmented Generation queries.
    """
    
    async def query(
        self,
        user_id: int,
        query: str,
        context_style: Optional[str] = None,
        max_sources: int = 5,
        include_sources: bool = True,
        filters: Optional[Dict] = None
    ) -> AssistantResponse:
        """
        Process natural language query through RAG pipeline.
        
        Pipeline Steps:
        1. Generate query embedding
        2. Vector similarity search
        3. Retrieve top-k chunks
        4. Build context from chunks
        5. Generate answer with LLM
        6. Extract and verify citations
        
        Returns:
            AssistantResponse: Answer with sources and metadata
        """
        pass
```

##### AIService

```python
class AIService:
    """
    Handles all AI/ML operations.
    """
    
    async def process_content(
        self,
        text: str,
        context_style: str = "self"
    ) -> Dict[str, Any]:
        """
        Generate summary and extract entities.
        
        Returns:
            Dict containing: summary, entities, topics, confidence
        """
        pass
    
    async def generate_embeddings(
        self,
        content: Content,
        text: str
    ) -> None:
        """
        Generate and store chunk embeddings for content.
        """
        pass
    
    async def generate_flashcards_from_content(
        self,
        text: str,
        subject: Optional[str] = None,
        num_cards: int = 10
    ) -> List[Dict]:
        """
        Generate flashcards from text using LLM.
        """
        pass
    
    async def detect_deadlines(
        self,
        text: str
    ) -> List[Dict]:
        """
        Extract tasks and deadlines from text.
        """
        pass
```

### 5.3 Worker Components

#### 5.3.1 Background Task Types

| Task Type | Queue | Priority | Timeout | Retries |
|-----------|-------|----------|---------|---------|
| content_extraction | content | High | 60s | 3 |
| embedding_generation | embedding | Medium | 30s | 2 |
| ai_summarization | ai | Low | 120s | 2 |
| flashcard_generation | ai | Low | 180s | 1 |
| task_extraction | ai | Low | 60s | 2 |
| auto_linking | ai | Low | 300s | 1 |

#### 5.3.2 Worker Configuration

```python
# Celery/ARQ Configuration
worker_config = {
    'broker_url': 'redis://localhost:6379/0',
    'result_backend': 'redis://localhost:6379/0',
    'task_serializer': 'json',
    'result_serializer': 'json',
    'accept_content': ['json'],
    'timezone': 'UTC',
    'task_routes': {
        'content.*': {'queue': 'content'},
        'embedding.*': {'queue': 'embedding'},
        'ai.*': {'queue': 'ai'},
    },
    'task_default_queue': 'default',
    'worker_prefetch_multiplier': 1,
    'task_acks_late': True,
}
```

---

## 6. Data Specifications

### 6.1 Database Schema

#### 6.1.1 Users Table

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

**Preferences JSON Schema:**
```json
{
  "theme": "light|dark|system",
  "mode": "learning|work|research|everything",
  "default_context_style": "teacher|client|self",
  "auto_process": true,
  "flashcard_daily_goal": 20,
  "notifications_enabled": true
}
```

#### 6.1.2 Contents Table

```sql
CREATE TABLE contents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Metadata
    title VARCHAR(500),
    content_type VARCHAR(50) NOT NULL,  -- text, image, audio, video, document
    original_filename VARCHAR(500),
    file_path VARCHAR(1000),
    file_size INTEGER,
    mime_type VARCHAR(100),
    
    -- Content
    text_content TEXT,
    summary TEXT,
    
    -- Categorization
    tags JSONB DEFAULT '[]',
    subject VARCHAR(255),
    source VARCHAR(255),
    context_style VARCHAR(100),
    
    -- AI Metadata
    entities JSONB DEFAULT '{}',
    extracted_entities JSONB DEFAULT '[]',
    related_topics JSONB DEFAULT '[]',
    confidence_level VARCHAR(20),
    
    -- Organization
    is_favorite BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE,
    
    -- External References
    mongo_doc_id VARCHAR(100),
    
    -- Processing
    is_processed BOOLEAN DEFAULT FALSE,
    processing_status VARCHAR(50) DEFAULT 'pending',
    processing_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    content_date TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_contents_user ON contents(user_id);
CREATE INDEX idx_contents_type ON contents(content_type);
CREATE INDEX idx_contents_created ON contents(created_at DESC);
CREATE INDEX idx_contents_tags ON contents USING GIN(tags);
CREATE INDEX idx_contents_subject ON contents(subject);
CREATE INDEX idx_contents_favorite ON contents(is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX idx_contents_pinned ON contents(is_pinned) WHERE is_pinned = TRUE;
```

#### 6.1.3 Content Embeddings Table

```sql
CREATE TABLE content_embeddings (
    id SERIAL PRIMARY KEY,
    content_id INTEGER NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    
    -- Embedding Data
    embedding JSONB NOT NULL,  -- Vector as JSON array
    -- Or with pgvector: embedding VECTOR(384)
    
    -- Chunk Info
    chunk_index INTEGER DEFAULT 0,
    chunk_text TEXT,
    token_count INTEGER,
    
    -- Metadata
    embedding_model VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_embeddings_content ON content_embeddings(content_id);
-- With pgvector: CREATE INDEX idx_embeddings_vector ON content_embeddings USING ivfflat (embedding vector_cosine_ops);
```

#### 6.1.4 Tasks Table

```sql
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_id INTEGER REFERENCES contents(id) ON DELETE SET NULL,
    
    -- Task Details
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',  -- pending, in_progress, completed, cancelled
    priority INTEGER DEFAULT 0,  -- 0=low, 1=medium, 2=high, 3=urgent
    
    -- Timing
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_minutes INTEGER,
    
    -- Context
    tags JSONB DEFAULT '[]',
    assigned_to VARCHAR(255),
    source_quote TEXT,
    
    -- AI Metadata
    extraction_confidence FLOAT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tasks_user ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due ON tasks(due_date);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
```

#### 6.1.5 Flashcards Table

```sql
CREATE TABLE flashcards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_id INTEGER REFERENCES contents(id) ON DELETE SET NULL,
    deck_id INTEGER REFERENCES decks(id) ON DELETE SET NULL,
    
    -- Card Content
    card_type VARCHAR(50) DEFAULT 'basic',  -- basic, cloze, image
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    explanation TEXT,
    hints JSONB DEFAULT '[]',
    
    -- Categorization
    subject VARCHAR(255),
    tags JSONB DEFAULT '[]',
    
    -- Spaced Repetition (SM-2)
    difficulty VARCHAR(20) DEFAULT 'medium',  -- easy, medium, hard, again
    easiness_factor FLOAT DEFAULT 2.5,
    interval INTEGER DEFAULT 0,  -- days
    repetitions INTEGER DEFAULT 0,
    
    -- Review Tracking
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    next_review_date TIMESTAMP WITH TIME ZONE,
    review_count INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_by VARCHAR(20) DEFAULT 'user',  -- user, ai
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_flashcards_user ON flashcards(user_id);
CREATE INDEX idx_flashcards_deck ON flashcards(deck_id);
CREATE INDEX idx_flashcards_review ON flashcards(next_review_date);
CREATE INDEX idx_flashcards_user_review ON flashcards(user_id, next_review_date);
```

#### 6.1.6 Decks Table

```sql
CREATE TABLE decks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(20),
    
    -- Stats (denormalized for performance)
    card_count INTEGER DEFAULT 0,
    due_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_decks_user ON decks(user_id);
```

#### 6.1.7 Content Links Table

```sql
CREATE TABLE content_links (
    id SERIAL PRIMARY KEY,
    source_id INTEGER NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    target_id INTEGER NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    
    link_type VARCHAR(50) NOT NULL,  -- explains, example_of, similar_to, etc.
    confidence FLOAT DEFAULT 0.5,
    description TEXT,
    created_by VARCHAR(20) DEFAULT 'system',  -- system, user
    bidirectional BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(source_id, target_id, link_type)
);

CREATE INDEX idx_links_source ON content_links(source_id);
CREATE INDEX idx_links_target ON content_links(target_id);
```

#### 6.1.8 Annotations Table

```sql
CREATE TABLE annotations (
    id SERIAL PRIMARY KEY,
    content_id INTEGER NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    note_text TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general',  -- general, reminder, insight, question
    
    -- Position (for future highlight support)
    start_offset INTEGER,
    end_offset INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_annotations_content ON annotations(content_id);
CREATE INDEX idx_annotations_user ON annotations(user_id);
```

#### 6.1.9 Sessions Table

```sql
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    token VARCHAR(500) NOT NULL UNIQUE,
    refresh_token VARCHAR(500) UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Device Info
    user_agent VARCHAR(500),
    ip_address VARCHAR(45),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user ON sessions(user_id);
```

#### 6.1.10 Audit Logs Table

```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    action VARCHAR(100) NOT NULL,  -- upload, delete, query, login, etc.
    resource_type VARCHAR(50),  -- content, task, flashcard, etc.
    resource_id INTEGER,
    
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs(action);
```

### 6.2 MongoDB Collections

#### 6.2.1 raw_contents Collection

```javascript
{
  "_id": ObjectId,
  "content_id": Number,        // Reference to PostgreSQL
  "user_id": Number,
  
  // Raw Data
  "raw_text": String,          // Full extracted text
  "original_file": Binary,     // Optional: original file bytes
  
  // Processing Metadata
  "ocr_result": {
    "engine": String,
    "confidence": Number,
    "regions": Array
  },
  "stt_result": {
    "model": String,
    "segments": Array,
    "language": String
  },
  
  // Timestamps
  "processed_at": ISODate,
  "created_at": ISODate
}

// Indexes
db.raw_contents.createIndex({ "content_id": 1 }, { unique: true })
db.raw_contents.createIndex({ "user_id": 1 })
```

### 6.3 Vector Database Schema (Qdrant)

```javascript
// Collection: content_embeddings
{
  "name": "content_embeddings",
  "vectors": {
    "size": 384,  // MiniLM-L6-v2
    "distance": "Cosine"
  },
  "payload_schema": {
    "user_id": "integer",
    "content_id": "integer",
    "chunk_index": "integer",
    "chunk_text": "text",
    "content_type": "keyword",
    "subject": "keyword",
    "tags": "keyword[]",
    "created_at": "datetime"
  }
}

// Point structure
{
  "id": "uuid",
  "vector": [0.1, 0.2, ...],  // 384 dimensions
  "payload": {
    "user_id": 123,
    "content_id": 456,
    "chunk_index": 0,
    "chunk_text": "The extracted text chunk...",
    "content_type": "document",
    "subject": "Machine Learning",
    "tags": ["ai", "tutorial"],
    "created_at": "2026-01-17T10:30:00Z"
  }
}
```

### 6.4 Cache Schemas (Redis)

```
# Session Cache
session:{token} -> JSON{user_id, expires_at, ...}
TTL: 15 minutes

# User Cache
user:{user_id} -> JSON{id, email, username, preferences}
TTL: 1 hour

# Content Metadata Cache
content:{content_id} -> JSON{...}
TTL: 30 minutes

# Query Result Cache
query:{hash(user_id + query)} -> JSON{answer, sources, ...}
TTL: 5 minutes

# Rate Limiting
ratelimit:{user_id}:{endpoint} -> count
TTL: 1 minute
```

---

## 7. API Specifications

### 7.1 API Standards

- **Base URL**: `/api/v1`
- **Format**: JSON
- **Authentication**: Bearer JWT
- **Versioning**: URL path (`/api/v1`, `/api/v2`)
- **Pagination**: Cursor-based or offset-based
- **Rate Limiting**: Header `X-RateLimit-*`

### 7.2 Request/Response Format

#### Standard Success Response

```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2026-01-17T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

#### Standard Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-01-17T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

#### Paginated Response

```json
{
  "data": [ ... ],
  "pagination": {
    "total": 100,
    "page": 1,
    "page_size": 20,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false
  },
  "meta": { ... }
}
```

### 7.3 Authentication Endpoints

#### POST /api/v1/auth/register

**Request:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}
```

**Response (201):**
```json
{
  "data": {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe",
    "full_name": "John Doe",
    "is_active": true,
    "created_at": "2026-01-17T10:30:00Z"
  }
}
```

#### POST /api/v1/auth/login

**Request (form-data):**
```
username=johndoe
password=SecurePass123!
```

**Response (200):**
```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "expires_in": 900
  }
}
```

#### GET /api/v1/auth/me

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "data": {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe",
    "full_name": "John Doe",
    "preferences": {
      "theme": "dark",
      "mode": "learning"
    },
    "created_at": "2026-01-17T10:30:00Z"
  }
}
```

### 7.4 Content Endpoints

#### POST /api/v1/content/upload

**Request (multipart/form-data):**
```
file: <binary>
title: "Meeting Notes"
tags: "work,meeting"
subject: "Project Alpha"
source: "Team Meeting"
context_style: "self"
```

**Response (202):**
```json
{
  "data": {
    "content_id": 123,
    "filename": "notes.pdf",
    "content_type": "document",
    "file_size": 102400,
    "processing_status": "pending",
    "message": "File uploaded successfully. Processing started."
  }
}
```

#### GET /api/v1/content

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | integer | No | Page number (default: 1) |
| page_size | integer | No | Items per page (default: 20, max: 100) |
| content_type | string | No | Filter by type |
| subject | string | No | Filter by subject |
| tags | string | No | Comma-separated tags |
| search | string | No | Keyword search |
| sort_by | string | No | recently_added, oldest, alphabetical |
| is_favorite | boolean | No | Filter favorites |
| is_pinned | boolean | No | Filter pinned |

**Response (200):**
```json
{
  "data": [
    {
      "id": 123,
      "title": "Meeting Notes",
      "content_type": "document",
      "summary": "Discussion about project timeline...",
      "tags": ["work", "meeting"],
      "subject": "Project Alpha",
      "is_favorite": false,
      "is_pinned": true,
      "created_at": "2026-01-17T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "page_size": 20,
    "total_pages": 3
  }
}
```

#### GET /api/v1/content/{id}

**Response (200):**
```json
{
  "data": {
    "id": 123,
    "title": "Meeting Notes",
    "content_type": "document",
    "original_filename": "notes.pdf",
    "file_size": 102400,
    "text_content": "Full extracted text...",
    "summary": "Discussion about project timeline...",
    "tags": ["work", "meeting"],
    "subject": "Project Alpha",
    "source": "Team Meeting",
    "entities": {
      "people": ["John", "Jane"],
      "concepts": ["deadline", "milestone"]
    },
    "is_favorite": false,
    "is_pinned": true,
    "is_processed": true,
    "view_count": 5,
    "created_at": "2026-01-17T10:30:00Z",
    "updated_at": "2026-01-17T10:30:00Z"
  }
}
```

### 7.5 RAG/Assistant Endpoints

#### POST /api/v1/assistant/query

**Request:**
```json
{
  "query": "What were the main decisions from last week's meetings?",
  "context_style": "self",
  "max_sources": 5,
  "include_sources": true,
  "filters": {
    "content_types": ["document", "text"],
    "date_from": "2026-01-10",
    "date_to": "2026-01-17"
  }
}
```

**Response (200):**
```json
{
  "data": {
    "answer": "Based on your meeting notes from last week, the main decisions were:\n\n1. Project deadline moved to February 15th [Source 1]\n2. New team member onboarding starts Monday [Source 2]\n3. Budget increase approved for Q1 [Source 1]",
    "confidence": 0.87,
    "sources": [
      {
        "content_id": 123,
        "title": "Monday Team Meeting",
        "snippet": "Discussed project timeline and decided to move deadline...",
        "relevance_score": 0.94,
        "created_at": "2026-01-13T14:00:00Z"
      },
      {
        "content_id": 125,
        "title": "HR Update Notes",
        "snippet": "New team member Sarah will start onboarding...",
        "relevance_score": 0.82,
        "created_at": "2026-01-15T10:00:00Z"
      }
    ],
    "query": "What were the main decisions from last week's meetings?",
    "processing_time_ms": 1234
  }
}
```

#### POST /api/v1/assistant/search

**Request:**
```json
{
  "query": "machine learning tutorial",
  "limit": 10,
  "filters": {
    "content_type": "document"
  }
}
```

**Response (200):**
```json
{
  "data": {
    "results": [
      {
        "content_id": 456,
        "title": "ML Basics Tutorial",
        "snippet": "Introduction to machine learning concepts...",
        "similarity_score": 0.89,
        "content_type": "document",
        "tags": ["ml", "tutorial"],
        "created_at": "2026-01-10T09:00:00Z"
      }
    ],
    "total": 8,
    "query": "machine learning tutorial"
  }
}
```

### 7.6 Flashcard Endpoints

#### POST /api/v1/flashcards/generate

**Request:**
```json
{
  "content_id": 123,
  "num_cards": 10,
  "subject": "Machine Learning",
  "deck_name": "ML Basics"
}
```

**Response (201):**
```json
{
  "data": {
    "flashcards": [
      {
        "id": 1,
        "question": "What is supervised learning?",
        "answer": "A type of machine learning where the model learns from labeled data.",
        "explanation": "In supervised learning, each training example has an input and expected output.",
        "subject": "Machine Learning",
        "deck_name": "ML Basics"
      }
    ],
    "count": 10,
    "content_id": 123
  }
}
```

#### GET /api/v1/flashcards/due

**Response (200):**
```json
{
  "data": {
    "cards": [
      {
        "id": 1,
        "question": "What is supervised learning?",
        "answer": "...",
        "deck_name": "ML Basics",
        "last_reviewed_at": "2026-01-16T10:00:00Z",
        "review_count": 3
      }
    ],
    "total_due": 15,
    "by_deck": {
      "ML Basics": 5,
      "Python": 10
    }
  }
}
```

#### POST /api/v1/flashcards/{id}/review

**Request:**
```json
{
  "difficulty": "medium",
  "response_time_ms": 5000
}
```

**Response (200):**
```json
{
  "data": {
    "id": 1,
    "next_review_date": "2026-01-20T10:00:00Z",
    "interval": 3,
    "easiness_factor": 2.5,
    "repetitions": 4
  }
}
```

### 7.7 Task Endpoints

#### POST /api/v1/tasks/extract/{content_id}

**Response (200):**
```json
{
  "data": {
    "tasks": [
      {
        "id": 1,
        "title": "Submit project proposal",
        "description": "Complete and submit the Q1 project proposal",
        "due_date": "2026-01-20T17:00:00Z",
        "priority": 2,
        "content_id": 123,
        "extraction_confidence": 0.89
      }
    ],
    "total": 3,
    "content_id": 123
  }
}
```

#### GET /api/v1/tasks

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | pending, in_progress, completed, all |
| priority | integer | 0-3 |
| due_before | date | Filter by due date |
| due_after | date | Filter by due date |

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Submit project proposal",
      "description": "...",
      "status": "pending",
      "priority": 2,
      "due_date": "2026-01-20T17:00:00Z",
      "content_id": 123,
      "tags": ["work", "urgent"],
      "created_at": "2026-01-17T10:00:00Z"
    }
  ],
  "summary": {
    "total": 10,
    "pending": 5,
    "in_progress": 3,
    "completed": 2,
    "overdue": 1
  }
}
```

### 7.8 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Invalid or missing authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request data |
| RATE_LIMITED | 429 | Too many requests |
| PROCESSING_ERROR | 500 | Internal processing failed |
| AI_SERVICE_ERROR | 503 | AI service unavailable |
| STORAGE_ERROR | 500 | File storage operation failed |

---

## 8. Integration Specifications

### 8.1 External Service Integrations

#### 8.1.1 LLM Integration (Gemini/OpenAI)

```python
# Configuration
LLM_CONFIG = {
    "primary": {
        "provider": "google",
        "model": "gemini-2.0-flash-exp",
        "api_key": "${GOOGLE_API_KEY}",
        "temperature": 0.3,
        "max_tokens": 4096,
        "timeout": 30
    },
    "fallback": {
        "provider": "openai",
        "model": "gpt-4-turbo",
        "api_key": "${OPENAI_API_KEY}",
        "temperature": 0.3,
        "max_tokens": 4096,
        "timeout": 30
    }
}

# Usage Pattern
async def generate_with_fallback(prompt: str) -> str:
    try:
        return await primary_llm.generate(prompt)
    except (RateLimitError, ServiceUnavailableError):
        return await fallback_llm.generate(prompt)
```

#### 8.1.2 Embedding Service Integration

```python
# Configuration
EMBEDDING_CONFIG = {
    "model": "sentence-transformers/all-MiniLM-L6-v2",
    "dimension": 384,
    "batch_size": 32,
    "normalize": True,
    "device": "cpu"  # or "cuda"
}

# Interface
class EmbeddingService:
    def encode(self, texts: List[str]) -> np.ndarray:
        """Generate embeddings for texts."""
        pass
    
    def encode_query(self, query: str) -> np.ndarray:
        """Generate embedding for search query."""
        pass
```

#### 8.1.3 OCR Service Integration

```python
# Configuration
OCR_CONFIG = {
    "engine": "tesseract",  # or "paddleocr", "easyocr"
    "languages": ["eng"],
    "tesseract_cmd": "/usr/bin/tesseract",
    "preprocessing": {
        "deskew": True,
        "denoise": True,
        "enhance_contrast": True
    }
}

# Interface
class OCRService:
    async def extract_text(self, image_path: str) -> OCRResult:
        """Extract text from image."""
        pass

@dataclass
class OCRResult:
    text: str
    confidence: float
    regions: List[TextRegion]
```

#### 8.1.4 STT Service Integration

```python
# Configuration
STT_CONFIG = {
    "model": "base",  # tiny, base, small, medium, large
    "device": "cpu",
    "language": None,  # Auto-detect
    "task": "transcribe"
}

# Interface
class STTService:
    async def transcribe(self, audio_path: str) -> TranscriptResult:
        """Transcribe audio to text."""
        pass

@dataclass
class TranscriptResult:
    text: str
    segments: List[Segment]
    language: str
    confidence: float
```

### 8.2 Internal Service Communication

```
┌──────────────────────────────────────────────────────────────────┐
│                  INTERNAL COMMUNICATION                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   Synchronous (HTTP/REST):                                       │
│   ┌──────────┐        ┌──────────┐        ┌──────────┐          │
│   │ Frontend │◄──────►│   API    │◄──────►│ Services │          │
│   └──────────┘  REST  └──────────┘  Direct└──────────┘          │
│                                                                   │
│   Asynchronous (Message Queue):                                  │
│   ┌──────────┐        ┌──────────┐        ┌──────────┐          │
│   │   API    │───────►│  Redis   │───────►│ Workers  │          │
│   └──────────┘ Publish└──────────┘ Consume└──────────┘          │
│                                                                   │
│   Real-time (WebSocket):                                         │
│   ┌──────────┐        ┌──────────┐                              │
│   │ Frontend │◄══════►│   API    │                              │
│   └──────────┘  WS    └──────────┘                              │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 9. Security Specifications

### 9.1 Authentication Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   Login Flow:                                                    │
│   ┌────────┐  1. Credentials  ┌────────┐  2. Validate  ┌──────┐ │
│   │ Client │─────────────────►│  API   │──────────────►│  DB  │ │
│   └────────┘                  └────────┘               └──────┘ │
│       ▲                           │                        │     │
│       │     4. JWT Tokens         │    3. User Data       │     │
│       └───────────────────────────┤◄───────────────────────┘     │
│                                   │                              │
│                                   ▼                              │
│                            ┌───────────┐                        │
│                            │  Redis    │                        │
│                            │ (Session) │                        │
│                            └───────────┘                        │
│                                                                   │
│   Request Flow:                                                  │
│   ┌────────┐  1. Request + JWT  ┌────────┐                      │
│   │ Client │───────────────────►│  API   │                      │
│   └────────┘                    └────────┘                      │
│       ▲                             │                            │
│       │                    2. Verify JWT                        │
│       │                             │                            │
│       │                             ▼                            │
│       │                     ┌─────────────┐                     │
│       │                     │ Middleware  │                     │
│       │                     │ • Decode    │                     │
│       │                     │ • Validate  │                     │
│       │                     │ • Check Exp │                     │
│       │                     └─────────────┘                     │
│       │                             │                            │
│       │    3. Response              │ If valid                  │
│       └─────────────────────────────┘                           │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 9.2 JWT Token Structure

```python
# Access Token Payload
{
    "sub": "user_id",          # Subject (user ID)
    "exp": 1705500000,         # Expiration (15 min)
    "iat": 1705499100,         # Issued at
    "type": "access",          # Token type
    "jti": "unique_token_id"   # JWT ID (for revocation)
}

# Refresh Token Payload
{
    "sub": "user_id",
    "exp": 1706104800,         # Expiration (7 days)
    "iat": 1705500000,
    "type": "refresh",
    "jti": "unique_token_id"
}
```

### 9.3 Authorization Rules

```python
# Role-Based Access Control
ROLES = {
    "user": ["read:own", "write:own", "delete:own"],
    "admin": ["read:all", "write:all", "delete:all", "manage:users"]
}

# Resource-Level Permissions
def check_content_access(user_id: int, content_id: int) -> bool:
    """User can only access their own content."""
    content = get_content(content_id)
    return content.user_id == user_id

# API Endpoint Protection
@router.get("/content/{id}")
@require_auth  # Checks valid JWT
@require_owner  # Checks resource ownership
async def get_content(id: int, current_user: User):
    ...
```

### 9.4 Input Validation Rules

```python
# Pydantic Validation Examples
class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50, regex="^[a-zA-Z0-9_]+$")
    password: str = Field(..., min_length=8)
    full_name: str = Field(None, max_length=100)
    
    @validator('password')
    def password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError('Must contain uppercase')
        if not any(c.isdigit() for c in v):
            raise ValueError('Must contain digit')
        return v

class ContentCreate(BaseModel):
    title: str = Field(..., max_length=500)
    tags: List[str] = Field(default=[], max_items=20)
    subject: Optional[str] = Field(None, max_length=255)
    
    @validator('tags')
    def validate_tags(cls, v):
        return [tag.strip().lower()[:50] for tag in v if tag.strip()]
```

### 9.5 Rate Limiting Configuration

```python
RATE_LIMITS = {
    "default": {
        "requests": 100,
        "window": 60  # seconds
    },
    "auth/login": {
        "requests": 5,
        "window": 60
    },
    "content/upload": {
        "requests": 10,
        "window": 60
    },
    "assistant/query": {
        "requests": 30,
        "window": 60
    }
}
```

### 9.6 CORS Configuration

```python
CORS_CONFIG = {
    "allow_origins": [
        "http://localhost:3000",
        "https://app.b2brain.com"
    ],
    "allow_methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    "allow_headers": ["Authorization", "Content-Type"],
    "allow_credentials": True,
    "max_age": 600
}
```

---

## 10. Deployment Specifications

### 10.1 Environment Configuration

```bash
# .env Template

# Application
APP_NAME=B2SecondBrain
APP_ENV=production  # development, staging, production
DEBUG=false
SECRET_KEY=<random-256-bit-key>

# Server
HOST=0.0.0.0
PORT=8000

# Database - PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=b2_user
POSTGRES_PASSWORD=<secure-password>
POSTGRES_DB=b2_db

# Database - MongoDB
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DB=b2_mongo

# Database - Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# AI Services
GOOGLE_API_KEY=<api-key>
OPENAI_API_KEY=<api-key>

# Processing
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
WHISPER_MODEL=base
WHISPER_DEVICE=cpu

# Storage
UPLOAD_DIR=/app/storage/uploads
MAX_UPLOAD_SIZE=52428800  # 50MB

# Security
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=https://app.b2brain.com
```

### 10.2 Docker Configuration

```dockerfile
# Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libpq-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Run
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - POSTGRES_HOST=postgres
      - MONGO_HOST=mongo
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - mongo
      - redis
    volumes:
      - ./storage:/app/storage
  
  worker:
    build: ./backend
    command: celery -A app.worker worker -l info
    environment:
      - POSTGRES_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - redis
      - postgres
  
  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - api
  
  postgres:
    image: postgres:14
    environment:
      POSTGRES_USER: b2_user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: b2_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  mongo:
    image: mongo:6
    volumes:
      - mongo_data:/data/db
  
  redis:
    image: redis:7
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  mongo_data:
  redis_data:
```

### 10.3 Resource Requirements

| Component | CPU | Memory | Storage | Replicas |
|-----------|-----|--------|---------|----------|
| API Server | 2 cores | 4 GB | 10 GB | 2-4 |
| Worker (CPU) | 4 cores | 8 GB | 10 GB | 2-4 |
| Worker (GPU) | 4 cores | 16 GB + GPU | 20 GB | 1-2 |
| PostgreSQL | 4 cores | 8 GB | 100 GB | 1 (+ replica) |
| MongoDB | 2 cores | 4 GB | 100 GB | 1 |
| Redis | 1 core | 2 GB | 10 GB | 1 |
| Vector DB | 4 cores | 8 GB | 50 GB | 1 |

### 10.4 Scaling Configuration

```yaml
# Kubernetes HPA Example
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

---

## 11. Testing Specifications

### 11.1 Testing Strategy

| Test Type | Coverage Target | Tools | Execution |
|-----------|-----------------|-------|-----------|
| Unit Tests | 80% | pytest | Every commit |
| Integration Tests | 60% | pytest + testcontainers | Every PR |
| E2E Tests | Critical paths | Playwright | Nightly |
| Performance Tests | Key endpoints | Locust | Weekly |
| Security Tests | OWASP Top 10 | OWASP ZAP | Monthly |

### 11.2 Test Categories

#### Unit Tests

```python
# Example: AI Service Unit Test
import pytest
from unittest.mock import Mock, patch

class TestAIService:
    @pytest.fixture
    def ai_service(self):
        return AIService()
    
    @patch('app.services.ai_service.ChatGoogleGenerativeAI')
    async def test_generate_summary(self, mock_llm, ai_service):
        mock_llm.return_value.ainvoke.return_value = {
            "text": "SUMMARY: This is a test summary."
        }
        
        result = await ai_service.process_content("Test content")
        
        assert "summary" in result
        assert len(result["summary"]) > 0
    
    def test_chunk_text_short(self, ai_service):
        text = "Short text"
        chunks = ai_service._chunk_text(text, 1000, 200)
        
        assert len(chunks) == 1
        assert chunks[0] == text
    
    def test_chunk_text_long(self, ai_service):
        text = "a" * 2500
        chunks = ai_service._chunk_text(text, 1000, 200)
        
        assert len(chunks) == 3
        assert len(chunks[0]) == 1000
```

#### Integration Tests

```python
# Example: Content API Integration Test
import pytest
from httpx import AsyncClient
from app.main import app

class TestContentAPI:
    @pytest.fixture
    async def client(self):
        async with AsyncClient(app=app, base_url="http://test") as client:
            yield client
    
    @pytest.fixture
    async def auth_headers(self, client):
        response = await client.post("/api/v1/auth/login", data={
            "username": "testuser",
            "password": "testpass"
        })
        token = response.json()["data"]["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    async def test_create_text_content(self, client, auth_headers):
        response = await client.post(
            "/api/v1/content/text",
            json={
                "title": "Test Note",
                "text_content": "This is test content",
                "tags": ["test"]
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert response.json()["data"]["title"] == "Test Note"
    
    async def test_list_content(self, client, auth_headers):
        response = await client.get(
            "/api/v1/content",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert "data" in response.json()
        assert "pagination" in response.json()
```

#### E2E Tests

```javascript
// Example: Playwright E2E Test
import { test, expect } from '@playwright/test';

test.describe('Content Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="username"]', 'testuser');
    await page.fill('[name="password"]', 'testpass');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should upload and process a text note', async ({ page }) => {
    await page.goto('/capture');
    
    await page.fill('[name="title"]', 'Test Note');
    await page.fill('[name="content"]', 'This is test content for E2E');
    await page.click('button:has-text("Save")');
    
    await expect(page.locator('.success-message')).toBeVisible();
    
    await page.goto('/library');
    await expect(page.locator('text=Test Note')).toBeVisible();
  });
});
```

### 11.3 Test Data Management

```python
# Test Fixtures
@pytest.fixture
def sample_user():
    return {
        "email": "test@example.com",
        "username": "testuser",
        "password": "TestPass123!",
        "full_name": "Test User"
    }

@pytest.fixture
def sample_content():
    return {
        "title": "Sample Document",
        "content_type": "text",
        "text_content": "This is sample content for testing purposes.",
        "tags": ["test", "sample"],
        "subject": "Testing"
    }

@pytest.fixture
def sample_flashcard():
    return {
        "question": "What is unit testing?",
        "answer": "Testing individual components in isolation.",
        "subject": "Software Engineering"
    }
```

---

## 12. Monitoring & Observability

### 12.1 Logging Specification

```python
# Logging Configuration
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "class": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "format": "%(timestamp)s %(level)s %(name)s %(message)s"
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
            "stream": "ext://sys.stdout"
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "formatter": "json",
            "filename": "/var/log/app/app.log",
            "maxBytes": 10485760,
            "backupCount": 5
        }
    },
    "root": {
        "level": "INFO",
        "handlers": ["console", "file"]
    }
}

# Log Entry Structure
{
    "timestamp": "2026-01-17T10:30:00.000Z",
    "level": "INFO",
    "logger": "app.api.content",
    "message": "Content uploaded successfully",
    "request_id": "req_abc123",
    "user_id": 123,
    "content_id": 456,
    "duration_ms": 150
}
```

### 12.2 Metrics Specification

```python
# Prometheus Metrics
from prometheus_client import Counter, Histogram, Gauge

# Request metrics
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

http_request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.5, 1, 5, 10]
)

# Business metrics
content_uploads_total = Counter(
    'content_uploads_total',
    'Total content uploads',
    ['content_type', 'status']
)

rag_queries_total = Counter(
    'rag_queries_total',
    'Total RAG queries',
    ['status']
)

rag_query_duration = Histogram(
    'rag_query_duration_seconds',
    'RAG query duration',
    buckets=[0.5, 1, 2, 5, 10, 30]
)

# System metrics
active_users = Gauge(
    'active_users',
    'Currently active users'
)

processing_queue_size = Gauge(
    'processing_queue_size',
    'Items in processing queue',
    ['queue_name']
)
```

### 12.3 Health Check Endpoints

```python
@router.get("/health")
async def health_check():
    """Basic health check."""
    return {"status": "healthy"}

@router.get("/health/ready")
async def readiness_check(db: Session = Depends(get_db)):
    """Readiness check - verifies dependencies."""
    checks = {
        "database": await check_database(db),
        "redis": await check_redis(),
        "mongodb": await check_mongodb()
    }
    
    all_healthy = all(checks.values())
    
    return {
        "status": "ready" if all_healthy else "not_ready",
        "checks": checks
    }

@router.get("/health/live")
async def liveness_check():
    """Liveness check - basic process health."""
    return {"status": "alive", "timestamp": datetime.utcnow()}
```

### 12.4 Alerting Rules

```yaml
# Prometheus Alerting Rules
groups:
  - name: b2_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected
          
      - alert: SlowRAGQueries
        expr: histogram_quantile(0.95, rate(rag_query_duration_seconds_bucket[5m])) > 10
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: RAG queries are slow
          
      - alert: ProcessingQueueBacklog
        expr: processing_queue_size > 100
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: Processing queue backlog detected
          
      - alert: DatabaseConnectionHigh
        expr: pg_stat_activity_count > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: Database connection count high
```

### 12.5 Dashboard Panels

| Dashboard | Panels |
|-----------|--------|
| **Overview** | Request rate, Error rate, Latency P50/P95/P99, Active users |
| **API** | Requests by endpoint, Latency by endpoint, Error breakdown |
| **RAG** | Query rate, Query latency, Source count distribution |
| **Processing** | Queue size, Processing time, Success/failure rate |
| **Database** | Connection count, Query latency, Cache hit rate |
| **Infrastructure** | CPU usage, Memory usage, Disk usage, Network I/O |

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Content** | Any piece of information stored in the system (text, file, etc.) |
| **Chunk** | A segment of content used for embedding and retrieval |
| **Embedding** | Vector representation of text for similarity search |
| **RAG** | Retrieval-Augmented Generation - LLM enhanced with search |
| **SRS** | Spaced Repetition System - learning technique |
| **SM-2** | SuperMemo 2 algorithm for spaced repetition |
| **OCR** | Optical Character Recognition - text from images |
| **STT** | Speech-to-Text - audio transcription |

## Appendix B: Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-17 | System | Initial specification |

---

*End of System Specification Document*
