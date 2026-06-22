import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image,
  TouchableOpacity, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { router } from 'expo-router';
import { getHistory, deleteScan, clearHistory } from '../utils/historyService';
import { COLORS, SPACING, RADIUS, SHADOW } from '../utils/theme';

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);

  // Reload history every time screen is focused
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    const data = await getHistory();
    setHistory(data);
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Scan',
      'Are you sure you want to delete this scan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteScan(id);
            loadHistory();
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all scans?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearHistory();
            setHistory([]);
          },
        },
      ]
    );
  };

  const handleViewScan = (scan) => {
    router.push({
      pathname: '/result',
      params: {
        result: JSON.stringify({ ...scan, success: true }),
        imageUri: scan.imageUri,
      },
    });
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const renderItem = ({ item }) => {
    const isHealthy = item.disease_key === 'Healthy' || item.disease_key?.includes('healthy');
    const isUncertain = item.disease_key === 'Uncertain';

    const badgeColor = isHealthy ? COLORS.successLight : isUncertain ? '#fff8e8' : COLORS.dangerLight;
    const badgeText = isHealthy ? COLORS.success : isUncertain ? COLORS.warning : COLORS.danger;
    const badgeLabel = isHealthy ? '✅ Healthy' : isUncertain ? '🔍 Uncertain' : '⚠️ Disease';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleViewScan(item)}
        activeOpacity={0.8}
      >
        {/* Image */}
        <Image source={{ uri: item.imageUri }} style={styles.cardImage} />

        {/* Content */}
        <View style={styles.cardContent}>
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={[styles.badgeText, { color: badgeText }]}>{badgeLabel}</Text>
          </View>
          <Text style={styles.diseaseName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cropName}>{item.crop}</Text>
          <Text style={styles.confidence}>Confidence: {item.confidence}%</Text>
          <Text style={styles.date}>{formatDate(item.date)}</Text>
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item.id)}
        >
          <Text style={styles.deleteBtnText}>🗑️</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.greenDeep} />

      {/* Header */}
      <LinearGradient colors={[COLORS.greenDeep, COLORS.greenMid]} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan History</Text>
        <Text style={styles.headerSub}>{history.length} scan{history.length !== 1 ? 's' : ''} saved</Text>
        {history.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClearAll}>
            <Text style={styles.clearBtnText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* List */}
      {history.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🌿</Text>
          <Text style={styles.emptyTitle}>No scans yet</Text>
          <Text style={styles.emptySub}>Your scan history will appear here after you analyse a plant.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },

  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  backBtn: {
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  backBtnText: { color: COLORS.greenPale, fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: COLORS.white },
  headerSub: { fontSize: 13, color: COLORS.greenPale, opacity: 0.8, marginTop: 2 },
  clearBtn: {
    marginTop: SPACING.sm,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  clearBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },

  list: { padding: SPACING.lg },

  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOW.card,
  },
  cardImage: { width: 90, height: 90 },
  cardContent: { flex: 1, padding: SPACING.md },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.xs,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  diseaseName: { fontSize: 14, fontWeight: '800', color: COLORS.textDark, marginBottom: 2 },
  cropName: { fontSize: 12, color: COLORS.textSoft, marginBottom: 2 },
  confidence: { fontSize: 12, color: COLORS.textSoft, marginBottom: 2 },
  date: { fontSize: 11, color: COLORS.textSoft, opacity: 0.7 },

  deleteBtn: {
    padding: SPACING.sm,
    justifyContent: 'center',
  },
  deleteBtnText: { fontSize: 18 },

  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl,
  },
  emptyIcon: { fontSize: 60, marginBottom: SPACING.md },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textDark, marginBottom: SPACING.sm },
  emptySub: { fontSize: 14, color: COLORS.textSoft, textAlign: 'center', lineHeight: 22 },
});