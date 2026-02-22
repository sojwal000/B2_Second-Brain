# B2 Second Brain Diagrams

## Class Diagram

```plantuml
@startuml
class User {
  +id: int
  +email: string
  +password: string
  +created_at: datetime
  +updated_at: datetime
}

class Content {
  +id: int
  +user_id: int
  +title: string
  +content_type: string
  +text_content: string
  +summary: string
  +file_path: string
  +tags: list
  +subjects: list
  +is_favorite: bool
  +is_pinned: bool
  +is_archived: bool
  +embeddings: vector
}

class Deck {
  +id: int
  +user_id: int
  +name: string
  +description: string
  +subject: string
  +card_count: int
}

class Flashcard {
  +id: int
  +deck_id: int
  +question: string
  +answer: string
  +explanation: string
  +difficulty: int
  +stability: float
  +retrievability: float
  +mastery_level: string
  +next_review: datetime
  +last_review: datetime
}

class Task {
  +id: int
  +user_id: int
  +title: string
  +description: string
  +status: string
  +priority: string
  +due_date: datetime
  +project: string
  +tags: list
  +completed_at: datetime
}

User "1" -- "*" Content
User "1" -- "*" Deck
Deck "1" -- "*" Flashcard
User "1" -- "*" Task
@enduml
```

## Use Case Diagram

```plantuml
@startuml
actor "User" as User

User --> (Register/Login)
User --> (Upload Content)
User --> (Organize Content)
User --> (AI Summarization)
User --> (Generate Flashcards)
User --> (Review Flashcards)
User --> (Extract Tasks)
User --> (Manage Tasks)
User --> (Semantic Search)
User --> (Text-to-Speech)
User --> (Speech-to-Text)
User --> (View Dashboard)
User --> (Update Profile)
User --> (Pin/Archive Content)
User --> (Favorite Content)
User --> (Tag Content)
User --> (Study Flashcards)
User --> (Submit Task Review)
@enduml
```

## Activity Diagram

```plantuml
@startuml
start
:User logs in;
if (Valid credentials?) then (yes)
  :Show dashboard;
  :Upload content;
  :AI processes content;
  :Summarize and embed content;
  :Generate flashcards;
  :Extract tasks;
  :User reviews flashcards;
  :User manages tasks;
  :User performs semantic search;
else (no)
  :Show error message;
endif
stop
@enduml
```

## DFD Level 0

```plantuml
@startuml
rectangle "User" as User
rectangle "B2 Second Brain" as System
User --> System : Upload Content
User --> System : Submit Task
User --> System : Request Flashcard Generation
User --> System : Query Knowledge Base
System --> User : Summaries/Flashcards/Tasks/Search Results
@enduml
```

## DFD Level 1

```plantuml
@startuml
rectangle "User" as User
rectangle "Content Processor" as CP
rectangle "Flashcard Engine" as FE
rectangle "Task Engine" as TE
rectangle "Semantic Search" as SS
rectangle "Database" as DB

User --> CP : Upload Content
CP --> FE : Generate Flashcards
CP --> TE : Extract Tasks
CP --> SS : Embed Content
FE --> DB : Store Flashcards
TE --> DB : Store Tasks
CP --> DB : Store Content
SS --> DB : Query Embeddings
DB --> User : Summaries/Flashcards/Tasks/Search Results
@enduml
```

## DFD Level 2

```plantuml
@startuml
rectangle "User" as User
rectangle "Upload Module" as UM
rectangle "Validation Module" as VM
rectangle "AI Summarization" as AIS
rectangle "Embedding Module" as EM
rectangle "Flashcard Generator" as FG
rectangle "Task Extractor" as TE
rectangle "Semantic Search" as SS
rectangle "Database" as DB

User --> UM : Upload Content
UM --> VM : Validate Content
VM --> AIS : Summarize Content
AIS --> EM : Generate Embeddings
EM --> FG : Generate Flashcards
EM --> TE : Extract Tasks
FG --> DB : Save Flashcards
TE --> DB : Save Tasks
EM --> DB : Save Embeddings
AIS --> DB : Save Summaries
SS --> DB : Query Embeddings
DB --> User : Provide Results
@enduml
```

## Conclusion

The diagrams presented in this section provide a comprehensive visual representation of the B2 Second Brain system. The class diagram outlines the core data structures and their relationships, while the use case and activity diagrams illustrate user interactions and system workflows. The DFDs (Levels 0, 1, and 2) break down the flow of data and processing within the platform, from high-level user actions to detailed internal modules. Together, these diagrams clarify the architecture, functionality, and data management strategies of B2 Second Brain, serving as valuable references for both development and documentation.
```
