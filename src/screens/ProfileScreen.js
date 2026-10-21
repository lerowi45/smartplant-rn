
//ProfileScreen.js
//shows user info and lets them log out
//if not logged in, prompts to sign in or register

import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getCloudScans } from '../utils/cloudHistoryService';
import { getHistory } from '../utils/historyService';

export default function ProfileScreen({ navigation }) {
  const { user, token, logout } = useAuth();
  const [scanCount, setScanCount]   = useState(null);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    loadScanCount();
  }, [token]);

  const loadScanCount = async () => {
    try {
      if (token) {
        const scans = await getCloudScans(token);
        setScanCount(scans.length);
      } else {
        const scans = await getHistory();
        setScanCount(scans.length);
      }
    } catch {
      setScanCount(null);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? Your scans are saved in the cloud.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            await logout();
            setLoading(false);
          },
        },
      ]
    );
  };

  //guest view
  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Text style={styles.avatarGuest}>👤</Text>
            <Text style={styles.guestTitle}>Guest Mode</Text>
            <Text style={styles.guestSubtitle}>
              Sign in to sync your scans across devices and keep them safe in the cloud.
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>📱</Text>
            <Text style={styles.infoText}>
              {scanCount !== null ? `${scanCount} scan${scanCount !== 1 ? 's' : ''} saved locally` : 'Loading scans...'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.primaryBtnText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.secondaryBtnText}>Create Account</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  //logged-in view
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Avatar + name */}
        <View style={styles.header}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>
              {user.email.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.email}>{user.email}</Text>
          <Text style={styles.badge}>✓ Cloud Sync Active</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {scanCount !== null ? scanCount : '—'}
            </Text>
            <Text style={styles.statLabel}>Total Scans</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, loading && { opacity: 0.6 }]}
          onPress={handleLogout}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.logoutText}>Sign Out</Text>
          }
        </TouchableOpacity>
      </ScrollView>
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
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarLetter: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  avatarGuest: {
    fontSize: 64,
    marginBottom: 12,
  },
  email: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  badge: {
    fontSize: 13,
    color: '#4caf50',
    backgroundColor: '#1a3a2a',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  guestSubtitle: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a3a2a',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 32,
    width: '100%',
    gap: 12,
  },
  infoIcon: {
    fontSize: 22,
  },
  infoText: {
    color: '#ccc',
    fontSize: 15,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
    width: '100%',
    justifyContent: 'center',
  },
  statCard: {
    backgroundColor: '#1a3a2a',
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 32,
    alignItems: 'center',
    minWidth: 120,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4caf50',
  },
  statLabel: {
    fontSize: 13,
    color: '#aaa',
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: '#4caf50',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#4caf50',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    width: '100%',
  },
  secondaryBtnText: {
    color: '#4caf50',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutBtn: {
    backgroundColor: '#c0392b',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    width: '100%',
    marginTop: 'auto',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
