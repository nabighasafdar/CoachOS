import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchActivity } from '../services/coachApi';
import { useAppStore } from '../store/appStore';
import { AGENT_LABELS, UI } from '../theme/ui';
import type { AgentName, DecisionLogEntry } from '../types/agent';

const FILTERS: { key: 'all' | AgentName; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'planner', label: 'Planner' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'adaptation', label: 'Adaptation' },
  { key: 'accountability', label: 'Accountability' },
];

function formatStamp(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const day = isToday ? 'Today' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  return `${day} · ${time}`;
}

function humanAction(action: string) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function DecisionCard({ decision }: { decision: DecisionLogEntry }) {
  const color = UI.agents[decision.agent];
  const bg = UI.agentBg[decision.agent];
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.badge, { backgroundColor: bg }]}>
          <Text style={[styles.badgeText, { color }]}>{AGENT_LABELS[decision.agent]}</Text>
        </View>
        <Text style={styles.time}>{formatStamp(decision.timestamp)}</Text>
      </View>
      <Text style={styles.action}>{humanAction(decision.action)}</Text>
      <View style={styles.divider} />
      <Text style={styles.whyLabel}>WHY</Text>
      <Text style={styles.reason}>{decision.reason}</Text>
    </View>
  );
}

export function AgentsScreen() {
  const profile = useAppStore((s) => s.profile);
  const decisions = useAppStore((s) => s.decisions);
  const setDecisions = useAppStore((s) => s.setDecisions);
  const [filter, setFilter] = useState<'all' | AgentName>('all');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!profile) return;
    setBusy(true);
    try {
      setDecisions(await fetchActivity(profile.user_id));
    } finally {
      setBusy(false);
    }
  }, [profile, setDecisions]);

  const filtered = useMemo(
    () => (filter === 'all' ? decisions : decisions.filter((d) => d.agent === filter)),
    [decisions, filter],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={busy} onRefresh={refresh} />}
      >
        <Text style={styles.title}>Agent activity log</Text>
        <Text style={styles.sub}>Every decision an agent made on your behalf, and why.</Text>

        <View style={styles.chipWrap}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.chip, filter === f.key && styles.chipActive]}
            >
              <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          ))}
        </View>

        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptyCopy}>
              Generate a plan, log a meal, or complete a check-in — agents will log every action here.
            </Text>
          </View>
        ) : (
          filtered.map((d) => <DecisionCard key={d.id} decision={d} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: UI.bg },
  container: { padding: 20, paddingBottom: 40, gap: 12 },
  title: { fontSize: 28, fontWeight: '800', color: UI.ink, letterSpacing: -0.5 },
  sub: { color: UI.inkMuted, fontSize: 15, marginBottom: 4, lineHeight: 21 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: UI.borderStrong,
    borderRadius: UI.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: UI.card,
  },
  chipActive: { backgroundColor: UI.black, borderColor: UI.black },
  chipText: { color: UI.inkMuted, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#FFFFFF' },
  emptyCard: {
    backgroundColor: UI.card,
    borderRadius: UI.radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: UI.border,
    marginTop: 8,
  },
  emptyTitle: { color: UI.ink, fontWeight: '800', fontSize: 16 },
  emptyCopy: { color: UI.inkMuted, marginTop: 6, lineHeight: 20 },
  card: {
    backgroundColor: UI.card,
    borderRadius: UI.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
    borderLeftWidth: 4,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { borderRadius: UI.radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontWeight: '800', fontSize: 12 },
  time: { color: UI.inkDim, fontSize: 12 },
  action: { color: UI.ink, fontWeight: '700', fontSize: 15, lineHeight: 22 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: UI.border, marginVertical: 4 },
  whyLabel: { color: UI.inkDim, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  reason: { color: UI.inkMuted, lineHeight: 20, fontSize: 14 },
});
