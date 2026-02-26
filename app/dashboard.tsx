import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '../context/auth';

const FIGURES_URL = 'https://im.dev.marginscale.com/mobile-api/figures';

function firstOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function toApiDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function toDisplayDate(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function buildMarkedDates(
  start: string | null,
  end: string | null,
): Record<string, object> {
  if (!start) return {};
  if (!end) {
    return {
      [start]: { startingDay: true, endingDay: true, color: '#1F4143', textColor: '#fff' },
    };
  }
  const marks: Record<string, object> = {};
  const cur = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  while (cur <= last) {
    const key = cur.toISOString().split('T')[0];
    marks[key] = {
      color: '#1F4143',
      textColor: '#fff',
      startingDay: key === start,
      endingDay: key === end,
    };
    cur.setDate(cur.getDate() + 1);
  }
  return marks;
}

interface Figures {
  netSales: number;
  profit: number;
  profitMargin: number;
  purchaseTotalArticles: number;
  averageSellingPriceArticles: number;
  serviceCost: number;
  purchases: number;
  sales: number;
  live: number;
  reserved: number;
}

function formatEur(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function formatPercent(value: number): string {
  return (
    new Intl.NumberFormat('de-DE', {
      style: 'decimal',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value) + ' %'
  );
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('de-DE').format(value);
}

function FigureCard({
  title,
  value,
  format = 'eur',
  compact = false,
}: {
  title: string;
  value: number;
  format?: 'eur' | 'percent' | 'count';
  compact?: boolean;
}) {
  const formatted =
    format === 'percent'
      ? formatPercent(value)
      : format === 'count'
        ? formatCount(value)
        : formatEur(value);

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={[styles.cardValue, compact && styles.cardValueCompact]}>
        {formatted}
      </Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { token, customer, signOut } = useAuth();
  const [figures, setFigures] = useState<Figures | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [loggingOut, setLoggingOut] = React.useState(false);

  const [startDate, setStartDate] = useState<Date>(firstOfMonth);
  const [endDate, setEndDate] = useState<Date>(today);
  const [rangeModalOpen, setRangeModalOpen] = useState(false);
  const [picking, setPicking] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  });

  useEffect(() => {
    setFetching(true);
    setFetchError(null);
    const url = `${FIGURES_URL}?start=${toApiDate(startDate)}&end=${toApiDate(endDate)}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error(`Server error (${res.status})`);
        return res.json();
      })
      .then((data) => setFigures(data))
      .catch((err) => setFetchError(err.message ?? 'Failed to load figures.'))
      .finally(() => setFetching(false));
  }, [startDate, endDate]);

  function openRangeModal() {
    setPicking({ start: toApiDate(startDate), end: toApiDate(endDate) });
    setRangeModalOpen(true);
  }

  function handleDayPress(day: { dateString: string }) {
    const { start, end } = picking;
    if (!start || (start && end)) {
      setPicking({ start: day.dateString, end: null });
    } else {
      if (day.dateString >= start) {
        setPicking({ start, end: day.dateString });
      } else {
        setPicking({ start: day.dateString, end: null });
      }
    }
  }

  function applyRange() {
    if (picking.start && picking.end) {
      setStartDate(new Date(picking.start + 'T00:00:00'));
      setEndDate(new Date(picking.end + 'T00:00:00'));
    }
    setRangeModalOpen(false);
  }

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

      {/* Range picker modal */}
      <Modal visible={rangeModalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismiss} onPress={() => setRangeModalOpen(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setRangeModalOpen(false)}>
                <Text style={styles.modalCancel}>Abbrechen</Text>
              </Pressable>
              <Text style={styles.modalTitle}>Zeitraum wählen</Text>
              <Pressable onPress={applyRange} disabled={!picking.start || !picking.end}>
                <Text style={[styles.modalApply, (!picking.start || !picking.end) && styles.modalApplyDisabled]}>
                  Anwenden
                </Text>
              </Pressable>
            </View>
            {picking.start && !picking.end ? (
              <Text style={styles.modalHint}>Enddatum auswählen</Text>
            ) : !picking.start ? (
              <Text style={styles.modalHint}>Startdatum auswählen</Text>
            ) : null}
            <Calendar
              current={picking.start ?? toApiDate(startDate)}
              markingType="period"
              markedDates={buildMarkedDates(picking.start, picking.end)}
              onDayPress={handleDayPress}
              maxDate={toApiDate(today())}
              enableSwipeMonths
              theme={{
                calendarBackground: '#fff',
                todayTextColor: '#1F4143',
                dayTextColor: '#111827',
                textDisabledColor: '#D1D5DB',
                arrowColor: '#1F4143',
                monthTextColor: '#111827',
                textMonthFontWeight: '700',
                textMonthFontSize: 16,
                textDayFontSize: 14,
                textDayHeaderFontSize: 12,
              }}
            />
          </View>
        </View>
      </Modal>

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

            {/* Date range selector */}
            <Pressable
              style={({ pressed }) => [styles.rangeBar, pressed && styles.rangeBarPressed]}
              onPress={openRangeModal}
            >
              <Text style={styles.rangeText}>
                {toDisplayDate(startDate)} – {toDisplayDate(endDate)}
              </Text>
              <Text style={styles.rangeChevron}>›</Text>
            </Pressable>

            <View style={styles.cards}>
              <FigureCard title="Netto Umsatz" value={figures.netSales} />
              <FigureCard title="Rohertrag" value={figures.profit} />
              <FigureCard title="Rohertragsmarge" value={figures.profitMargin} format="percent" />
              <FigureCard title="Angekaufwert Artikel" value={figures.purchaseTotalArticles} />
              <FigureCard title="Ø Verkaufspreis Artikel" value={figures.averageSellingPriceArticles} />
              <FigureCard title="Servicekosten" value={figures.serviceCost} />
              <View style={styles.cardRow}>
                <FigureCard title="Ankäufe" value={figures.purchases} format="count" compact />
                <FigureCard title="Verkäufe" value={figures.sales} format="count" compact />
              </View>
              <View style={styles.cardRow}>
                <FigureCard title="Live gegangen" value={figures.live} format="count" compact />
                <FigureCard title="Reserviert" value={figures.reserved} format="count" compact />
              </View>
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
    marginBottom: 16,
  },
  rangeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  rangeBarPressed: {
    opacity: 0.7,
  },
  rangeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F4143',
  },
  rangeChevron: {
    fontSize: 20,
    color: '#6B7280',
    lineHeight: 22,
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalDismiss: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  modalCancel: {
    fontSize: 15,
    color: '#6B7280',
  },
  modalApply: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F4143',
  },
  modalApplyDisabled: {
    color: '#D1D5DB',
  },
  modalHint: {
    textAlign: 'center',
    fontSize: 13,
    color: '#6B7280',
    paddingTop: 10,
    paddingBottom: 2,
  },
  // Cards
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
  cardCompact: {
    flex: 1,
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
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
  cardValueCompact: {
    fontSize: 24,
  },
});
