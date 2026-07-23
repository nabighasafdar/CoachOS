import { format } from 'date-fns';
import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { fetchNutrition, logMeal } from '../services/coachApi';
import { useAppStore } from '../store/appStore';
import { UI } from '../theme/ui';
import type { HomeStackParamList } from '../navigation/types';
import type { NutritionState } from '../types/agent';

export function NutritionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const profile = useAppStore((s) => s.profile);
  const [nutrition, setNutrition] = useState<NutritionState | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  const refresh = useCallback(async () => {
    if (!profile) return;
    setBusy(true);
    try {
      setNutrition(await fetchNutrition(profile.user_id));
    } finally {
      setBusy(false);
    }
  }, [profile]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const target = nutrition?.calorie_target ?? profile?.daily_calorie_target ?? 2200;
  const eaten = Math.round(
    (nutrition?.meals ?? []).reduce((s, m) => s + (m.calories || 0), 0),
  );
  const protein = Math.round((nutrition?.meals ?? []).reduce((s, m) => s + (m.protein_g || 0), 0));
  const carbs = Math.round((nutrition?.meals ?? []).reduce((s, m) => s + (m.carbs_g || 0), 0));
  const fat = Math.round((nutrition?.meals ?? []).reduce((s, m) => s + (m.fat_g || 0), 0));
  const proteinTarget = 140;
  const carbsTarget = 220;
  const fatTarget = 65;

  const suggestion = nutrition?.suggestions?.[0];
  const meals = nutrition?.meals ?? [];

  const suggestedMeal = {
    description: 'Grilled chicken, spinach, brown rice',
    calories: 520,
    protein_g: 46,
  };

  async function addSuggestedMeal() {
    if (!profile || adding) return;
    setAdding(true);
    try {
      await logMeal(
        profile.user_id,
        suggestedMeal.description,
        nutrition?.pantry ?? [],
      );
      await refresh();
    } finally {
      setAdding(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={busy} onRefresh={refresh} />}
      >
        <Pressable style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Home</Text>
        </Pressable>

        <Text style={styles.title}>Nutrition</Text>
        <Text style={styles.sub}>
          {eaten.toLocaleString()} of {target.toLocaleString()} calories logged today.
        </Text>

        <Pressable style={styles.scanCard} onPress={() => navigation.navigate('Scanner')}>
          <View style={styles.scanIconWrap}>
            <Ionicons name="scan-outline" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.scanBody}>
            <Text style={styles.scanTitle}>Scan your food</Text>
            <Text style={styles.scanSub}>
              Point the camera at a plate — calories and macros come back in seconds
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.55)" />
        </Pressable>

        <MacroBar label="Protein" current={protein} target={proteinTarget} color="#6B8E23" />
        <MacroBar label="Carbs" current={carbs} target={carbsTarget} color="#A0522D" />
        <MacroBar label="Fat" current={fat} target={fatTarget} color="#4682B4" />

        <View style={[styles.insight, { backgroundColor: UI.agentBg.nutrition, borderColor: UI.agents.nutrition }]}>
          <Text style={[styles.insightLabel, { color: UI.agents.nutrition }]}>Nutrition</Text>
          <Text style={styles.insightBody}>
            {suggestion ||
              'Fridge photo shows chicken breast and spinach — dinner idea logged below to close the protein gap.'}
          </Text>
        </View>

        <View style={styles.suggestCard}>
          <View style={styles.suggestBody}>
            <Text style={styles.suggestTitle}>{suggestedMeal.description}</Text>
            <Text style={styles.suggestMeta}>
              {suggestedMeal.calories} kcal · {suggestedMeal.protein_g}g protein
            </Text>
          </View>
          <Pressable style={styles.addBtn} onPress={addSuggestedMeal} disabled={adding}>
            <Text style={styles.addBtnText}>{adding ? 'Adding…' : 'Add to log'}</Text>
          </Pressable>
        </View>

        <View style={styles.logHeader}>
          <Text style={styles.logTitle}>Logged today</Text>
          <Pressable style={styles.logMeal} onPress={() => navigation.navigate('Scanner')}>
            <Ionicons name="camera-outline" size={16} color={UI.accent} />
            <Text style={styles.logMealText}>Log meal</Text>
          </Pressable>
        </View>

        {meals.length === 0 ? (
          <View style={styles.emptyLog}>
            <Text style={styles.emptyText}>No meals logged yet today.</Text>
          </View>
        ) : (
          meals.map((m) => (
            <View key={m.id} style={styles.logRow}>
              <View style={styles.logMain}>
                <Text style={styles.logDesc}>{m.description}</Text>
                {m.calories != null ? (
                  <Text style={styles.logKcal}>{m.calories} kcal</Text>
                ) : null}
              </View>
              <Text style={styles.logTime}>
                {m.logged_at ? format(new Date(m.logged_at), 'h:mma').toLowerCase() : '—'}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MacroBar({
  label,
  current,
  target,
  color,
}: {
  label: string;
  current: number;
  target: number;
  color: string;
}) {
  const pct = Math.min(1, current / Math.max(1, target));
  return (
    <View style={styles.macroRow}>
      <View style={styles.macroHead}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroNums}>
          {current}g / {target}g
        </Text>
      </View>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: UI.bg },
  container: { padding: 20, paddingBottom: 40, gap: 14 },
  back: { alignSelf: 'flex-start' },
  backText: { color: UI.inkMuted, fontSize: 15, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', color: UI.ink, letterSpacing: -0.5 },
  sub: { color: UI.inkMuted, fontSize: 15 },
  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: UI.black,
    borderRadius: UI.radius.lg,
    padding: 16,
    marginTop: 2,
  },
  scanIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBody: { flex: 1, gap: 4 },
  scanTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  scanSub: { color: 'rgba(255,255,255,0.62)', fontSize: 13, lineHeight: 18 },
  macroRow: { gap: 6 },
  macroHead: { flexDirection: 'row', justifyContent: 'space-between' },
  macroLabel: { color: UI.ink, fontWeight: '700', fontSize: 14 },
  macroNums: { color: UI.inkMuted, fontSize: 13 },
  macroTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: UI.border,
    overflow: 'hidden',
  },
  macroFill: { height: '100%', borderRadius: 4 },
  insight: {
    borderRadius: UI.radius.lg,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  insightLabel: { fontWeight: '800', fontSize: 12 },
  insightBody: { color: UI.ink, lineHeight: 21, fontSize: 14 },
  suggestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: UI.card,
    borderRadius: UI.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
  },
  suggestBody: { flex: 1, gap: 4 },
  suggestTitle: { color: UI.ink, fontWeight: '800', fontSize: 15 },
  suggestMeta: { color: UI.inkMuted, fontSize: 13 },
  addBtn: {
    borderWidth: 1,
    borderColor: UI.borderStrong,
    borderRadius: UI.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: { color: UI.ink, fontWeight: '700', fontSize: 13 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  logTitle: { color: UI.ink, fontWeight: '800', fontSize: 16 },
  logMeal: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logMealText: { color: UI.accent, fontWeight: '700', fontSize: 14 },
  emptyLog: {
    backgroundColor: UI.card,
    borderRadius: UI.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
  },
  emptyText: { color: UI.inkMuted },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI.border,
  },
  logMain: { flex: 1, paddingRight: 12, gap: 2 },
  logDesc: { color: UI.inkMuted, fontSize: 14 },
  logKcal: { color: UI.inkDim, fontSize: 12, fontWeight: '600' },
  logTime: { color: UI.inkDim, fontSize: 13 },
});
