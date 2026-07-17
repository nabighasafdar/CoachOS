import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { adaptPlan, fetchActivity, fetchPlan, generatePlan, healthCheck } from '../services/coachApi';
import { useAppStore } from '../store/appStore';

const COLORS = {
  background: '#080D18',
  surface: '#111827',
  surfaceSoft: '#172033',
  border: '#22304A',
  text: '#F8FAFC',
  muted: '#91A0B8',
  dim: '#60708A',
  accent: '#55E6A5',
  accentDark: '#0B392A',
  warning: '#FFCA68',
  danger: '#FF7B72',
};

export function HomeScreen() {
  const profile = useAppStore((s) => s.profile);
  const plan = useAppStore((s) => s.plan);
  const setPlan = useAppStore((s) => s.setPlan);
  const setDecisions = useAppStore((s) => s.setDecisions);
  const lastSignals = useAppStore((s) => s.lastSignals);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [apiOk, setApiOk] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    if (!profile) return;
    setBusy(true);
    try {
      const health = await healthCheck();
      setApiOk(!!health.ok);
      const next = await fetchPlan(profile.user_id);
      setPlan(next);
      const decisions = await fetchActivity(profile.user_id);
      setDecisions(decisions);
      setMsg('Synced plan + agent activity');
    } catch (e) {
      setApiOk(false);
      setMsg(e instanceof Error ? e.message : 'Refresh failed');
    } finally {
      setBusy(false);
    }
  }, [profile, setDecisions, setPlan]);

  async function rebuild() {
    if (!profile) return;
    setBusy(true);
    try {
      const next = await generatePlan(profile.user_id, profile, true);
      setPlan(next);
      setMsg('Planner rebuilt your week');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Plan failed');
    } finally {
      setBusy(false);
    }
  }

  async function runAdapt() {
    if (!profile) return;
    setBusy(true);
    try {
      const result = await adaptPlan(profile.user_id, 'manual', lastSignals ?? undefined);
      setPlan(result.plan);
      const decisions = await fetchActivity(profile.user_id);
      setDecisions(decisions);
      setMsg(result.decision.reason);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Adapt failed');
    } finally {
      setBusy(false);
    }
  }

  const done = plan?.sessions.filter((s) => s.status === 'done').length ?? 0;
  const skipped = plan?.sessions.filter((s) => s.status === 'skipped').length ?? 0;
  const planned = plan?.sessions.filter((s) => s.status === 'planned').length ?? 0;
  const total = plan?.sessions.length ?? 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const nextSession = plan?.sessions.find((session) =>
    session.status === 'planned' || session.status === 'moved'
  );
  const readiness = lastSignals
    ? Math.max(
        10,
        Math.min(
          100,
          Math.round(
            ((lastSignals.sleep + lastSignals.energy + (11 - lastSignals.soreness)) / 30) * 100,
          ),
        ),
      )
    : null;
  const readinessLabel =
    readiness === null ? 'Check in' : readiness >= 75 ? 'Ready to train' : readiness >= 50 ? 'Take it steady' : 'Recovery first';
  const firstName = profile?.display_name?.trim().split(' ')[0] || 'Athlete';

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={refresh} tintColor="#3DDC97" />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>COACHOS</Text>
          <Text style={styles.title}>Good day, {firstName}</Text>
          <Text style={styles.sub}>Your plan is adapting around you.</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.systemRow}>
        <View style={[styles.statusDot, apiOk === false && styles.statusDotOffline]} />
        <Text style={styles.systemText}>
          {apiOk === null ? 'Pull down to sync' : apiOk ? 'Agents online' : 'Agents offline'}
        </Text>
        <Text style={styles.systemDivider}>•</Text>
        <Text style={styles.systemText}>Week of {formatShortDate(plan?.week_start)}</Text>
      </View>

      <View style={styles.readinessCard}>
        <View style={styles.readinessTop}>
          <View>
            <Text style={styles.cardLabel}>TODAY'S READINESS</Text>
            <Text style={styles.readinessTitle}>{readinessLabel}</Text>
            <Text style={styles.readinessCopy}>
              {lastSignals
                ? `Based on sleep, energy and soreness`
                : 'Complete your morning check-in for a score'}
            </Text>
          </View>
          <View style={styles.scoreRing}>
            <Text style={styles.score}>{readiness ?? '—'}</Text>
            <Text style={styles.scoreUnit}>{readiness === null ? 'NO DATA' : '/ 100'}</Text>
          </View>
        </View>

        <View style={styles.signalRow}>
          <Signal label="Sleep" value={lastSignals ? `${lastSignals.sleep}/10` : '—'} />
          <View style={styles.verticalRule} />
          <Signal label="Energy" value={lastSignals ? `${lastSignals.energy}/10` : '—'} />
          <View style={styles.verticalRule} />
          <Signal label="Soreness" value={lastSignals ? `${lastSignals.soreness}/10` : '—'} />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Up next</Text>
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>{planned} remaining</Text>
        </View>
      </View>

      {nextSession ? (
        <View style={styles.workoutCard}>
          <View style={styles.workoutAccent} />
          <View style={styles.workoutBody}>
            <View style={styles.workoutTop}>
              <Text style={styles.workoutDay}>{nextSession.day.toUpperCase()}</Text>
              <Text style={styles.workoutDuration}>{nextSession.duration_min} MIN</Text>
            </View>
            <Text style={styles.workoutTitle}>{cleanSessionTitle(nextSession.title)}</Text>
            <Text style={styles.workoutFocus}>{nextSession.focus}</Text>
            <View style={styles.exerciseList}>
              {nextSession.exercises.slice(0, 3).map((exercise) => (
                <View key={exercise} style={styles.exerciseChip}>
                  <Text style={styles.exerciseText}>{exercise}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{total ? 'Week complete' : 'No plan yet'}</Text>
          <Text style={styles.emptyCopy}>
            {total ? 'Great work. Ask Planner to prepare your next week.' : 'Build your first personalized training week.'}
          </Text>
        </View>
      )}

      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.cardLabel}>WEEKLY PROGRESS</Text>
            <Text style={styles.progressTitle}>{done} of {total} sessions complete</Text>
          </View>
          <Text style={styles.progressPercent}>{progress}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <View style={styles.stats}>
          <Stat label="Remaining" value={String(planned)} color={COLORS.warning} />
          <Stat label="Completed" value={String(done)} color={COLORS.accent} />
          <Stat label="Skipped" value={String(skipped)} color={COLORS.danger} />
        </View>
      </View>

      <View style={styles.agentCard}>
        <View style={styles.agentIcon}>
          <Text style={styles.agentIconText}>AI</Text>
        </View>
        <View style={styles.agentContent}>
          <Text style={styles.agentName}>Adaptation Agent</Text>
          <Text style={styles.agentCopy}>
            {msg || 'I’m watching your recovery and schedule. Run an adaptation whenever your day changes.'}
          </Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.primary, pressed && styles.buttonPressed]}
        onPress={runAdapt}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color={COLORS.background} />
        ) : (
          <>
            <Text style={styles.primaryText}>Adapt today’s plan</Text>
            <Text style={styles.buttonArrow}>→</Text>
          </>
        )}
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.secondary, pressed && styles.buttonPressed]}
        onPress={rebuild}
        disabled={busy}
      >
        <Text style={styles.secondaryText}>Rebuild training week</Text>
      </Pressable>

      <Text style={styles.footer}>Your agents explain every change in the Agents tab.</Text>
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.signal}>
      <Text style={styles.signalValue}>{value}</Text>
      <Text style={styles.signalLabel}>{label}</Text>
    </View>
  );
}

function formatShortDate(value?: string) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function cleanSessionTitle(value: string) {
  const parts = value.split('·');
  return (parts.length > 1 ? parts.slice(1).join('·') : value).trim();
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    backgroundColor: COLORS.background,
    gap: 16,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.2,
    marginBottom: 6,
  },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: -0.7 },
  sub: { color: COLORS.muted, marginTop: 5, fontSize: 14 },
  avatar: {
    height: 48,
    width: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentDark,
    borderColor: '#27795A',
    borderWidth: 1,
  },
  avatarText: { color: COLORS.accent, fontSize: 19, fontWeight: '800' },
  systemRow: { flexDirection: 'row', alignItems: 'center', marginTop: -4 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.accent, marginRight: 7 },
  statusDotOffline: { backgroundColor: COLORS.danger },
  systemText: { color: COLORS.dim, fontSize: 12, fontWeight: '500' },
  systemDivider: { color: COLORS.border, marginHorizontal: 8 },
  readinessCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 18,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  readinessTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLabel: { color: COLORS.dim, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  readinessTitle: { color: COLORS.text, fontSize: 21, fontWeight: '800', marginTop: 7 },
  readinessCopy: { color: COLORS.muted, fontSize: 12, marginTop: 5, maxWidth: 210 },
  scoreRing: {
    height: 78,
    width: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentDark,
    borderWidth: 5,
    borderColor: COLORS.accent,
  },
  score: { color: COLORS.text, fontSize: 25, fontWeight: '900' },
  scoreUnit: { color: COLORS.accent, fontSize: 8, fontWeight: '800', marginTop: -2 },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 19,
    paddingTop: 16,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
  },
  signal: { flex: 1, alignItems: 'center' },
  signalValue: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  signalLabel: { color: COLORS.dim, fontSize: 11, marginTop: 4 },
  verticalRule: { width: 1, height: 26, backgroundColor: COLORS.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  planBadge: { backgroundColor: COLORS.surfaceSoft, borderRadius: 99, paddingVertical: 6, paddingHorizontal: 10 },
  planBadgeText: { color: COLORS.muted, fontSize: 11, fontWeight: '700' },
  workoutCard: {
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  workoutAccent: { width: 5, backgroundColor: COLORS.accent },
  workoutBody: { flex: 1, padding: 16 },
  workoutTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  workoutDay: { color: COLORS.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.3 },
  workoutDuration: { color: COLORS.dim, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  workoutTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800', marginTop: 7 },
  workoutFocus: { color: COLORS.muted, fontSize: 13, marginTop: 3 },
  exerciseList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 13 },
  exerciseChip: { backgroundColor: COLORS.surfaceSoft, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 9 },
  exerciseText: { color: '#BCC7D8', fontSize: 11, fontWeight: '600' },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderColor: COLORS.border,
    borderWidth: 1,
    padding: 18,
  },
  emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  emptyCopy: { color: COLORS.muted, marginTop: 5, lineHeight: 19 },
  progressCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 17,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginTop: 6 },
  progressPercent: { color: COLORS.accent, fontSize: 22, fontWeight: '900' },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: COLORS.surfaceSoft, overflow: 'hidden', marginTop: 15 },
  progressFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 4 },
  stats: { flexDirection: 'row', marginTop: 15 },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { color: COLORS.dim, marginTop: 3, fontSize: 10 },
  agentCard: {
    flexDirection: 'row',
    backgroundColor: '#12182A',
    borderRadius: 18,
    padding: 15,
    borderColor: '#2B2850',
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  agentIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2250',
    marginRight: 12,
  },
  agentIconText: { color: '#C6A9FF', fontSize: 11, fontWeight: '900' },
  agentContent: { flex: 1 },
  agentName: { color: '#C6A9FF', fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  agentCopy: { color: '#C9D1DE', lineHeight: 19, fontSize: 13, marginTop: 4 },
  primary: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 17,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  primaryText: { color: COLORS.background, fontWeight: '900', fontSize: 15 },
  buttonArrow: { color: COLORS.background, fontSize: 22, fontWeight: '500' },
  secondary: {
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 49,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  secondaryText: { color: COLORS.text, fontWeight: '700' },
  buttonPressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  footer: { color: COLORS.dim, fontSize: 11, textAlign: 'center', marginTop: 2 },
});
