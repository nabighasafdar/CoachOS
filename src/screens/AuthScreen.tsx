import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthArtwork } from '../components/AuthArtwork';
import { seedDemo } from '../services/coachApi';
import { useAppStore } from '../store/appStore';

export type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  Register: undefined;
};

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export function AuthScreen({ navigation }: Props) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const persistProfile = useAppStore((s) => s.persistProfile);
  const setAuth = useAppStore((s) => s.setAuth);
  const setPlan = useAppStore((s) => s.setPlan);

  async function loadDemo() {
    setBusy(true);
    setError('');
    try {
      const seeded = await seedDemo();
      await persistProfile(seeded.profile);
      setAuth(seeded.profile.user_id, 'local');
      setPlan(seeded.plan);
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message} — is the API running on localhost:8000?`
          : 'Demo seed failed',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <AuthArtwork />
      <SafeAreaView style={styles.safe}>
        <View style={styles.brandWrap}>
          <Text style={styles.brand}>CoachOS</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.hello}>Your personal coaching team is ready.</Text>
          <Text style={styles.sub}>
            Create an account or sign in to start building a plan that adapts with you.
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.primary} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.primaryText}>Create account</Text>
          </Pressable>

          <Pressable style={styles.secondary} onPress={() => navigation.navigate('SignIn')}>
            <Text style={styles.secondaryText}>Log in</Text>
          </Pressable>

          <Pressable style={styles.demo} onPress={loadDemo} disabled={busy}>
            {busy ? (
              <ActivityIndicator color="#8F79C8" />
            ) : (
              <Text style={styles.demoText}>Explore demo account</Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6DCE8',
  },
  safe: { flex: 1, justifyContent: 'space-between' },
  brandWrap: { alignItems: 'center', paddingTop: 18 },
  brand: {
    color: 'rgba(73,55,88,0.72)',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    paddingHorizontal: 28,
    paddingTop: 34,
    paddingBottom: 20,
    minHeight: '48%',
  },
  title: {
    color: '#211D28',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  hello: { color: '#554D5C', textAlign: 'center', fontWeight: '600', marginTop: 8 },
  sub: {
    color: '#817886',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 22,
  },
  primary: {
    backgroundColor: '#B68AE7',
    borderRadius: 28,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#AF78D9',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  primaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  secondary: {
    borderColor: '#D8CBDD',
    borderWidth: 1,
    borderRadius: 28,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaryText: { color: '#332B38', fontWeight: '700', fontSize: 16 },
  demo: { padding: 14, alignItems: 'center', minHeight: 44 },
  demoText: { color: '#8F79C8', fontWeight: '600', textDecorationLine: 'underline' },
  error: { color: '#C94B68', textAlign: 'center', marginBottom: 12 },
});
