import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthArtwork } from '../components/AuthArtwork';
import type { AuthStackParamList } from './AuthScreen';
import { loginWithEmail } from '../services/auth';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;

export function SignInScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function signIn() {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await loginWithEmail(email.trim().toLowerCase(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.flex}>
      <AuthArtwork compact variant="signIn" />
      <SafeAreaView style={styles.flex}>
        <Pressable style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={8}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card}>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.sub}>Log in to continue your coaching plan.</Text>

              <View style={styles.switcher}>
                <View style={styles.switchActive}>
                  <Text style={styles.switchActiveText}>Log in</Text>
                </View>
                <Pressable style={styles.switchItem} onPress={() => navigation.replace('Register')}>
                  <Text style={styles.switchText}>Sign up</Text>
                </Pressable>
              </View>

              <View style={styles.form}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  placeholderTextColor="#B2AAB6"
                  value={email}
                  onChangeText={setEmail}
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  autoCapitalize="none"
                  autoComplete="password"
                  secureTextEntry
                  placeholder="Enter your password"
                  placeholderTextColor="#B2AAB6"
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={signIn}
                />
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable style={styles.primary} onPress={signIn} disabled={busy}>
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryText}>Log in</Text>
                )}
              </Pressable>

              <Pressable onPress={() => navigation.replace('Register')}>
                <Text style={styles.link}>
                  Don&apos;t have an account? <Text style={styles.linkAccent}>Sign up</Text>
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingTop: 190,
  },
  back: {
    position: 'absolute',
    zIndex: 2,
    top: 14,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: '#352E3A', fontSize: 38, lineHeight: 40, marginTop: -4 },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 28,
    minHeight: 540,
  },
  title: { color: '#211D28', fontSize: 28, fontWeight: '800', textAlign: 'center' },
  sub: { color: '#817886', textAlign: 'center', marginTop: 8, marginBottom: 22 },
  switcher: {
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E6DEE8',
    flexDirection: 'row',
    padding: 3,
    marginBottom: 18,
  },
  switchActive: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: '#B68AE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchActiveText: { color: '#FFFFFF', fontWeight: '700' },
  switchItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  switchText: { color: '#A099A4', fontWeight: '600' },
  form: { gap: 7 },
  label: { color: '#4C4550', fontWeight: '600', marginTop: 7 },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E6DEE8',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#2C2630',
    fontSize: 16,
  },
  primary: {
    minHeight: 52,
    backgroundColor: '#B68AE7',
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  primaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  link: { color: '#817886', textAlign: 'center', marginTop: 22 },
  linkAccent: { color: '#9A72C7', fontWeight: '700', textDecorationLine: 'underline' },
  error: { color: '#C94B68', marginTop: 10 },
});
