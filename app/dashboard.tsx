import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/auth';

const FIGURES_URL = 'https://im.dev.marginscale.com/mobile-api/figures';

interface Figures {
  netSales: number;
  profit: number;
}

function formatEur(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function FigureCard({ title, value }: { title: string; value: number }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue}>{formatEur(value)}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { token, customer, signOut } = useAuth();
  const [figures, setFigures] = useState<Figures | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [loggingOut, setLoggingOut] = React.useState(false);

  useEffect(() => {
    fetch(FIGURES_URL, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Server error (${res.status})`);
        return res.json();
      })
      .then((data) => setFigures(data))
      .catch((err) => setFetchError(err.message ?? 'Failed to load figures.'))
      .finally(() => setFetching(false));
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        {customer?.logo ? (
          <Image
            source={{ uri: customer.logo }}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        ) : null}
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            (pressed || loggingOut) && styles.logoutPressed,
          ]}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color="#1F4143" />
          ) : (
            <Text style={styles.logoutText}>Log Out</Text>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {fetching ? (
          <ActivityIndicator size="large" color="#1F4143" style={styles.loader} />
        ) : fetchError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{fetchError}</Text>
          </View>
        ) : figures ? (
          <>
            {customer?.user ? (
              <Text style={styles.greeting}>Hello, {customer.user}</Text>
            ) : null}
            {customer?.name ? (
              <Text style={styles.customerName}>{customer.name}</Text>
            ) : null}
            <View style={styles.cards}>
              <FigureCard title="Netto Umsatz" value={figures.netSales} />
              <FigureCard title="Rohertrag" value={figures.profit} />
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLogo: {
    width: 120,
    height: 44,
  },
  logoutButton: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#E8EEEE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  logoutPressed: {
    opacity: 0.7,
  },
  logoutText: {
    color: '#1F4143',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  loader: {
    marginTop: 48,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    lineHeight: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  cards: {
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
});
