
//HistoryScreen.js
//shows cloud scans when logged in, local scans when guest

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getHistory, deleteScan, clearHistory } from '../utils/historyService';
import { getCloudScans, deleteCloudScan } from '../utils/cloudHistoryService';

export default function HistoryScreen({ navigation }) {
  const { token } = useAuth();
  const [scans, setScans]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isCloud = !!token;

  //load scans whenever tab comes into focus
  useFocusEffect(
    useCallback(() => {
      loadScans();
    }, [token])
  );

  const loadScans = async () => {
    try {
      setLoading(true);
      const data = isCloud
        ? await getCloudScans(token)
        : await getHistory();
      setScans(data);
    } catch (e) {
      console.error('Failed to load scans:', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadScans();
    setRefreshing(false);
  };

  const handleDelete = (scanId) => {
    Alert.alert('Delete Scan', 'Remove this scan from history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (isCloud) {
            await deleteCloudScan(token, scanId);
          } else {
            await deleteScan(scanId);
          }
          setScans(prev => prev.filter(s => s.id !== scanId));
        },
      },
    ]);
  };

  const handleClearAll = () => {
    if (isCloud) {
      Alert.alert('Clear All', 'To clear cloud history, delete scans one by one.');
      return;
    }
    Alert.alert('Clear All History', 'This will delete all your local scans. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          await clearHistory();
          setScans([]);
        },
      },
    ]);
  };

  //format a scan's disease name from either local or cloud format
  const getDiseaseName = (scan) =>
    scan.name || scan.disease || 'Unknown';

  const getCropType = (scan) =>
    scan.cropType || scan.crop_type || scan.crop || 'General';

  const getConfidence = (scan) =>
    scan.confidence != null ? `${Math.round(scan.confidence)}%` : '—';

  const getDate = (scan) => {
    const raw = scan.date || scan.timestamp;
    if (!raw) return '';
    return new Date(raw).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const isHealthy = (scan) => {
    const name = getDiseaseName(scan).toLowerCase();
    return name.includes('healthy');
  };

  const renderScan = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Result', { result: buildResultObj(item) })}
      activeOpacity={0.8}
    >
      <View style={styles.cardLeft}>
        <View style={[styles.dot, isHealthy(item) ? styles.dotGreen : styles.dotRed]} />
        <View style={styles.cardInfo}>
          <Text style={styles.disease} numberOfLines={1}>{getDiseaseName(item)}</Text>
          <Text style={styles.meta}>
            {getCropType(item)} · {getConfidence(item)} · {getDate(item)}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDelete(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.deleteIcon}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  //build a result object compatible with ResultScreen
  const buildResultObj = (scan) => ({
    success:     true,
    name:        getDiseaseName(scan),
    crop:        getCropType(scan),
    confidence:  scan.confidence,
    description: scan.description || '',
    symptoms:    scan.symptoms    || [],
    treatment:   scan.treatment   || [],
    prevention:  scan.prevention  || [],
  });

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Scan History</Text>
          <Text style={styles.subtitle}>
            {isCloud ? '☁️ Cloud synced' : '📱 Local storage'}
          </Text>
        </View>
        {scans.length > 0 && !isCloud && (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4caf50" />
        </View>
      ) : scans.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No scans yet</Text>
          <Text style={styles.emptySubtitle}>
            Scan a plant leaf to see your history here
          </Text>
        </View>
      ) : (
        <FlatList
          data={scans}
          keyExtractor={item => item.id?.toString()}
          renderItem={renderScan}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4caf50"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0f2318',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a3a2a',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    color: '#4caf50',
    marginTop: 2,
  },
  clearText: {
    color: '#e74c3c',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    padding: 16,
    gap: 10,
  },
  card: {
    backgroundColor: '#1a3a2a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotGreen: { backgroundColor: '#4caf50' },
  dotRed:   { backgroundColor: '#e74c3c' },
  cardInfo: {
    flex: 1,
  },
  disease: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  meta: {
    color: '#888',
    fontSize: 12,
  },
  deleteBtn: {
    padding: 4,
    marginLeft: 8,
  },
  deleteIcon: {
    color: '#666',
    fontSize: 14,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
});
