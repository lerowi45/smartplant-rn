
//LoginScreen.js
//allows users to log in or navigate to register

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getHistory } from '../utils/historyService';
import { syncLocalScansToCloud } from '../utils/cloudHistoryService';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const result = await login(email.trim().toLowerCase(), password);
      //merge local scans to cloud after login
      const localScans = await getHistory();
      if (localScans.length > 0) {
        await syncLocalScansToCloud(result.token, localScans);
      }
      navigation.replace('MainTabs');
    } catch (e) {
      Alert.alert('Login failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>🌿</Text>
            <Text style={styles.title}>SmartPlant AI</Text>
            <Text style={styles.subtitle}>Sign in to sync your scans</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#888"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>Sign In</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Footer links */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.link}>
                Don't have an account? <Text style={styles.linkBold}>Register</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.guestBtn}
              onPress={() => navigation.replace('MainTabs')}
            >
              <Text style={styles.guestText}>Continue as Guest</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0f2318',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 56,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4caf50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#aaa',
  },
  form: {
    marginBottom: 24,
  },
  label: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#1a3a2a',
    borderWidth: 1,
    borderColor: '#2e5c3a',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: '#fff',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#4caf50',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    gap: 16,
  },
  link: {
    color: '#aaa',
    fontSize: 14,
  },
  linkBold: {
    color: '#4caf50',
    fontWeight: '600',
  },
  guestBtn: {
    paddingVertical: 10,
  },
  guestText: {
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
