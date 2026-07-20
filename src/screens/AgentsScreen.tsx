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
import { fetchActivity, runAccountability } from '../services/coachApi';
import { useAppStore } from '../store/appStore';
import type { AgentName, DecisionLogEntry } from '../types/agent';

const AGENT_COLORS: Record<AgentName, string> = {
  planner: '#7AA2FF',
  recovery: '#3DDC97',
  nutrition: '#F0C14A',
  adaptation: '#C084FC',
  accountability: '#FF7B72',
};

const AGENT_LABELS: Record<AgentName, string> = {
  planner: 'Planner',
  recovery: 'Recovery',
  nutrition: 'Nutrition',
  adaptation: 'Adaptation',
  accountability: 'Accountability',
};

const LEGEND: AgentName[] = [
  'planner',
  'recovery',
  'nutrition',
  'adaptation',
  'accountability',
];

function formatStamp(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toISOString().slice(0, 10);
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} · ${time}`;
}

function humanAction(action: string) {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function DecisionCard({ decision }: { decision: DecisionLogEntry }) {
  const color = AGENT_COLORS[decision.agent] ?? '#F4F7FB';
  const label = AGENT_LABELS[decision.agent] ?? decision.agent;
  return (
    <View style={[styles.card, { borderColor: `${color}55` }]}>
      <View style={styles.cardHeader}>
        <View style={styles.agentRow}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={[styles.agentName, { color }]}>{label}</Text>
        </View>
        <Text style={styles.time}>{formatStamp(decision.timestamp)}</Text>
      </View>
      <Text style={styles.action}>{humanAction(decision.action)}</Text>
      <Text style={styles.reason}>{decision.reason}</Text>
    </View>
  );
}

export function AgentsScreen() {
  const profile = useAppStore((s) => s.profile);
  const decisions = useAppStore((s) => s.decisions);
  const setDecisions = useAppStore((s) => s.setDecisions);
  const [busy, setBusy] = useState(false);
  const [nudge, setNudge] = useState('');

  const refresh = useCallback(async () => {
    if (!profile) return;
    setBusy(true);
    try {
      setDecisions(await fetchActivity(profile.user_id));
    } finally {
      setBusy(false);
    }
  }, [profile, setDecisions]);

  async function accountability() {
    if (!profile) return;
    setBusy(true);
    try {
      const nudges = await runAccountability(profile.user_id);
      setNudge(nudges[0]?.message ?? 'No nudge');
      setDecisions(await fetchActivity(profile.user_id));
    } catch (e) {
      setNudge(e instanceof Error ? e.message : 'Accountability failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={busy} onRefresh={refresh} tintColor="#C084FC" />
        }
      >
        <View style={styles.previewPill}>
          <Text style={styles.previewText}>Preview</Text>
        </View>

        <Text style={styles.title}>Agent Activity</Text>
        <Text style={styles.sub}>What each agent decided — and why.</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.legendRow}
        >
          {LEGEND.map((agent) => (
            <View key={agent} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: AGENT_COLORS[agent] }]} />
              <Text style={styles.legendText}>{AGENT_LABELS[agent]}</Text>
            </View>
          ))}
        </ScrollView>

        <Pressable style={styles.accountabilityBtn} onPress={accountability} disabled={busy}>
          <Text style={styles.accountabilityText}>Run Accountability Agent</Text>
        </Pressable>
        {nudge ? <Text style={styles.nudge}>{nudge}</Text> : null}

        {decisions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No decisions yet</Text>
            <Text style={styles.emptyCopy}>
              Generate a plan, scan a meal, or skip a workout — agents will log every action here.
            </Text>
          </View>
        ) : (
          decisions.map((d) => <DecisionCard key={d.id} decision={d} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B0B0C' },
  container: { padding: 20, paddingBottom: 40, gap: 12 },
  previewPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  previewText: { color: '#6B6B6B', fontSize: 11, fontWeight: '700' },
  title: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  sub: { color: '#8A8A8A', fontSize: 15, marginTop: -4 },
  legendRow: { gap: 14, paddingVertical: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { color: '#9AA8BC', fontSize: 12, fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  accountabilityBtn: {
    backgroundColor: '#1A1010',
    borderRadius: 16,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3A2020',
    marginTop: 4,
  },
  accountabilityText: { color: '#FF8A84', fontWeight: '700', fontSize: 15 },
  nudge: { color: '#F0C14A', lineHeight: 20 },
  emptyCard: {
    backgroundColor: '#121214',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1C1C1C',
    marginTop: 4,
  },
  emptyTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  emptyCopy: { color: '#8A8A8A', marginTop: 6, lineHeight: 20 },
  card: {
    backgroundColor: '#121214',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  agentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  agentName: { fontWeight: '800', fontSize: 13 },
  time: { color: '#6B6B6B', fontSize: 11, fontWeight: '600' },
  action: { color: '#FFFFFF', fontWeight: '800', fontSize: 16, marginTop: 2, lineHeight: 22 },
  reason: { color: '#9AA8BC', lineHeight: 20, fontSize: 13 },
});
