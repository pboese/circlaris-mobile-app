import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/auth';

function NavigationGuard() {
  const { token, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const onDashboard = segments[0] === 'dashboard';

    if (token && !onDashboard) {
      router.replace('/dashboard');
    } else if (!token && onDashboard) {
      router.replace('/');
    }
  }, [token, isLoading, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NavigationGuard />
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="dark" />
    </AuthProvider>
  );
}
