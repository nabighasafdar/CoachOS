import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UI } from '../theme/ui';

const WEEK_BARS = [0.55, 0.62, 0.7, 0.45];

export function InsightsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Insights</Text>
        <Text style={styles.sub}>Patterns the Accountability agent has caught.</Text>

        <View style={[styles.patternCard, { backgroundColor: UI.agentBg.accountability, borderColor: UI.agents.accountability }]}>
          <Text style={[styles.patternLabel, { color: UI.agents.accountability }]}>Accountability</Text>
          <Text style={styles.patternBody}>
            Monday leg day has been skipped four weeks running — always the same day.
          </Text>
        </View>

        <View style={styles.fixCard}>
          <Text style={styles.fixTitle}>A specific fix, not a reminder</Text>
          <Text style={styles.fixBody}>
            Your calendar shows a standing Monday 6pm meeting that overlaps your usual session window.
            Moving leg day to Wednesday would clear it every week this quarter.
          </Text>
          <View style={styles.fixActions}>
            <Pressable style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Move to Wednesday</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Keep Monday</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Consistency, last 4 weeks</Text>
        <View style={styles.chartCard}>
          <View style={styles.bars}>
            {WEEK_BARS.map((h, i) => (
              <View key={i} style={styles.barCol}>
                <View
                  style={[
                    styles.bar,
                    { height: 80 * h },
                    i === 3 ? { backgroundColor: UI.agents.accountability } : { backgroundColor: UI.agents.nutrition },
                  ]}
                />
                <Text style={styles.barLabel}>W{i + 1}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Other patterns</Text>
        <View style={styles.otherCard}>
          <View style={styles.otherTop}>
            <View style={[styles.badge, { backgroundColor: UI.agentBg.nutrition }]}>
              <Text style={[styles.badgeText, { color: UI.agents.nutrition }]}>Nutrition</Text>
            </View>
            <Text style={styles.otherWhen}>This week</Text>
          </View>
          <Text style={styles.otherBody}>
            Protein consistently lowest on days you log lunch after 2pm — earlier lunch or a mid-morning snack closes the gap.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: UI.bg },
  container: { padding: 20, paddingBottom: 40, gap: 14 },
  title: { fontSize: 28, fontWeight: '800', color: UI.ink, letterSpacing: -0.5 },
  sub: { color: UI.inkMuted, fontSize: 15, lineHeight: 21 },
  patternCard: {
    borderRadius: UI.radius.lg,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  patternLabel: { fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
  patternBody: { color: UI.ink, fontSize: 17, fontWeight: '700', lineHeight: 24 },
  fixCard: {
    backgroundColor: UI.card,
    borderRadius: UI.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
    gap: 10,
  },
  fixTitle: { color: UI.ink, fontWeight: '800', fontSize: 16 },
  fixBody: { color: UI.inkMuted, lineHeight: 21, fontSize: 14 },
  fixActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  primaryBtn: {
    flex: 1,
    backgroundColor: UI.accent,
    borderRadius: UI.radius.pill,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  secondaryBtn: {
    flex: 1,
    backgroundColor: UI.card,
    borderRadius: UI.radius.pill,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI.borderStrong,
  },
  secondaryBtnText: { color: UI.inkMuted, fontWeight: '700', fontSize: 13 },
  sectionTitle: { color: UI.ink, fontWeight: '800', fontSize: 16, marginTop: 4 },
  chartCard: {
    backgroundColor: UI.card,
    borderRadius: UI.radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: UI.border,
  },
  bars: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100 },
  barCol: { alignItems: 'center', gap: 8, flex: 1 },
  bar: { width: 28, borderRadius: 6 },
  barLabel: { color: UI.inkDim, fontSize: 11, fontWeight: '600' },
  otherCard: {
    backgroundColor: UI.card,
    borderRadius: UI.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
    gap: 8,
  },
  otherTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { borderRadius: UI.radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontWeight: '800', fontSize: 12 },
  otherWhen: { color: UI.inkDim, fontSize: 12 },
  otherBody: { color: UI.inkMuted, lineHeight: 20, fontSize: 14 },
});
