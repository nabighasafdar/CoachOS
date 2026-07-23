import { api } from '../lib/api';
import type {
  DailySignals,
  DecisionLogEntry,
  IdentifiedFoodItem,
  NutritionState,
  SessionStatus,
  UserProfile,
  WeeklyPlan,
} from '../types/agent';

export async function healthCheck() {
  const { data } = await api.get('/health');
  return data as { ok: boolean };
}

export async function upsertProfile(profile: UserProfile) {
  const { data } = await api.post('/profile', { profile });
  return data.profile as UserProfile;
}

export async function fetchProfile(userId: string) {
  const { data } = await api.get(`/profile/${userId}`);
  return data.profile as UserProfile;
}

export async function generatePlan(userId: string, profile?: UserProfile, force = false) {
  const { data } = await api.post('/plan', { user_id: userId, profile, force });
  return data.plan as WeeklyPlan;
}

export async function fetchPlan(userId: string) {
  const { data } = await api.get(`/plan/${userId}`);
  return data.plan as WeeklyPlan;
}

export async function adaptPlan(
  userId: string,
  trigger: string,
  signals?: DailySignals,
  skippedSessionId?: string,
) {
  const { data } = await api.post('/adapt', {
    user_id: userId,
    trigger,
    signals,
    skipped_session_id: skippedSessionId,
  });
  return data as {
    plan: WeeklyPlan;
    decision: DecisionLogEntry;
    proposals: Record<string, unknown>;
    signals: DailySignals;
  };
}

export async function logWorkout(userId: string, sessionId: string, status: SessionStatus, notes = '') {
  const { data } = await api.post('/log/workout', {
    user_id: userId,
    session_id: sessionId,
    status,
    notes,
  });
  return data as { plan: WeeklyPlan; adaptation: unknown };
}

export async function logCheckIn(userId: string, signals: DailySignals) {
  const { data } = await api.post('/log/checkin', { user_id: userId, signals });
  return data as { signals: DailySignals; adaptation: unknown };
}

export async function logMeal(
  userId: string,
  description: string,
  pantry: string[] = [],
  photoBase64?: string | null,
  mealSlot?: string | null,
  mealLabel?: string | null,
) {
  const { data } = await api.post('/log/meal', {
    user_id: userId,
    description,
    pantry,
    photo_base64: photoBase64 || undefined,
    meal_slot: mealSlot || undefined,
    meal_label: mealLabel || undefined,
  });
  return data as {
    meal: {
      description?: string;
      calories?: number;
      protein_g?: number;
      carbs_g?: number;
      fat_g?: number;
      source?: string;
      meal_slot?: string;
      meal_label?: string;
    };
    nutrition_state: NutritionState;
    reason: string;
    identify?: {
      food_name?: string;
      portion?: string;
      confidence?: number;
      query?: string;
      items?: IdentifiedFoodItem[];
    };
    identified_items?: IdentifiedFoodItem[];
    daily_totals?: {
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
      meal_count: number;
    };
    macros?: {
      calories?: number;
      protein_g?: number;
      carbs_g?: number;
      fat_g?: number;
    };
    remaining_kcal?: number;
    meal_slot?: string;
    meal_label?: string;
  };
}

export async function fetchNutrition(userId: string) {
  const { data } = await api.get(`/nutrition/${userId}`);
  return data.nutrition as NutritionState | null;
}

export async function setCalorieTarget(userId: string, calorieTarget: number) {
  const { data } = await api.post('/nutrition/target', {
    user_id: userId,
    calorie_target: calorieTarget,
  });
  return data as {
    profile: UserProfile;
    nutrition: NutritionState;
  };
}

export async function fetchActivity(userId: string) {
  const { data } = await api.get(`/activity/${userId}`);
  return data.decisions as DecisionLogEntry[];
}

export async function runAccountability(userId: string, secret = 'coachos-dev-secret') {
  const { data } = await api.post('/accountability/run', { user_id: userId, secret });
  return data.nudges as Array<{ message: string; action: string }>;
}

export async function seedDemo() {
  const { data } = await api.post('/demo/seed');
  return data as { profile: UserProfile; plan: WeeklyPlan; hint: string };
}
