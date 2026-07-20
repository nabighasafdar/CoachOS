export type MealSlot =
  | 'breakfast'
  | 'brunch'
  | 'lunch'
  | 'snack'
  | 'dinner'
  | 'late_snack';

export type MealSlotInfo = {
  slot: MealSlot;
  label: string;
  window: string;
};

/** All meal categories the user can assign a scan to. */
export const MEAL_OPTIONS: MealSlotInfo[] = [
  { slot: 'breakfast', label: 'Breakfast', window: '5:00 – 10:00' },
  { slot: 'brunch', label: 'Brunch', window: '10:00 – 12:00' },
  { slot: 'lunch', label: 'Lunch', window: '12:00 – 15:00' },
  { slot: 'dinner', label: 'Dinner', window: '17:00 – 21:00' },
  { slot: 'snack', label: 'Snacks', window: '15:00 – 17:00' },
  { slot: 'late_snack', label: 'Midnight Snacks', window: '21:00 – 5:00' },
];

/** Classify the current meal from local clock time. */
export function getMealSlotForDate(date = new Date()): MealSlotInfo {
  const minutes = date.getHours() * 60 + date.getMinutes();

  if (minutes >= 8 * 60 && minutes < 10 * 60) {
    return MEAL_OPTIONS[0];
  }
  if (minutes >= 10 * 60 && minutes < 12 * 60) {
    return MEAL_OPTIONS[1];
  }
  if (minutes >= 12 * 60 && minutes < 15 * 60) {
    return MEAL_OPTIONS[2];
  }
  if (minutes >= 15 * 60 && minutes < 17 * 60) {
    return MEAL_OPTIONS[4];
  }
  if (minutes >= 17 * 60 && minutes < 21 * 60) {
    return MEAL_OPTIONS[3];
  }
  if (minutes >= 5 * 60 && minutes < 8 * 60) {
    return MEAL_OPTIONS[0];
  }
  return MEAL_OPTIONS[5];
}

export function greetingForHour(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
