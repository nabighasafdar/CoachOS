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
import { registerWithEmail } from '../services/auth';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function register() {
    if (!name.trim() || !email.trim() || !password) {
      setError('Complete all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await registerWithEmail(email.trim().toLowerCase(), password, name.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create your account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.flex}>
      <AuthArtwork compact variant="register" />
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
              <Text style={styles.title}>Create account</Text>
              <Text style={styles.sub}>Start building a plan that adapts with you.</Text>

              <View style={styles.form}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  autoCapitalize="words"
                  autoComplete="name"
                  placeholder="Your name"
                  placeholderTextColor="#B2AAB6"
                  value={name}
                  onChangeText={setName}
                />

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
                  autoComplete="new-password"
                  secureTextEntry
                  placeholder="At least 6 characters"
                  placeholderTextColor="#B2AAB6"
                  value={password}
                  onChangeText={setPassword}
                />

                <Text style={styles.label}>Confirm password</Text>
                <TextInput
                  style={styles.input}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  secureTextEntry
                  placeholder="Re-enter your password"
                  placeholderTextColor="#B2AAB6"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onSubmitEditing={register}
                />
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable style={styles.primary} onPress={register} disabled={busy}>
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryText}>Sign up</Text>
                )}
              </Pressable>

              <Pressable onPress={() => navigation.replace('SignIn')}>
                <Text style={styles.link}>
                  Already have an account? <Text style={styles.linkAccent}>Log in</Text>
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
    paddingTop: 150,
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
    paddingTop: 28,
    paddingBottom: 28,
    minHeight: 650,
  },
  title: { color: '#211D28', fontSize: 28, fontWeight: '800', textAlign: 'center' },
  sub: { color: '#817886', textAlign: 'center', marginTop: 8, marginBottom: 16 },
  form: { gap: 5 },
  label: { color: '#4C4550', fontWeight: '600', marginTop: 5 },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E6DEE8',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#2C2630',
    fontSize: 15,
  },
  primary: {
    minHeight: 52,
    backgroundColor: '#B68AE7',
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  primaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  link: { color: '#817886', textAlign: 'center', marginTop: 20 },
  linkAccent: { color: '#9A72C7', fontWeight: '700', textDecorationLine: 'underline' },
  error: { color: '#C94B68', marginTop: 10 },
});
