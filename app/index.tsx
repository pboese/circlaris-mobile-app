import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useAuth } from '../context/auth';
import { Customer } from '../context/auth';

const API_ENVIRONMENTS = [
  { label: 'Production', url: 'https://app.circlaris.com/login' },
  { label: 'Staging', url: 'https://im.dev.marginscale.com/login' },
] as const;

// Injected into the WebView before the page loads. Intercepts fetch, XHR, and
// localStorage writes to capture the auth token after login. Forwards it to the
// native app via postMessage — no changes needed on the web side.
const INJECTED_JS = `
(function() {
  if (window.__circlarisInjected) return;
  window.__circlarisInjected = true;

  function post(payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }

  function tryExtract(raw) {
    try {
      var data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!data) return;
      var token = data.token || data.access_token ||
                  (data.data && (data.data.token || data.data.access_token));
      if (token) {
        var customer = data.customer || (data.data && data.data.customer) || null;
        post({ token: token, customer: customer });
      }
    } catch(e) {}
  }

  // 1. Intercept fetch
  var origFetch = window.fetch;
  window.fetch = function() {
    return origFetch.apply(this, arguments).then(function(res) {
      res.clone().text().then(function(t) { tryExtract(t); }).catch(function(){});
      return res;
    });
  };

  // 2. Intercept XMLHttpRequest (covers axios and similar)
  var origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function() {
    var xhr = this;
    xhr.addEventListener('load', function() {
      try { tryExtract(xhr.responseText); } catch(e) {}
    });
    return origSend.apply(this, arguments);
  };

  // 3. Monitor localStorage for token writes
  try {
    var origSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function(key, value) {
      origSetItem(key, value);
      if (/token/i.test(key)) {
        post({ token: value, customer: null });
      }
    };
  } catch(e) {}
})();
true;
`;

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [apiEnv, setApiEnv] = useState<(typeof API_ENVIRONMENTS)[number]>(API_ENVIRONMENTS[0]);
  const [envOpen, setEnvOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        token?: string;
        customer?: Customer | null;
      };
      if (data.token) {
        const customer: Customer = data.customer ?? {
          name: '',
          user: '',
          logo: '',
          favicon: '',
        };
        signIn(data.token, customer);
        // NavigationGuard in _layout.tsx redirects to /dashboard
      }
    } catch {
      // malformed message, ignore
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.envWrapper}>
        <Pressable style={styles.envSelector} onPress={() => setEnvOpen((o) => !o)}>
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
                  onPress={() => {
                    setApiEnv(env);
                    setEnvOpen(false);
                    setLoading(true);
                  }}
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

      <View style={styles.webviewContainer}>
        <WebView
          key={apiEnv.url}
          source={{ uri: apiEnv.url }}
          onMessage={handleMessage}
          injectedJavaScriptBeforeContentLoaded={INJECTED_JS}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled
          style={styles.webview}
        />
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#1F4143" />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F8',
  },
  envWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F8',
    zIndex: 10,
  },
  envSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
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
  webviewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#F3F4F8',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F3F4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
