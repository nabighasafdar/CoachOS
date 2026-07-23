import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchActivity, logWorkout } from '../services/coachApi';
import { useAppStore } from '../store/appStore';
import { UI } from '../theme/ui';
import type { WorkoutSession } from '../types/agent';

const WEEK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function todayAbbrev() {
  return format(new Date(), 'EEE').toLowerCase().slice(0, 3);
}

export function PlanScreen() {
  const profile = useAppStore((s) => s.profile);
  const plan = useAppStore((s) => s.plan);
  const decisions = useAppStore((s) => s.decisions);
  const setPlan = useAppStore((s) => s.setPlan);
  const setDecisions = useAppStore((s) => s.setDecisions);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const today = todayAbbrev();
  const todaySession = useMemo(
    () => plan?.sessions.find((s) => s.day === today) ?? plan?.sessions[0],
    [plan, today],
  );

  const adaptNote = decisions.find((d) => d.agent === 'adaptation');

  async function startSession() {
    if (!profile || !todaySession) return;
    setBusy(true);
    try {
      const result = await logWorkout(profile.user_id, todaySession.id, 'done');
      setPlan(result.plan);
      setDecisions(await fetchActivity(profile.user_id));
    } finally {
      setBusy(false);
    }
  }

  if (!plan || !todaySession) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.empty}>
          <Text style={styles.title}>Today&apos;s plan</Text>
          <Text style={styles.sub}>No plan yet. Finish onboarding to generate your first cycle.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Today&apos;s plan</Text>
        <Text style={styles.sub}>
          {todaySession.title} · {todaySession.duration_min} min
        </Text>

        {adaptNote || todaySession.status === 'moved' ? (
          <View style={[styles.adaptBanner, { backgroundColor: UI.agentBg.adaptation, borderColor: UI.agents.adaptation }]}>
            <Text style={[styles.adaptLabel, { color: UI.agents.adaptation }]}>Adaptation</Text>
            <Text style={styles.adaptText}>
              {adaptNote?.reason ?? (todaySession.notes || 'Session adjusted based on recovery signals.')}
            </Text>
          </View>
        ) : null}

        {todaySession.exercises.map((ex, i) => (
          <ExerciseRow
            key={`${ex}-${i}`}
            name={ex}
            detail={sessionDetail(ex, i)}
            checked={!!checked[ex]}
            onToggle={() => setChecked((c) => ({ ...c, [ex]: !c[ex] }))}
          />
        ))}

        <Pressable style={styles.startBtn} onPress={startSession} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.startText}>Start session</Text>
          )}
        </Pressable>

        <Text style={styles.weekTitle}>This week</Text>
        <WeekStrip sessions={plan.sessions} today={today} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ExerciseRow({
  name,
  detail,
  checked,
  onToggle,
}: {
  name: string;
  detail: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable style={styles.exerciseCard} onPress={onToggle}>
      <View style={[styles.checkbox, checked && styles.checkboxOn]}>
        {checked ? <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" /> : null}
      </View>
      <View style={styles.exerciseBody}>
        <Text style={styles.exerciseName}>{name}</Text>
        <Text style={styles.exerciseDetail}>{detail}</Text>
      </View>
      <MaterialCommunityIcons name="dumbbell" size={18} color={UI.inkDim} />
    </Pressable>
  );
}

function WeekStrip({ sessions, today }: { sessions: WorkoutSession[]; today: string }) {
  return (
    <View style={styles.weekRow}>
      {WEEK_DAYS.map((day) => {
        const session = sessions.find((s) => s.day === day);
        const isToday = day === today;
        const done = session?.status === 'done';
        return (
          <View key={day} style={styles.dayCol}>
            <View style={[styles.dayPill, isToday && styles.dayPillToday]}>
              <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                {day.charAt(0).toUpperCase() + day.slice(1, 3)}
              </Text>
            </View>
            <View
              style={[
                styles.dayDot,
                done && styles.dayDotDone,
                isToday && !done && styles.dayDotToday,
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

function sessionDetail(ex: string, index: number) {
  const presets = ['2 rounds · 8 reps each side', '3 rounds · 45 sec', '3 sets × 15', '12 min · zone 2'];
  return presets[index % presets.length];
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: UI.bg },
  container: { padding: 20, paddingBottom: 32, gap: 12 },
  empty: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: UI.ink, letterSpacing: -0.5 },
  sub: { color: UI.inkMuted, fontSize: 15, marginBottom: 4 },
  adaptBanner: {
    borderRadius: UI.radius.md,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  adaptLabel: { fontWeight: '800', fontSize: 13 },
  adaptText: { color: UI.ink, lineHeight: 20, fontSize: 14 },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: UI.card,
    borderRadius: UI.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: UI.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: UI.black, borderColor: UI.black },
  exerciseBody: { flex: 1, gap: 2 },
  exerciseName: { color: UI.ink, fontWeight: '800', fontSize: 16 },
  exerciseDetail: { color: UI.inkMuted, fontSize: 13 },
  startBtn: {
    backgroundColor: UI.accent,
    borderRadius: UI.radius.pill,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  startText: { color: '#FFFFFF', fontWeight: '800', fontSize: 17 },
  weekTitle: { color: UI.ink, fontWeight: '800', fontSize: 17, marginTop: 12 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  dayCol: { alignItems: 'center', gap: 8 },
  dayPill: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: UI.radius.pill },
  dayPillToday: {
    backgroundColor: UI.card,
    borderWidth: 1,
    borderColor: UI.borderStrong,
  },
  dayLabel: { color: UI.inkMuted, fontSize: 12, fontWeight: '600' },
  dayLabelToday: { color: UI.ink, fontWeight: '800' },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: UI.borderStrong,
    backgroundColor: 'transparent',
  },
  dayDotDone: { backgroundColor: UI.accent, borderColor: UI.accent },
  dayDotToday: { borderColor: UI.inkMuted },
});
