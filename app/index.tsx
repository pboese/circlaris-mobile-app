import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/auth';
import Logo from '../assets/circlaris_logo_1F4143.svg';

const API_PREFIX = process.env.EXPO_PUBLIC_API_PREFIX ?? '/mobile-api';

const API_ENVIRONMENTS = [
  { label: 'Production', url: 'https://app.circlaris.com' },
  { label: 'Staging', url: 'https://im.dev.marginscale.com' },
] as const;

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);
  const [apiEnv, setApiEnv] = useState<(typeof API_ENVIRONMENTS)[number]>(API_ENVIRONMENTS[0]);
  const [envOpen, setEnvOpen] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    setError(null);
    setLoading(true);

    const loginUrl = `${apiEnv.url}${API_PREFIX}/login`;
    try {
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          data?.message || data?.error || `Login failed (${response.status}).`;
        setError(message);
        return;
      }

      const token: string =
        data?.token ?? data?.access_token ?? data?.data?.token ?? '';

      await signIn(token, data.customer);
      // NavigationGuard in _layout.tsx will redirect to /dashboard
    } catch {
      setError('Unable to connect. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Logo width={180} height={72} />

            <Text style={styles.heading}>Welcome back</Text>
            <Text style={styles.subheading}>Sign in to your account to continue</Text>

            <View style={styles.form}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(null); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  editable={!loading}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(null); }}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  editable={!loading}
                />
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  (pressed || loading) && styles.buttonPressed,
                ]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </Pressable>

              <View style={styles.envWrapper}>
                <Pressable
                  style={styles.envSelector}
                  onPress={() => setEnvOpen((o) => !o)}
                >
                  <Text style={styles.envSelectorLabel}>Environment</Text>
                  <Text style={styles.envSelectorValue}>{apiEnv.label}</Text>
                  <Text style={styles.envChevron}>{envOpen ? '▲' : '▼'}</Text>
                </Pressable>
                {envOpen && (
                  <View style={styles.envOptions}>
                    {API_ENVIRONMENTS.map((env) => {
                      const isActive = env.url === apiEnv.url;
                      return (
                        <Pressable
                          key={env.url}
                          style={[styles.envOption, isActive && styles.envOptionActive]}
                          onPress={() => { setApiEnv(env); setEnvOpen(false); }}
                        >
                          <Text style={[styles.envOptionText, isActive && styles.envOptionTextActive]}>
                            {env.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F8',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  logo: {
    marginBottom: 28,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  subheading: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    width: '100%',
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    color: '#111827',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#1F4143',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  envWrapper: {
    marginTop: 4,
  },
  envSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  envSelectorLabel: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  envSelectorValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  envChevron: {
    fontSize: 9,
    color: '#6B7280',
  },
  envOptions: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  envOption: {
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  envOptionActive: {
    backgroundColor: '#E8EEEE',
  },
  envOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  envOptionTextActive: {
    fontWeight: '600',
    color: '#1F4143',
  },
});
