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
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { fetchActivity, fetchNutrition, fetchPlan } from '../services/coachApi';
import { getCurrentStreak } from '../lib/nutritionStreak';
import { useAppStore } from '../store/appStore';
import { AGENT_LABELS, UI } from '../theme/ui';
import type { AgentName, DecisionLogEntry } from '../types/agent';
import type { HomeStackParamList, RootTabParamList } from '../navigation/types';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>,
  BottomTabNavigationProp<RootTabParamList>
>;

const AGENT_DOTS: { key: AgentName; color: string }[] = [
  { key: 'planner', color: UI.agents.planner },
  { key: 'recovery', color: UI.agents.recovery },
  { key: 'nutrition', color: UI.agents.nutrition },
  { key: 'adaptation', color: UI.agents.adaptation },
  { key: 'accountability', color: UI.agents.accountability },
];

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const profile = useAppStore((s) => s.profile);
  const decisions = useAppStore((s) => s.decisions);
  const lastSignals = useAppStore((s) => s.lastSignals);
  const setPlan = useAppStore((s) => s.setPlan);
  const setDecisions = useAppStore((s) => s.setDecisions);
  const [busy, setBusy] = useState(false);
  const [nutrition, setNutrition] = useState<Awaited<ReturnType<typeof fetchNutrition>>>(null);
  const [streak, setStreak] = useState(0);

  const refresh = useCallback(async () => {
    if (!profile) return;
    setBusy(true);
    try {
      setPlan(await fetchPlan(profile.user_id));
      setDecisions(await fetchActivity(profile.user_id));
      setNutrition(await fetchNutrition(profile.user_id).catch(() => null));
      setStreak(await getCurrentStreak());
    } finally {
      setBusy(false);
    }
  }, [profile, setDecisions, setPlan]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const firstName = profile?.display_name?.trim().split(' ')[0] || 'Alex';
  const initial = firstName.charAt(0).toUpperCase();
  const dateLabel = format(new Date(), 'EEEE, MMM d').toUpperCase();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const recoveryScore = lastSignals
    ? Math.max(10, Math.min(100, Math.round(
        ((lastSignals.sleep + lastSignals.energy + (11 - lastSignals.soreness)) / 30) * 100,
      )))
    : 42;

  const proteinEaten = Math.round(
    (nutrition?.meals ?? []).reduce((s, m) => s + (m.protein_g || 0), 0),
  );
  const proteinTarget = 140;

  const adaptDecision = decisions.find((d) => d.agent === 'adaptation');
  const recentRecovery = decisions.find((d) => d.agent === 'recovery');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={busy} onRefresh={refresh} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.date}>{dateLabel}</Text>
            <Text style={styles.greeting}>{greeting}, {firstName}</Text>
          </View>
          <Pressable style={styles.avatar} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.avatarText}>{initial}</Text>
          </Pressable>
        </View>

        <View style={styles.agentBar}>
          {AGENT_DOTS.map((a) => (
            <Pressable
              key={a.key}
              style={styles.agentBarItem}
              onPress={() => {
                if (a.key === 'recovery') navigation.navigate('Recovery');
                else if (a.key === 'nutrition') navigation.navigate('Nutrition');
                else navigation.navigate('Log');
              }}
            >
              <View style={[styles.agentDot, { backgroundColor: a.color }]} />
              <Text style={styles.agentBarLabel}>{AGENT_LABELS[a.key]}</Text>
            </Pressable>
          ))}
        </View>

        {adaptDecision ? (
          <View style={[styles.heroCard, { backgroundColor: UI.agentBg.adaptation }]}>
            <View style={styles.heroTop}>
              <Text style={[styles.heroBadge, { color: UI.agents.adaptation }]}>Adaptation</Text>
              <Text style={styles.heroMeta}>Plan adjusted overnight</Text>
            </View>
            <Text style={styles.heroTitle}>{humanAction(adaptDecision.action)}</Text>
            <Text style={styles.heroBody}>{adaptDecision.reason}</Text>
            <Pressable onPress={() => navigation.navigate('Plan')}>
              <Text style={styles.heroLink}>View today&apos;s plan ›</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Your coaching team is ready</Text>
            <Text style={styles.heroBody}>
              Complete onboarding and log a check-in to see adaptations here.
            </Text>
          </View>
        )}

        <View style={styles.metricsRow}>
          <Pressable style={styles.metricCard} onPress={() => navigation.navigate('Recovery')}>
            <Text style={styles.metricLabel}>Recovery</Text>
            <Text style={[styles.metricValue, { color: UI.agents.recovery }]}>{recoveryScore}</Text>
            <Text style={styles.metricSub}>
              {recoveryScore < 50 ? 'Low' : 'OK'}
              {lastSignals ? ` · sleep ${lastSignals.sleep}/10` : ''}
            </Text>
          </Pressable>
          <Pressable style={styles.metricCard} onPress={() => navigation.navigate('Nutrition')}>
            <Text style={styles.metricLabel}>Protein today</Text>
            <Text style={[styles.metricValue, { color: UI.agents.nutrition }]}>{proteinEaten}g</Text>
            <Text style={styles.metricSub}>of {proteinTarget}g target</Text>
          </Pressable>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Streak</Text>
            <Text style={styles.metricValue}>{streak}</Text>
            <Text style={styles.metricSub}>days on plan</Text>
          </View>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Recent agent activity</Text>
          <Pressable onPress={() => navigation.navigate('Log')}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        {(recentRecovery || decisions[0]) ? (
          <ActivityPreviewCard decision={recentRecovery ?? decisions[0]} />
        ) : (
          <View style={styles.emptyActivity}>
            <Text style={styles.emptyText}>No agent activity yet.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActivityPreviewCard({ decision }: { decision: DecisionLogEntry }) {
  const color = UI.agents[decision.agent];
  const bg = UI.agentBg[decision.agent];
  return (
    <View style={[styles.activityCard, { borderLeftColor: color }]}>
      <View style={styles.activityTop}>
        <View style={[styles.activityBadge, { backgroundColor: bg }]}>
          <Text style={[styles.activityBadgeText, { color }]}>{AGENT_LABELS[decision.agent]}</Text>
        </View>
        <Text style={styles.activityTime}>
          {format(new Date(decision.timestamp), 'h:mma').toLowerCase()}
        </Text>
      </View>
      <Text style={styles.activityBody}>{decision.reason}</Text>
    </View>
  );
}

function humanAction(action: string) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: UI.bg },
  container: { padding: 20, paddingBottom: 32, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  date: { color: UI.inkDim, fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
  greeting: { color: UI.ink, fontSize: 28, fontWeight: '800', marginTop: 4, letterSpacing: -0.5 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: UI.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  agentBar: {
    flexDirection: 'row',
    backgroundColor: UI.black,
    borderRadius: UI.radius.pill,
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
  },
  agentBarItem: { alignItems: 'center', flex: 1, gap: 6 },
  agentDot: { width: 8, height: 8, borderRadius: 4 },
  agentBarLabel: { color: '#9A9A9A', fontSize: 9, fontWeight: '600' },
  heroCard: {
    backgroundColor: UI.card,
    borderRadius: UI.radius.lg,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: UI.border,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroBadge: { fontWeight: '800', fontSize: 13 },
  heroMeta: { color: UI.inkMuted, fontSize: 12 },
  heroTitle: { color: UI.ink, fontSize: 18, fontWeight: '800', lineHeight: 24 },
  heroBody: { color: UI.inkMuted, lineHeight: 21, fontSize: 14 },
  heroLink: { color: UI.accent, fontWeight: '700', marginTop: 4, fontSize: 14 },
  metricsRow: { flexDirection: 'row', gap: 10 },
  metricCard: {
    flex: 1,
    backgroundColor: UI.card,
    borderRadius: UI.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: UI.border,
    gap: 4,
  },
  metricLabel: { color: UI.inkMuted, fontSize: 12 },
  metricValue: { color: UI.ink, fontSize: 26, fontWeight: '800' },
  metricSub: { color: UI.inkDim, fontSize: 11 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: UI.ink, fontSize: 17, fontWeight: '800' },
  seeAll: { color: UI.accent, fontWeight: '700', fontSize: 14 },
  activityCard: {
    backgroundColor: UI.card,
    borderRadius: UI.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
    borderLeftWidth: 4,
    gap: 8,
  },
  activityTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activityBadge: { borderRadius: UI.radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  activityBadgeText: { fontSize: 12, fontWeight: '800' },
  activityTime: { color: UI.inkDim, fontSize: 12 },
  activityBody: { color: UI.ink, lineHeight: 20, fontSize: 14 },
  emptyActivity: {
    backgroundColor: UI.card,
    borderRadius: UI.radius.md,
    padding: 20,
    borderWidth: 1,
    borderColor: UI.border,
  },
  emptyText: { color: UI.inkMuted },
});
