export interface Time {
  hour: number;
  minute: number;
}

export type AppMode = 'exploration' | 'quiz' | 'admin';

export interface QuizQuestion {
  targetHours: number;
  targetMinutes: number;
  level: number;
}
