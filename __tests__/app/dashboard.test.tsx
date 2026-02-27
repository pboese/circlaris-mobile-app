import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import DashboardScreen from '../../app/dashboard';

const mockSignOut = jest.fn();

jest.mock('../../context/auth', () => ({
  useAuth: () => ({
    token: 'test-token',
    customer: { name: 'Acme GmbH', user: 'Bob', logo: '', favicon: '' },
    signOut: mockSignOut,
  }),
}));

// Calendar uses native views — mock it to a no-op in tests
jest.mock('react-native-calendars', () => ({
  Calendar: () => null,
}));

const mockFigures = {
  netSales: 12345.67,
  profit: 2345.67,
  profitMargin: 19.0,
  purchaseTotalArticles: 1000.0,
  averageSellingPriceArticles: 150.0,
  serviceCost: 500.0,
  purchases: 10,
  sales: 8,
  live: 5,
  reserved: 3,
};

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://im.dev.marginscale.com/mobile-api';
  });

  it('renders all figure card titles after a successful fetch', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockFigures,
    });

    const { getByText } = render(<DashboardScreen />);

    await waitFor(() => {
      expect(getByText('Netto Umsatz')).toBeTruthy();
      expect(getByText('Rohertrag')).toBeTruthy();
      expect(getByText('Rohertragsmarge')).toBeTruthy();
      expect(getByText('Angekaufwert Artikel')).toBeTruthy();
      expect(getByText('Ø Verkaufspreis Artikel')).toBeTruthy();
      expect(getByText('Servicekosten')).toBeTruthy();
      expect(getByText('Ankäufe')).toBeTruthy();
      expect(getByText('Verkäufe')).toBeTruthy();
      expect(getByText('Live gegangen')).toBeTruthy();
      expect(getByText('Reserviert')).toBeTruthy();
    });
  });

  it('renders user greeting and customer name', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockFigures,
    });

    const { getByText } = render(<DashboardScreen />);

    await waitFor(() => {
      expect(getByText('Hello, Bob')).toBeTruthy();
      expect(getByText('Acme GmbH')).toBeTruthy();
    });
  });

  it('renders logout button', () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockFigures,
    });
    const { getByText } = render(<DashboardScreen />);
    expect(getByText('Log Out')).toBeTruthy();
  });

  it('calls signOut when logout button is pressed', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockFigures,
    });
    mockSignOut.mockResolvedValue(undefined);

    const { getByText } = render(<DashboardScreen />);
    fireEvent.press(getByText('Log Out'));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  it('shows server error message when fetch fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
    });

    const { getByText } = render(<DashboardScreen />);

    await waitFor(() => {
      expect(getByText('Server error (503)')).toBeTruthy();
    });
  });

  it('shows error message when fetch rejects', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Failed to load figures.'));

    const { getByText } = render(<DashboardScreen />);

    await waitFor(() => {
      expect(getByText('Failed to load figures.')).toBeTruthy();
    });
  });

  it('fetches figures with Bearer token and date range', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockFigures,
    });

    render(<DashboardScreen />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/figures\?/);
    expect(url).toMatch(/start=\d{4}-\d{2}-\d{2}/);
    expect(url).toMatch(/end=\d{4}-\d{2}-\d{2}/);
    expect(options.headers).toEqual({ Authorization: 'Bearer test-token' });
  });

  it('shows date range picker modal when range bar is pressed', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockFigures,
    });

    const { getByText } = render(<DashboardScreen />);
    await waitFor(() => expect(getByText('Netto Umsatz')).toBeTruthy());

    // Range bar contains the date range text — press it to open the modal
    const rangeBar = getByText(/–/);
    fireEvent.press(rangeBar);

    await waitFor(() => {
      expect(getByText('Zeitraum wählen')).toBeTruthy();
      expect(getByText('Abbrechen')).toBeTruthy();
      expect(getByText('Anwenden')).toBeTruthy();
    });
  });
});
