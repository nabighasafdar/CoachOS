import {
  addDays,
  addWeeks,
  format,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MEAL_OPTIONS, type MealSlot } from '../lib/mealTime';
import { getMealLogDates } from '../lib/nutritionStreak';
import { fetchNutrition } from '../services/coachApi';
import { useAppStore } from '../store/appStore';
import type { MealLog, NutritionState } from '../types/agent';
import type { NutritionStackParamList } from '../navigation/nutritionTypes';

type Props = NativeStackScreenProps<NutritionStackParamList, 'Dashboard'>;

const MEAL_TABS: {
  key: MealSlot;
  label: string;
  share: number;
}[] = [
  { key: 'breakfast', label: 'Breakfast', share: 0.2 },
  { key: 'brunch', label: 'Brunch', share: 0.15 },
  { key: 'lunch', label: 'Lunch', share: 0.25 },
  { key: 'dinner', label: 'Dinner', share: 0.25 },
  { key: 'snack', label: 'Snacks', share: 0.08 },
  { key: 'late_snack', label: 'Midnight Snacks', share: 0.07 },
];

const ITEM_COLORS = ['#E85D5D', '#4C8DFF', '#3DDC97', '#F0C14A', '#C084FC', '#FF7B72'];

function todayKey(d = new Date()) {
  return format(d, 'yyyy-MM-dd');
}

function tabForMeal(meal: MealLog): MealSlot {
  const slot = (meal.meal_slot || '').toLowerCase() as MealSlot;
  if (MEAL_TABS.some((t) => t.key === slot)) return slot;

  const label = (meal.meal_label || '').toLowerCase();
  const byLabel = MEAL_OPTIONS.find((o) =>
    label.includes(o.label.toLowerCase().split(' ')[0]),
  );
  if (byLabel) return byLabel.slot;

  if (meal.logged_at) {
    const hour = new Date(meal.logged_at).getHours();
    if (hour < 10) return 'breakfast';
    if (hour < 12) return 'brunch';
    if (hour < 15) return 'lunch';
    if (hour < 17) return 'snack';
    if (hour < 21) return 'dinner';
    return 'late_snack';
  }
  return 'breakfast';
}

function shortFoodName(description: string) {
  const cleaned = description
    .replace(/^1\s+(plate|serving|bowl|large|small)\s+/i, '')
    .trim();
  const words = cleaned.split(/\s+/).slice(0, 3);
  return words.join(' ') || 'Food';
}

function weekDays(anchor: Date) {
  const start = startOfWeek(anchor, { weekStartsOn: 0 });
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    return {
      date: d,
      key: todayKey(d),
      label: format(d, 'EEE'),
      dayNum: format(d, 'd'),
    };
  });
}

export function NutritionDashboardScreen({ navigation }: Props) {
  const profile = useAppStore((s) => s.profile);
  const [loggedDates, setLoggedDates] = useState<string[]>([]);
  const [nutrition, setNutrition] = useState<NutritionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => todayKey());
  const [activeTab, setActiveTab] = useState<MealSlot>(() => {
    const hour = new Date().getHours();
    if (hour < 10) return 'breakfast';
    if (hour < 12) return 'brunch';
    if (hour < 15) return 'lunch';
    if (hour < 17) return 'snack';
    if (hour < 21) return 'dinner';
    return 'late_snack';
  });

  const days = useMemo(() => weekDays(weekAnchor), [weekAnchor]);
  const tab = MEAL_TABS.find((t) => t.key === activeTab)!;
  const isToday = selectedDate === todayKey();

  const refresh = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [dates, state] = await Promise.all([
        getMealLogDates(),
        isToday
          ? fetchNutrition(profile.user_id).catch(() => null)
          : Promise.resolve(null),
      ]);
      setLoggedDates(dates);
      setNutrition(isToday ? state : null);
    } finally {
      setLoading(false);
    }
  }, [profile, isToday]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const mealsForTab = useMemo(() => {
    const meals = nutrition?.meals ?? [];
    return meals.filter((m) => tabForMeal(m) === activeTab);
  }, [nutrition, activeTab]);

  const dailyTarget = nutrition?.calorie_target ?? 2200;
  const mealTarget = Math.round(dailyTarget * tab.share);
  const eaten = mealsForTab.reduce((sum, m) => sum + (m.calories || 0), 0);
  const progress = Math.min(eaten / Math.max(mealTarget, 1), 1);

  function openScanner() {
    navigation.navigate('Scanner', {
      mealSlot: activeTab,
      mealLabel: tab.label,
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.streakCard}>
          <View style={styles.streakHeader}>
            <Text style={styles.monthTitle}>{format(weekAnchor, 'MMMM yyyy')}</Text>
            <View style={styles.arrowRow}>
              <Pressable
                style={styles.monthArrow}
                onPress={() => setWeekAnchor((d) => subWeeks(d, 1))}
                hitSlop={8}
              >
                <Text style={styles.monthArrowText}>‹</Text>
              </Pressable>
              <Pressable
                style={styles.monthArrow}
                onPress={() => setWeekAnchor((d) => addWeeks(d, 1))}
                hitSlop={8}
              >
                <Text style={styles.monthArrowText}>›</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.weekRow}>
            {days.map((d) => {
              const selected = d.key === selectedDate;
              const logged = loggedDates.includes(d.key);
              return (
                <Pressable
                  key={d.key}
                  style={styles.dayCol}
                  onPress={() => setSelectedDate(d.key)}
                >
                  <Text style={[styles.dayLabel, selected && styles.dayLabelOn]}>{d.label}</Text>
                  <View
                    style={[
                      styles.dayPill,
                      selected && styles.dayPillSelected,
                      logged && !selected && styles.dayPillLogged,
                    ]}
                  >
                    <Text style={[styles.dayNum, selected && styles.dayNumOn]}>{d.dayNum}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          {MEAL_TABS.map((t) => {
            const on = t.key === activeTab;
            return (
              <Pressable
                key={t.key}
                style={[styles.tab, on && styles.tabActive]}
                onPress={() => setActiveTab(t.key)}
              >
                <Text style={[styles.tabText, on && styles.tabTextActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.mealCard}>
          <View style={styles.mealHeader}>
            <Text style={styles.mealTitle}>{tab.label}</Text>
            <Ionicons name="ellipsis-vertical" size={18} color="#6B6B6B" />
          </View>

          <Text style={styles.kcalLine}>
            <Text style={styles.kcalEaten}>{eaten}</Text>
            <Text style={styles.kcalTarget}> / {mealTarget} kcal</Text>
          </Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>

          {loading ? (
            <ActivityIndicator color="#D4A017" style={{ marginTop: 20 }} />
          ) : !isToday ? (
            <Text style={styles.empty}>
              Meal history for other days is shown when logged. Select today to scan and track.
            </Text>
          ) : mealsForTab.length === 0 ? (
            <Text style={styles.empty}>
              No {tab.label.toLowerCase()} items yet. Scan your plate, then choose this meal type.
            </Text>
          ) : (
            <View style={styles.ingredientsBlock}>
              <Text style={styles.ingredientCount}>
                {mealsForTab.length} item{mealsForTab.length === 1 ? '' : 's'}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.ingredientScroll}
              >
                {mealsForTab.map((m, index) => {
                  const color = ITEM_COLORS[index % ITEM_COLORS.length];
                  const itemProgress = Math.min((m.calories || 0) / Math.max(mealTarget, 1), 1);
                  return (
                    <View key={m.id} style={styles.ingredientItem}>
                      <View style={styles.miniTrack}>
                        <View
                          style={[
                            styles.miniFill,
                            {
                              width: `${Math.max(itemProgress * 100, 8)}%`,
                              backgroundColor: color,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.ingredientName} numberOfLines={2}>
                        {shortFoodName(m.description)}
                      </Text>
                      <Text style={[styles.ingredientKcal, { color }]}>
                        {m.calories ?? '—'} kcal
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        <Pressable style={styles.scanBtn} onPress={openScanner} disabled={!isToday}>
          <View style={styles.scanCopy}>
            <Text style={styles.scanTitle}>Scan your plate</Text>
            <Text style={styles.scanSub}>Gemini vision · instant macro estimate</Text>
          </View>
          <View style={styles.cameraCircle}>
            <Ionicons name="camera" size={22} color={GOLD} />
          </View>
        </Pressable>

        {!isToday ? (
          <Text style={styles.hint}>Scanning is available for today only.</Text>
        ) : (
          <Text style={styles.hint}>
            After scanning, pick a meal type and the food card is added under that name.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const GOLD = '#D4A017';
const GOLD_SOFT = '#E8C547';
const MINT = '#3DDC97';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B0B0C' },
  container: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 36, gap: 18 },
  streakCard: {
    backgroundColor: '#122018',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthTitle: { color: '#F4F7FB', fontSize: 20, fontWeight: '800' },
  arrowRow: { flexDirection: 'row', gap: 8 },
  monthArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E2E26',
    borderWidth: 1,
    borderColor: '#2A3F35',
  },
  monthArrowText: { color: '#F4F7FB', fontSize: 20, fontWeight: '600', marginTop: -1 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', flex: 1, gap: 8 },
  dayLabel: { color: '#7A8F84', fontSize: 12, fontWeight: '600' },
  dayLabelOn: { color: '#F4F7FB', fontWeight: '800' },
  dayPill: {
    width: 36,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A2A22',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dayPillSelected: {
    backgroundColor: '#1F3D30',
    borderColor: MINT,
  },
  dayPillLogged: {
    borderColor: 'rgba(61,220,151,0.35)',
  },
  dayNum: { color: '#9AA8BC', fontWeight: '700', fontSize: 14 },
  dayNumOn: { color: '#F4F7FB', fontWeight: '800' },
  tabRow: { gap: 10, paddingRight: 8 },
  tab: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabActive: { borderColor: GOLD, backgroundColor: 'rgba(212,160,23,0.08)' },
  tabText: { color: '#8A8A8A', fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: GOLD },
  mealCard: {
    backgroundColor: '#121214',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1C1C1C',
    minHeight: 260,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  kcalLine: { marginTop: 14 },
  kcalEaten: { color: '#FFFFFF', fontSize: 34, fontWeight: '800' },
  kcalTarget: { color: '#7A7A7A', fontSize: 20, fontWeight: '600' },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#222',
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: GOLD_SOFT,
  },
  empty: { color: '#7A7A7A', marginTop: 22, lineHeight: 20 },
  ingredientsBlock: { marginTop: 20, gap: 12 },
  ingredientCount: { color: '#8A8A8A', fontWeight: '600', fontSize: 13 },
  ingredientScroll: { gap: 18, paddingRight: 8 },
  ingredientItem: { width: 96, gap: 8 },
  miniTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: '#2A2A2A',
    overflow: 'hidden',
  },
  miniFill: { height: '100%', borderRadius: 999 },
  ingredientName: { color: '#EDEDED', fontWeight: '600', fontSize: 13, lineHeight: 17 },
  ingredientKcal: { fontWeight: '700', fontSize: 13 },
  scanBtn: {
    backgroundColor: '#121214',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(212,160,23,0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scanCopy: { flex: 1, paddingRight: 12 },
  scanTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  scanSub: { color: '#8A8A8A', marginTop: 4, fontSize: 13 },
  cameraCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212,160,23,0.08)',
  },
  hint: { color: '#5A5A5A', fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
