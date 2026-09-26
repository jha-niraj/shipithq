// New Studios Module Types
// Clean, step-based architecture for AI-powered learning

// Match Prisma enum values exactly (uppercase)
export type StudioSource = "MANUAL" | "PATHFINDER" | "SPACE";

export type StudioStepType =
  | "EXPLANATION"
  | "NOTE"
  | "QUIZ"
  | "CODE"
  | "IMAGE"
  | "VIDEO"
  | "DOCUMENT"
  | "PROJECT"
  | "MOCK_INTERVIEW"
  | "FLASHCARD";

export type StudioStepStatus = "DRAFT" | "COMPLETED" | "ARCHIVED";

export type ContentSource = "AI" | "USER";

export type ProjectType = "minor" | "major";

export type Difficulty = "beginner" | "intermediate" | "advanced";

// Main Studio interface
export interface Studio {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  emoji?: string | null;
  coverImage?: string | null;
  source: StudioSource;
  sourceId?: string | null; // pathfinder_goal_id or space_id
  stepCount: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  lastEditedAt: Date | null;
}

// Studio Step - the core content unit
export interface StudioStep {
  id: string;
  studioId: string;
  orderNumber: number;
  type: StudioStepType;
  content?: string | null; // For explanation, note types
  metadata: unknown;
  source: ContentSource;
  status: StudioStepStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Step metadata types for each content type
export interface ExplanationMetadata {
  prompt: string;
  model: string;
  tokensUsed?: number;
}

export interface NoteMetadata {
  editorType: "rich" | "markdown";
}

export interface QuizMetadata {
  quizId: string;
  topic: string;
  difficulty: Difficulty;
  questionCount: number;
  generatedFrom?: string;
}

export interface CodeMetadata {
  codeBlockId: string;
  language: string;
  isPractice: boolean;
  problemTitle?: string;
}

export interface ImageMetadata {
  mediaId: string;
  source: "ai" | "upload";
  prompt?: string;
  url: string;
  width?: number;
  height?: number;
}

export interface VideoMetadata {
  mediaId: string;
  source: "youtube" | "vimeo" | "xai";
  url: string;
  title: string;
  duration?: number;
  generatedBy?: "xai" | "user";
}

export interface DocumentMetadata {
  title: string;
  url: string;
  description?: string;
  source: "xai" | "user";
  docType: "article" | "documentation" | "tutorial";
}

export interface ProjectMetadata {
  suggestions: ProjectSuggestion[];
  generatedFrom: string;
}

export interface MockInterviewMetadata {
  sessionId: string;
  topic: string;
  difficulty: Difficulty;
  durationMinutes: number;
  agentId: string;
}

export interface FlashcardMetadata {
  deckId: string;
  topic: string;
  cardCount: number;
}

// Project Suggestion
export interface ProjectSuggestion {
  id: string;
  stepId: string;
  projectType: ProjectType;
  title: string;
  description: string;
  difficulty: Difficulty;
  estimatedHours: number;
  techStack: string[];
  features: string[];
  createdProjectId?: string;
  addedToPortfolio: boolean;
}

// Mock Interview Session
export interface MockSession {
  id: string;
  stepId: string;
  topic: string;
  transcript?: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
  }>;
  durationSeconds?: number;
  aiFeedback?: string;
  score?: number;
  status: "pending" | "in_progress" | "completed";
  startedAt?: Date;
  completedAt?: Date;
}

// Content type selector option
export interface ContentTypeOption {
  type: StudioStepType;
  label: string;
  description: string;
  icon: string;
  category: "basic" | "interactive" | "ai" | "resource";
  comingSoon?: boolean;
}

// AI Generation request
export interface GenerateContentRequest {
  studioId: string;
  type: StudioStepType;
  prompt: string;
  options?: Record<string, unknown>;
}

// Studio with steps (for viewer)
export interface StudioWithSteps extends Studio {
  steps: StudioStep[];
}

// Save step request
export interface SaveStepRequest {
  studioId: string;
  stepId?: string; // undefined for new step
  type: StudioStepType;
  content?: string;
  metadata: Record<string, unknown>;
  source: ContentSource;
}

// Studio list item (for overview page)
export interface StudioListItem {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  emoji?: string;
  source: StudioSource;
  sourceId?: string;
  stepCount: number;
  lastEditedAt: Date | null;
  createdAt: Date;
}
