import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../../app/index';

const mockSignIn = jest.fn();

jest.mock('../../context/auth', () => ({
  useAuth: () => ({ signIn: mockSignIn }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSegments: () => [],
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://im.dev.marginscale.com/mobile-api';
  });

  it('renders email input, password input, and sign in button', () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    expect(getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(getByPlaceholderText('••••••••')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('renders welcome heading', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Welcome back')).toBeTruthy();
  });

  it('shows validation error when both fields are empty', async () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Sign In'));
    await waitFor(() => {
      expect(getByText('Please enter your email and password.')).toBeTruthy();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('shows validation error when password is empty', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.press(getByText('Sign In'));
    await waitFor(() => {
      expect(getByText('Please enter your email and password.')).toBeTruthy();
    });
  });

  it('calls signIn with token and customer on successful login', async () => {
    const mockCustomer = { name: 'Acme', user: 'Alice', logo: '', favicon: '' };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'test-token', customer: mockCustomer }),
    });

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'alice@example.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'secret123');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test-token', mockCustomer);
    });
  });

  it('resolves token from access_token field as fallback', async () => {
    const mockCustomer = { name: 'Acme', user: 'Alice', logo: '', favicon: '' };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'fallback-token', customer: mockCustomer }),
    });

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'alice@example.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'secret123');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('fallback-token', mockCustomer);
    });
  });

  it('shows server error message on failed login', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Invalid email or password' }),
    });

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'bad@example.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'wrongpass');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByText('Invalid email or password')).toBeTruthy();
    });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('shows fallback error message when server response has no message', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByText('Login failed (500).')).toBeTruthy();
    });
  });

  it('shows network error when fetch throws', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network failure'));

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(
        getByText('Unable to connect. Please check your internet connection.'),
      ).toBeTruthy();
    });
  });

  it('sends a POST request to the /login endpoint with credentials', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ token: 't', customer: { name: '', user: '', logo: '', favicon: '' } }),
    });

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'user@example.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'pass');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalled());

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/login$/);
    expect(options).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', password: 'pass' }),
    });
  });
});
