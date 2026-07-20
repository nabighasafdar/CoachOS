export type SessionStatus = 'planned' | 'done' | 'skipped' | 'moved';
export type AgentName = 'planner' | 'recovery' | 'nutrition' | 'adaptation' | 'accountability';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type UserProfile = {
  user_id: string;
  display_name: string;
  email: string;
  goals: string[];
  equipment: string[];
  injuries: string[];
  available_days: string[];
  experience_level: ExperienceLevel;
  onboarding_complete: boolean;
  push_token?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  daily_calorie_target?: number;
};

export type WorkoutSession = {
  id: string;
  day: string;
  title: string;
  focus: string;
  exercises: string[];
  duration_min: number;
  status: SessionStatus;
  notes: string;
};

export type WeeklyPlan = {
  user_id: string;
  week_start: string;
  sessions: WorkoutSession[];
  version: number;
  updated_at: string;
};

export type DailySignals = {
  user_id: string;
  date: string;
  sleep: number;
  energy: number;
  soreness: number;
  injury_flag: boolean;
  injury_note: string;
  weather_summary: string;
  precip_mm: number;
};

export type MealLog = {
  id: string;
  description: string;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  source: 'text' | 'photo' | 'barcode';
  meal_slot?: string | null;
  meal_label?: string | null;
  logged_at: string;
};

export type NutritionState = {
  user_id: string;
  date: string;
  calorie_target: number;
  pantry: string[];
  meals: MealLog[];
  suggestions: string[];
};

export type DecisionLogEntry = {
  id: string;
  user_id: string;
  agent: AgentName;
  action: string;
  reason: string;
  inputs: Record<string, unknown>;
  timestamp: string;
};
