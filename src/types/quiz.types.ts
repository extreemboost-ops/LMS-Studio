export interface AnswerOption {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback?: string;
}

export interface Question {
  id: number;
  title: string;
  type: "Multiple choice" | "True / False" | "Image hotspots" | "Drag and Drop" | "Fill in the Blanks";
  points: number;
  explanation?: string;
  correctFeedback?: string;
  options: AnswerOption[];
}

export interface QuizSettings {
  points: number;
  partialScoring: boolean;
  allowRetry: boolean;
  maxAttempts: string;
  showSolution: boolean;
  randomizeAnswers: boolean;
  requireAnswer: boolean;
  showFeedbackInstantly: boolean;
}
