/**
 * AuthErrorBoundary — last-resort UI for fatal auth errors.
 *
 * Wraps AuthProvider so that uncaught errors during auth bootstrap surface a
 * user-facing screen with retry/reset instead of a blank app. On web,
 * "Reset app" wipes localStorage and reloads (rescues from token corruption).
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

const isWeb = Platform.OS === 'web' || typeof window !== 'undefined';

export class AuthErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('AuthErrorBoundary caught:', error, info.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ error: null });
  };

  handleReset = (): void => {
    if (!isWeb || typeof window === 'undefined') return;
    try {
      window.localStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.handleRetry);
    }

    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Authentication System Error</Text>
          <Text style={styles.message}>
            Something went wrong while loading your session.
          </Text>
          <Text style={styles.detail}>{error.message}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
              <Text style={styles.buttonText}>Retry</Text>
            </TouchableOpacity>
            {isWeb && (
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={this.handleReset}
              >
                <Text style={styles.buttonText}>Reset app</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0F1115',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1A1E25',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2A2F3A',
  },
  title: {
    color: '#F0F0F0',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    color: '#9AA3B0',
    fontSize: 14,
    marginBottom: 12,
  },
  detail: {
    color: '#5A6270',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    backgroundColor: '#4F8EF7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#E74C3C',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
