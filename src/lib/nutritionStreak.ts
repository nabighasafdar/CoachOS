import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, subDays, parseISO, isValid } from 'date-fns';

const STREAK_KEY = 'coachos.mealLogDates';

function todayKey(d = new Date()) {
  return format(d, 'yyyy-MM-dd');
}

export async function getMealLogDates(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(STREAK_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.filter((d) => isValid(parseISO(d))) : [];
  } catch {
    return [];
  }
}

export async function recordMealLogged(date = new Date()): Promise<{ streak: number; dates: string[] }> {
  const key = todayKey(date);
  const existing = await getMealLogDates();
  const dates = existing.includes(key) ? existing : [...existing, key].sort();
  await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(dates));
  return { streak: computeStreak(dates, date), dates };
}

export async function getCurrentStreak(date = new Date()): Promise<number> {
  const dates = await getMealLogDates();
  return computeStreak(dates, date);
}

/** Consecutive days ending today (or yesterday if today not logged yet). */
export function computeStreak(dates: string[], now = new Date()): number {
  const set = new Set(dates);
  let cursor = todayKey(now);
  if (!set.has(cursor)) {
    cursor = todayKey(subDays(now, 1));
    if (!set.has(cursor)) return 0;
  }
  let streak = 0;
  let day = parseISO(cursor);
  while (set.has(todayKey(day))) {
    streak += 1;
    day = subDays(day, 1);
  }
  return streak;
}

export function weekStrip(now = new Date()) {
  const startOffset = now.getDay(); // 0 Sun
  // Show Mon–Sun of current week
  const mondayOffset = (startOffset + 6) % 7;
  const monday = subDays(now, mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      date: d,
      key: todayKey(d),
      label: format(d, 'EEE').slice(0, 3),
      dayNum: format(d, 'd'),
      isToday: todayKey(d) === todayKey(now),
    };
  });
}
