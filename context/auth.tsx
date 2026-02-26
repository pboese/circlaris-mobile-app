import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const CUSTOMER_KEY = 'auth_customer';

export interface Customer {
  name: string;
  user: string;
  logo: string;
  favicon: string;
}

interface AuthContextType {
  token: string | null;
  customer: Customer | null;
  isLoading: boolean;
  signIn: (token: string, customer: Customer) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(CUSTOMER_KEY),
    ]).then(([storedToken, storedCustomer]) => {
      setToken(storedToken);
      setCustomer(storedCustomer ? JSON.parse(storedCustomer) : null);
    }).finally(() => setIsLoading(false));
  }, []);

  const signIn = async (newToken: string, newCustomer: Customer) => {
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    await SecureStore.setItemAsync(CUSTOMER_KEY, JSON.stringify(newCustomer));
    setToken(newToken);
    setCustomer(newCustomer);
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(CUSTOMER_KEY);
    setToken(null);
    setCustomer(null);
  };

  return (
    <AuthContext.Provider value={{ token, customer, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
