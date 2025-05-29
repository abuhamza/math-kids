# System Patterns - Math Kids Web Application

## Architecture Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Presentation  │    │   Application   │    │   Data Layer    │
│   Layer (UI)    │◄──►│   Logic Layer   │◄──►│ (LocalStorage)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
   ┌────▼────┐             ┌────▼────┐             ┌────▼────┐
   │ Pages   │             │ Game    │             │Progress │
   │Language │             │Question │             │Settings │
   │Settings │             │Feedback │             │Scores   │
   └─────────┘             └─────────┘             └─────────┘
```

## Key Design Patterns

### 1. State Management Pattern
- **Central State**: Single source of truth for app state
- **Local Storage Sync**: Automatic persistence of progress
- **State Updates**: Immutable updates with clear data flow

### 2. Component Structure
```
App
├── LanguageSelector
├── OperationSelector  
├── DifficultySelector
├── GameArea
│   ├── QuestionDisplay
│   ├── AnswerInput
│   └── FeedbackDisplay
├── ProgressDashboard
│   ├── ScoreDisplay
│   ├── BadgeCollection
│   └── StatisticsView
└── SettingsPanel
```

### 3. Question Generation Pattern
- **Factory Pattern**: Different generators for each operation type
- **Difficulty Strategy**: Configurable number ranges per level
- **Uniqueness**: Avoid duplicate questions in same session

### 4. Feedback System Pattern
- **Immediate Response**: Visual/audio feedback on answer submission
- **Progressive Hints**: Gentle guidance for incorrect answers
- **Celebration**: Animated rewards for correct answers and milestones

### 5. Accessibility Pattern
- **Semantic HTML**: Proper heading hierarchy and landmarks
- **ARIA Labels**: Screen reader friendly descriptions
- **Keyboard Navigation**: Full tab-based navigation
- **Focus Management**: Clear focus indicators and logical flow

## Data Models

### User Progress
```javascript
{
  currentLevel: 'easy|intermediate|advanced',
  currentOperation: 'addition|subtraction|multiplication|division',
  scores: {
    addition: { easy: [], intermediate: [], advanced: [] },
    // ... other operations
  },
  badges: ['first_correct', 'streak_5', 'level_complete'],
  settings: {
    language: 'en|fr|de',
    audioEnabled: true,
    animationsEnabled: true
  },
  statistics: {
    totalQuestions: 0,
    totalCorrect: 0,
    timeSpent: 0,
    sessionsCompleted: 0
  }
}
```

### Question Model
```javascript
{
  id: 'unique_id',
  operation: 'addition',
  operand1: 5,
  operand2: 3,
  correctAnswer: 8,
  difficulty: 'easy',
  timestamp: Date.now()
}
```

## Technical Decisions

### Frontend Framework
- **Vanilla JavaScript**: Lightweight, no dependencies
- **Tailwind CSS**: Utility-first styling for rapid development
- **Web APIs**: Local Storage, Audio API, Intersection Observer

### Module Organization
- **ES6 Modules**: Clean separation of concerns
- **Service Layer**: GameService, ProgressService, LocalStorageService
- **Utility Functions**: Language helpers, accessibility helpers

### Performance Considerations
- **Lazy Loading**: Load language assets on demand
- **Debounced Updates**: Prevent excessive local storage writes
- **Optimized Animations**: CSS transforms over layout changes 