import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider, useAuth, Customer } from '../../context/auth';

jest.mock('expo-secure-store');

const mockedGetItem = SecureStore.getItemAsync as jest.Mock;
const mockedSetItem = SecureStore.setItemAsync as jest.Mock;
const mockedDeleteItem = SecureStore.deleteItemAsync as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const mockCustomer: Customer = {
  name: 'Acme GmbH',
  user: 'Alice',
  logo: 'https://example.com/logo.png',
  favicon: 'https://example.com/favicon.ico',
};

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetItem.mockResolvedValue(null);
    mockedSetItem.mockResolvedValue(undefined);
    mockedDeleteItem.mockResolvedValue(undefined);
  });

  it('starts in loading state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('resolves to unauthenticated after load when no stored credentials', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.token).toBeNull();
    expect(result.current.customer).toBeNull();
  });

  it('restores persisted token and customer on mount', async () => {
    mockedGetItem
      .mockResolvedValueOnce('my-token')
      .mockResolvedValueOnce(JSON.stringify(mockCustomer));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.token).toBe('my-token');
    expect(result.current.customer).toEqual(mockCustomer);
  });

  it('signIn writes to SecureStore and updates state', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signIn('new-token', mockCustomer);
    });

    expect(result.current.token).toBe('new-token');
    expect(result.current.customer).toEqual(mockCustomer);
    expect(mockedSetItem).toHaveBeenCalledWith('auth_token', 'new-token');
    expect(mockedSetItem).toHaveBeenCalledWith(
      'auth_customer',
      JSON.stringify(mockCustomer),
    );
  });

  it('signOut deletes from SecureStore and clears state', async () => {
    mockedGetItem
      .mockResolvedValueOnce('existing-token')
      .mockResolvedValueOnce(JSON.stringify(mockCustomer));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.token).toBe('existing-token'));

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.token).toBeNull();
    expect(result.current.customer).toBeNull();
    expect(mockedDeleteItem).toHaveBeenCalledWith('auth_token');
    expect(mockedDeleteItem).toHaveBeenCalledWith('auth_customer');
  });

  it('useAuth throws when called outside AuthProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within AuthProvider',
    );
    consoleSpy.mockRestore();
  });
});
