import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { saveUserProfile } from '../services/auth';
import { generatePlan } from '../services/coachApi';
import { useAppStore } from '../store/appStore';
import { UI } from '../theme/ui';
import type { ExperienceLevel, UserProfile } from '../types/agent';

const MISSIONS: { label: string; goal: string }[] = [
  { label: 'Build strength', goal: 'strength' },
  { label: 'Lose fat', goal: 'fat loss' },
  { label: 'Marathon training', goal: 'endurance' },
  { label: 'General health', goal: 'consistency' },
  { label: 'Return from injury', goal: 'mobility' },
];

const EQUIP_OPTIONS = ['bodyweight', 'dumbbells', 'barbell', 'bands', 'pull-up bar', 'gym'];
const DAY_OPTIONS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const STEP_TITLES = [
  { title: "What's the mission?", sub: 'The Planner agent builds your first cycle around this.' },
  { title: 'What do you have?', sub: 'Equipment shapes every session the Planner writes.' },
  { title: 'When can you train?', sub: 'Pick the days you can realistically show up.' },
  { title: 'Anything we should know?', sub: 'Experience and injuries help Recovery and Adaptation.' },
];

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function OnboardingScreen() {
  const profile = useAppStore((s) => s.profile);
  const setPlan = useAppStore((s) => s.setPlan);
  const [step, setStep] = useState(0);
  const [mission, setMission] = useState(profile?.goals?.[0] ?? 'strength');
  const [equipment, setEquipment] = useState(profile?.equipment ?? ['bodyweight']);
  const [days, setDays] = useState(profile?.available_days ?? ['mon', 'wed', 'fri']);
  const [injuries, setInjuries] = useState(profile?.injuries?.join(', ') ?? '');
  const [level, setLevel] = useState<ExperienceLevel>(profile?.experience_level ?? 'beginner');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function finish() {
    if (!profile) return;
    setBusy(true);
    setError('');
    try {
      const next: UserProfile = {
        ...profile,
        goals: [mission],
        equipment,
        available_days: days,
        injuries: injuries
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        experience_level: level,
        onboarding_complete: true,
      };
      await saveUserProfile(next);
      const plan = await generatePlan(next.user_id, next, true);
      setPlan(plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Onboarding failed — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (step < 3) setStep(step + 1);
    else void finish();
  }

  const canContinue =
    step === 0 ? !!mission :
    step === 1 ? equipment.length > 0 :
    step === 2 ? days.length > 0 :
    true;

  const { title, sub } = STEP_TITLES[step];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <Text style={styles.eyebrow}>SETUP · STEP {step + 1} OF 4</Text>
        <View style={styles.progressRow}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.progressSeg, i <= step && styles.progressSegActive]} />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{sub}</Text>

        {step === 0 ? (
          <View style={styles.chipWrap}>
            {MISSIONS.map((m) => (
              <Chip
                key={m.goal}
                label={m.label}
                active={mission === m.goal}
                onPress={() => setMission(m.goal)}
              />
            ))}
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.chipWrap}>
            {EQUIP_OPTIONS.map((g) => (
              <Chip
                key={g}
                label={g.replace(/\b\w/g, (c) => c.toUpperCase())}
                active={equipment.includes(g)}
                onPress={() => setEquipment(toggle(equipment, g))}
              />
            ))}
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.chipWrap}>
            {DAY_OPTIONS.map((g) => (
              <Chip
                key={g}
                label={g.toUpperCase()}
                active={days.includes(g)}
                onPress={() => setDays(toggle(days, g))}
              />
            ))}
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.step4}>
            <Text style={styles.fieldLabel}>Experience level</Text>
            <View style={styles.chipWrap}>
              {(['beginner', 'intermediate', 'advanced'] as ExperienceLevel[]).map((g) => (
                <Chip
                  key={g}
                  label={g.replace(/\b\w/g, (c) => c.toUpperCase())}
                  active={level === g}
                  onPress={() => setLevel(g)}
                />
              ))}
            </View>
            <Text style={styles.fieldLabel}>Injuries (comma-separated)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. left knee"
              placeholderTextColor={UI.inkDim}
              value={injuries}
              onChangeText={setInjuries}
            />
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 ? (
          <Pressable style={styles.backLink} onPress={() => setStep(step - 1)}>
            <Text style={styles.backLinkText}>Back</Text>
          </Pressable>
        ) : (
          <View />
        )}
        <Pressable
          style={[styles.continueBtn, !canContinue && styles.continueDisabled]}
          onPress={next}
          disabled={!canContinue || busy}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.continueText}>{step === 3 ? 'Finish' : 'Continue'}</Text>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: UI.bg },
  top: { paddingHorizontal: 24, paddingTop: 12, gap: 12 },
  eyebrow: { color: UI.inkDim, fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  progressRow: { flexDirection: 'row', gap: 6 },
  progressSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: UI.borderStrong },
  progressSegActive: { backgroundColor: UI.accent },
  body: { padding: 24, paddingBottom: 120, gap: 12 },
  title: { fontSize: 32, fontWeight: '800', color: UI.ink, letterSpacing: -0.5 },
  sub: { color: UI.inkMuted, fontSize: 16, lineHeight: 22, marginBottom: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    borderWidth: 1,
    borderColor: UI.borderStrong,
    borderRadius: UI.radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: UI.card,
  },
  chipActive: { backgroundColor: UI.black, borderColor: UI.black },
  chipText: { color: UI.inkMuted, fontSize: 15, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },
  step4: { gap: 12 },
  fieldLabel: { color: UI.ink, fontWeight: '700', fontSize: 14 },
  input: {
    backgroundColor: UI.card,
    borderColor: UI.borderStrong,
    borderWidth: 1,
    borderRadius: UI.radius.md,
    padding: 16,
    color: UI.ink,
    fontSize: 16,
  },
  error: { color: '#C44', marginTop: 8 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
    backgroundColor: UI.bg,
  },
  backLink: { padding: 12 },
  backLinkText: { color: UI.inkMuted, fontWeight: '600', fontSize: 15 },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: UI.accent,
    borderRadius: UI.radius.pill,
    paddingHorizontal: 22,
    paddingVertical: 14,
    minWidth: 140,
    justifyContent: 'center',
  },
  continueDisabled: { opacity: 0.45 },
  continueText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});
