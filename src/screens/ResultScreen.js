// src/screens/ResultScreen.js
import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView,
  TouchableOpacity, Animated, StatusBar, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS, SHADOW } from '../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Confidence bar component with animation
function ConfidenceBar({ confidence }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: confidence / 100,
      duration: 1000,
      delay: 300,
      useNativeDriver: false,
    }).start();
  }, [confidence]);

  const color = confidence >= 85
    ? COLORS.success
    : confidence >= 65
    ? COLORS.warning
    : COLORS.danger;

  return (
    <View style={confStyles.wrap}>
      <View style={confStyles.track}>
        <Animated.View
          style={[confStyles.fill, {
            width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            backgroundColor: color,
          }]}
        />
      </View>
      <Text style={[confStyles.pct, { color }]}>{confidence}%</Text>
    </View>
  );
}

const confStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: SPACING.xs },
  track: {
    flex: 1, height: 10, backgroundColor: COLORS.creamDark,
    borderRadius: RADIUS.full, overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: RADIUS.full },
  pct: { fontSize: 14, fontWeight: '800', minWidth: 45 },
});


// Info card component
function InfoCard({ icon, title, items, color = COLORS.greenDeep }) {
  if (!items || items.length === 0) return null;
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.titleRow}>
        <Text style={cardStyles.icon}>{icon}</Text>
        <Text style={[cardStyles.title, { color }]}>{title}</Text>
      </View>
      {items.map((item, i) => (
        <View key={i} style={cardStyles.item}>
          <View style={[cardStyles.dot, { backgroundColor: color }]} />
          <Text style={cardStyles.itemText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.md,
    padding: SPACING.lg, marginBottom: SPACING.md,
    ...SHADOW.card,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  icon: { fontSize: 20 },
  title: { fontSize: 16, fontWeight: '800' },
  item: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: SPACING.sm, marginBottom: SPACING.sm,
  },
  dot: {
    width: 7, height: 7, borderRadius: 4,
    marginTop: 6, flexShrink: 0,
  },
  itemText: { flex: 1, fontSize: 14, color: COLORS.textSoft, lineHeight: 20 },
});


// ── MAIN RESULT SCREEN ────────────────────────────────────────────────────────
import { useLocalSearchParams } from 'expo-router';
import { router } from 'expo-router';

export default function ResultScreen() {
  const { result: resultJson, imageUri } = useLocalSearchParams();
  const result = JSON.parse(resultJson);
  const isHealthy = result.disease_key?.toLowerCase().includes('healthy');
  const isUncertain = result.disease_key?.toLowerCase().includes('uncertain');   

  // Trigger haptic feedback on load
  useEffect(() => {
    Haptics.notificationAsync(
      isHealthy
        ? Haptics.NotificationFeedbackType.Success
        : isUncertain
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Warning
    );
  }, []);

  const headerColor  = isHealthy ? COLORS.greenMid  : COLORS.greenDeep;
  const badgeColor   = isHealthy ? COLORS.successLight : isUncertain ? '#fff8e8' : COLORS.dangerLight;
  const badgeText    = isHealthy ? COLORS.success      : COLORS.danger;
  const badgeLabel   = isHealthy ? '✅  Healthy Plant' : isUncertain ? '🔍  Unable to Identify' : '⚠️  Disease Detected';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={headerColor} />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* ── HEADER ── */}
        <LinearGradient colors={[headerColor, COLORS.greenDeep]} style={styles.header}>

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>

          {/* Uploaded Image */}
          {imageUri && (
            <View style={styles.imageWrap}>
              <Image source={{ uri: imageUri }} style={styles.image} />
            </View>
          )}

          {/* Badge */}
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={[styles.badgeText, { color: badgeText }]}>{badgeLabel}</Text>
          </View>

          {/* Disease Name */}
          <Text style={styles.diseaseName}>{result.name}</Text>
          <Text style={styles.cropLabel}>Crop: {result.crop}</Text>

          {/* Confidence */}
          <View style={styles.confWrap}>
            <Text style={styles.confLabel}>Confidence</Text>
            <ConfidenceBar confidence={result.confidence} />
          </View>

        </LinearGradient>

        {/* ── CONTENT ── */}
        <View style={styles.body}>
          

          {/* Uncertain Message */}
          {isUncertain && (
            <View style={[cardStyles.card, { marginBottom: SPACING.md }]}>
              <View style={cardStyles.titleRow}>
                <Text style={cardStyles.icon}>🔍</Text>
                <Text style={[cardStyles.title, { color: COLORS.warning }]}>Could not identify</Text>
              </View>
              <Text style={styles.descText}>{result.description}</Text>
            </View>
          )}


          {/* Healthy Message */} 
          {!isUncertain && isHealthy && (
            <View style={[cardStyles.card, { marginBottom: SPACING.md }]}>
              <View style={cardStyles.titleRow}>
                <Text style={cardStyles.icon}>✅</Text>
                <Text style={[cardStyles.title, { color: COLORS.greenDeep }]}>Plant Status</Text>
              </View>
              <Text style={styles.descText}>{result.description}</Text>
            </View>
          )}

          {/* Description */}
          {!isUncertain && !isHealthy && (
            <View style={[cardStyles.card, { marginBottom: SPACING.md }]}>
              <View style={cardStyles.titleRow}>
                <Text style={cardStyles.icon}>📋</Text>
                <Text style={[cardStyles.title, { color: COLORS.greenDeep }]}>About this disease</Text>
              </View>
              <Text style={styles.descText}>{result.description}</Text>
            </View>
          )}

          {/* Symptoms */}
          {!isHealthy && !isUncertain && (
            <InfoCard
              icon="🔴"
              title="Symptoms to look for"
              items={result.symptoms}
              color={COLORS.danger}
            />
          )}

          {/* Treatment */}
          {!isHealthy && !isUncertain && (
            <InfoCard
              icon="💊"
              title="Recommended Treatment"
              items={result.treatment}
              color={COLORS.warning}
            />
          )}

          {/* Prevention / Tips */}
          {isUncertain ? (
            <InfoCard
              icon="💡"
              title="Tips to get better results"
              items={result.prevention}
              color={COLORS.warning}
            />
          ) : (
            <InfoCard
              icon="🛡️"
              title="Prevention Tips"
              items={result.prevention}
              color={COLORS.greenMid}
            />
          )}

          {/* Severity Indicator */}
          {!isHealthy && !isUncertain && (
            <View style={styles.severityCard}>
              <Text style={styles.severityTitle}>⚡ Act quickly!</Text>
              <Text style={styles.severityText}>
                Plant diseases spread fast. Apply the recommended treatment as soon as possible
                and isolate affected plants to protect the rest of your crop.
              </Text>
            </View>
          )}

          {/* Buttons */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.back();
            }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.greenLight, COLORS.greenMid]}
              style={styles.primaryBtnGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Text style={styles.primaryBtnText}>↩  Analyse Another Plant</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            ⚠️ This is an AI-assisted diagnosis. For critical decisions, consult an agricultural extension officer.
          </Text>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.greenDeep },

  // Header
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.md,
  },
  backBtnText: { color: COLORS.greenPale, fontSize: 15, fontWeight: '600' },

  imageWrap: {
    width: 160, height: 160, borderRadius: 20,
    overflow: 'hidden', marginBottom: SPACING.lg,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)',
    ...SHADOW.strong,
  },
  image: { width: '100%', height: '100%' },

  badge: {
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md, marginBottom: SPACING.sm,
    maxWidth: '90%', width: 180,alignSelf: 'center',
    
  },
  badgeText: { fontSize: 13, fontWeight: '700', textAlign: 'center', },

  diseaseName: {
    fontSize: 26, fontWeight: '900', color: COLORS.white,
    textAlign: 'center', marginBottom: SPACING.xs,
    letterSpacing: -0.3,
  },
  cropLabel: {
    fontSize: 13, color: COLORS.greenPale, opacity: 0.8,
    marginBottom: SPACING.md,
  },

  confWrap: { width: '100%' },
  confLabel: { color: COLORS.greenPale, fontSize: 12, opacity: 0.7, marginBottom: 4 },

  // Body
  body: {
    backgroundColor: COLORS.cream,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -20,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },

  descText: { fontSize: 14, color: COLORS.textSoft, lineHeight: 22 },

  severityCard: {
    backgroundColor: '#fff8e8', borderRadius: RADIUS.md,
    padding: SPACING.lg, marginBottom: SPACING.md,
    borderLeftWidth: 4, borderLeftColor: COLORS.warning,
  },
  severityTitle: { fontSize: 15, fontWeight: '800', color: COLORS.warning, marginBottom: SPACING.xs },
  severityText: { fontSize: 13, color: COLORS.textSoft, lineHeight: 20 },

  primaryBtn: {
    borderRadius: RADIUS.md, overflow: 'hidden',
    marginBottom: SPACING.md, ...SHADOW.strong,
  },
  primaryBtnGradient: {
    paddingVertical: SPACING.lg, alignItems: 'center',
  },
  primaryBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },

  disclaimer: {
    textAlign: 'center', color: COLORS.textSoft,
    fontSize: 12, lineHeight: 18, opacity: 0.8,
  },
});
