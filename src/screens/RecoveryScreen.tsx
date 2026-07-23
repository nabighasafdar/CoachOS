import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppStore } from '../store/appStore';
import { UI } from '../theme/ui';
import type { HomeStackParamList } from '../navigation/types';

const HRV_BARS = [0.45, 0.52, 0.78, 0.6, 0.38, 0.55, 0.42];

export function RecoveryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const lastSignals = useAppStore((s) => s.lastSignals);

  const score = lastSignals
    ? Math.max(10, Math.min(100, Math.round(
        ((lastSignals.sleep + lastSignals.energy + (11 - lastSignals.soreness)) / 30) * 100,
      )))
    : 42;

  const sleepHours = lastSignals ? `${Math.floor(lastSignals.sleep * 0.7)}h ${Math.round((lastSignals.sleep * 0.7 % 1) * 60)}m` : '5h 12m';
  const level = score < 50 ? 'low' : score < 75 ? 'moderate' : 'high';

  const insight = useCallback(() => {
    if (!lastSignals) {
      return 'Two short nights in a row. Recommending a lighter session and an earlier wind-down tonight.';
    }
    if (lastSignals.sleep < 6) {
      return 'Sleep was below baseline. Recommending a lighter session and an earlier wind-down tonight.';
    }
    return 'Recovery looks stable. Keep hydration up and maintain your usual bedtime window.';
  }, [lastSignals]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Home</Text>
        </Pressable>

        <Text style={styles.title}>Recovery</Text>
        <Text style={styles.sub}>What the Recovery agent is reading right now.</Text>

        <View style={styles.scoreCard}>
          <Text style={styles.score}>{score}</Text>
          <Text style={styles.scoreLabel}>Recovery score · {level}</Text>
          <View style={styles.scoreTrack}>
            <View style={[styles.scoreFill, { width: `${score}%` }]} />
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Sleep</Text>
            <Text style={styles.metricValue}>{sleepHours}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>HRV</Text>
            <Text style={styles.metricValue}>
              38ms <Text style={styles.metricDelta}>-18%</Text>
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Resting HR</Text>
            <Text style={styles.metricValue}>64bpm</Text>
          </View>
        </View>

        <Text style={styles.chartTitle}>7-day HRV trend</Text>
        <View style={styles.chartCard}>
          <View style={styles.bars}>
            {HRV_BARS.map((h, i) => (
              <View key={i} style={styles.barCol}>
                <View
                  style={[
                    styles.bar,
                    { height: 72 * h },
                    i === 6 ? styles.barToday : styles.barMuted,
                  ]}
                />
                <Text style={styles.barDay}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.insightCard, { backgroundColor: UI.agentBg.recovery, borderColor: UI.agents.recovery }]}>
          <Text style={[styles.insightLabel, { color: UI.agents.recovery }]}>RECOVERY</Text>
          <Text style={styles.insightBody}>{insight()}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: UI.bg },
  container: { padding: 20, paddingBottom: 40, gap: 14 },
  back: { alignSelf: 'flex-start' },
  backText: { color: UI.inkMuted, fontSize: 15, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', color: UI.ink, letterSpacing: -0.5 },
  sub: { color: UI.inkMuted, fontSize: 15, lineHeight: 21 },
  scoreCard: {
    backgroundColor: UI.card,
    borderRadius: UI.radius.lg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI.border,
    gap: 8,
  },
  score: { fontSize: 56, fontWeight: '800', color: UI.agents.recovery },
  scoreLabel: { color: UI.inkMuted, fontSize: 14 },
  scoreTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: UI.border,
    overflow: 'hidden',
    marginTop: 4,
  },
  scoreFill: { height: '100%', backgroundColor: UI.agents.recovery, borderRadius: 4 },
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
  metricValue: { color: UI.ink, fontWeight: '800', fontSize: 16 },
  metricDelta: { color: '#D4845C', fontSize: 13, fontWeight: '700' },
  chartTitle: { color: UI.ink, fontWeight: '800', fontSize: 16 },
  chartCard: {
    backgroundColor: UI.card,
    borderRadius: UI.radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: UI.border,
  },
  bars: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 90 },
  barCol: { alignItems: 'center', gap: 8, flex: 1 },
  bar: { width: 22, borderRadius: 5 },
  barMuted: { backgroundColor: UI.borderStrong },
  barToday: { backgroundColor: UI.agents.recovery },
  barDay: { color: UI.inkDim, fontSize: 11, fontWeight: '600' },
  insightCard: {
    borderRadius: UI.radius.lg,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  insightLabel: { fontWeight: '800', fontSize: 11, letterSpacing: 1.2 },
  insightBody: { color: UI.ink, lineHeight: 22, fontSize: 15 },
});
