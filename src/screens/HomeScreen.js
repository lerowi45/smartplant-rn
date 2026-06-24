// src/screens/HomeScreen.js
import { router } from 'expo-router';
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, ActivityIndicator, Alert, StatusBar, Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOW } from '../utils/theme';
import { analyzeImage } from '../utils/api';
import { saveScan } from '../utils/historyService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Crop options — 'general' uses PlantVillage model, 'cassava' uses Ghana model
const CROPS = [
  { id: 'general', label: 'General',  emoji: '🌿', desc: 'Tomato, Maize, Potato & more' },
  { id: 'cassava', label: 'Cassava',  emoji: '🍠', desc: 'Ghana cassava diseases' },
  { id: 'tomato',  label: 'Tomato',   emoji: '🍅', desc: 'Tomato specific diseases' },
  { id: 'maize',   label: 'Maize',    emoji: '🌽', desc: 'Corn / maize diseases' },
];

export default function HomeScreen() {
  const [image, setImage] = useState(null);
  const [cropType, setCropType]   = useState('general');
  const [loading, setLoading]     = useState(false);

  // ── Pick from Gallery ──────────────────────────────────────────────────────
  const pickFromGallery = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library in Settings.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    console.log('Result:', JSON.stringify(result));  // ← add this

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  }, []);

  // ── Take Photo with Camera ─────────────────────────────────────────────────
  const takePhoto = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow camera access in Settings.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  }, []);

  // ── Analyse Image ──────────────────────────────────────────────────────────
  const handleAnalyse = useCallback(async () => {
    if (!image) {
      Alert.alert('No image', 'Please select or take a photo first.');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const result = await analyzeImage(image, cropType);

     if (result.success) {
      // Save scan to history
      await saveScan({
        imageUri: image,
        disease_key: result.disease_key,
        name: result.name,
        crop: result.crop,
        confidence: result.confidence,
        description: result.description,
        symptoms: result.symptoms,
        treatment: result.treatment,
        prevention: result.prevention,
      });

      router.push({
        pathname: '/result',
        params: {
          result: JSON.stringify(result),
          imageUri: image,
        },
      });
        
      } else {
        Alert.alert('Analysis failed', result.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      Alert.alert(
        'Connection error',
        'Could not reach the server. Make sure:\n\n• Your Flask app is running\n• Your phone and laptop are on the same Wi-Fi\n• The IP address in api.js is correct',
        [{ text: 'OK' }]
      );
      console.error('API error:', error);
    } finally {
      setLoading(false);
    }
  }, [image, cropType]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.greenDeep} />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* ── HEADER ── */}
        <LinearGradient
          colors={[COLORS.greenDeep, COLORS.greenMid]}
          style={styles.header}
        >

          {/* Add history button in top right */}
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => router.push('/history')}
          >
            <Text style={styles.historyBtnText}>📋 History</Text>
          </TouchableOpacity>

          <Text style={styles.headerEmoji}>🌿</Text>
          <Text style={styles.headerTitle}>SmartPlant AI</Text>
          <Text style={styles.headerSub}>Plant Disease Detection</Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            {[['38+', 'Diseases'], ['95%', 'Accuracy'], ['2', 'Models']].map(([num, label]) => (
              <View key={label} style={styles.statItem}>
                <Text style={styles.statNum}>{num}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.body}>

          {/* ── CROP SELECTOR ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Crop Type</Text>
            <Text style={styles.sectionSub}>This determines which AI model is used</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cropScroll}
            >
              {CROPS.map(crop => (
                <TouchableOpacity
                  key={crop.id}
                  style={[styles.cropCard, cropType === crop.id && styles.cropCardActive]}
                  onPress={() => {
                    setCropType(crop.id);
                    Haptics.selectionAsync();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cropEmoji}>{crop.emoji}</Text>
                  <Text style={[styles.cropLabel, cropType === crop.id && styles.cropLabelActive]}>
                    {crop.label}
                  </Text>
                  <Text style={[styles.cropDesc, cropType === crop.id && styles.cropDescActive]}>
                    {crop.desc}
                  </Text>
                  {cropType === crop.id && (
                    <View style={styles.cropCheck}>
                      <Text style={{ color: COLORS.white, fontSize: 10 }}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ── IMAGE SECTION ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upload Plant Photo</Text>
            <Text style={styles.sectionSub}>Take a clear photo of the affected leaf or plant part</Text>

            {image ? (
              // Image Preview
              <View style={styles.previewContainer}>
                <Image source={{ uri: image }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => { setImage(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={styles.removeBtnText}>✕ Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Upload Options
              <View style={styles.uploadArea}>
                <Text style={styles.uploadIcon}>🍃</Text>
                <Text style={styles.uploadTitle}>No image selected</Text>
                <Text style={styles.uploadHint}>Choose an option below</Text>

                <View style={styles.uploadBtns}>
                  <TouchableOpacity style={styles.uploadBtn} onPress={takePhoto} activeOpacity={0.8}>
                    <LinearGradient
                      colors={[COLORS.greenMid, COLORS.greenDeep]}
                      style={styles.uploadBtnGradient}
                    >
                      <Text style={styles.uploadBtnIcon}>📷</Text>
                      <Text style={styles.uploadBtnText}>Take Photo</Text>
                      <Text style={styles.uploadBtnSub}>Use camera</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.uploadBtn} onPress={pickFromGallery} activeOpacity={0.8}>
                    <LinearGradient
                      colors={['#3a5a4a', COLORS.greenDeep]}
                      style={styles.uploadBtnGradient}
                    >
                      <Text style={styles.uploadBtnIcon}>🖼️</Text>
                      <Text style={styles.uploadBtnText}>Gallery</Text>
                      <Text style={styles.uploadBtnSub}>Choose existing</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* ── ANALYSE BUTTON ── */}
          <TouchableOpacity
            style={[styles.analyseBtn, (!image || loading) && styles.analyseBtnDisabled]}
            onPress={handleAnalyse}
            disabled={!image || loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={image && !loading ? [COLORS.greenLight, COLORS.greenMid] : ['#aaa', '#888']}
              style={styles.analyseBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <>
                  <ActivityIndicator color={COLORS.white} size="small" />
                  <Text style={styles.analyseBtnText}>  Analysing plant...</Text>
                </>
              ) : (
                <Text style={styles.analyseBtnText}>🔍  Detect Disease</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* ── HOW IT WORKS ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How it works</Text>
            {[
              ['01', 'Select crop type', 'Choose from general, cassava, tomato or maize'],
              ['02', 'Upload a photo', 'Take or select a photo of the affected plant'],
              ['03', 'AI analysis', 'Our deep learning model identifies the disease'],
              ['04', 'Get treatment', 'Receive diagnosis and treatment recommendations'],
            ].map(([num, title, desc]) => (
              <View key={num} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{num}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{title}</Text>
                  <Text style={styles.stepDesc}>{desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.footer}>
            Built for Ghanaian farmers 🌾{'\n'}SmartPlant AI — Final Year Project
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
    alignItems: 'center',
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  headerEmoji: { fontSize: 48, marginBottom: SPACING.sm },
  headerTitle: {
    fontSize: 32, color: COLORS.white, fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 14, color: COLORS.greenPale,
    marginTop: 4, opacity: 0.85, letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row', marginTop: SPACING.lg,
    gap: SPACING.xl,
  },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 24, color: COLORS.greenLight, fontWeight: '800' },
  statLabel: { fontSize: 11, color: COLORS.greenPale, opacity: 0.7, marginTop: 2 },

  // Body
  body: {
    backgroundColor: COLORS.cream,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -20,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },

  // Section
  section: { marginBottom: SPACING.xl },
  sectionTitle: {
    fontSize: 18, fontWeight: '700', color: COLORS.greenDeep,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 13, color: COLORS.textSoft, marginBottom: SPACING.md,
  },

  // Crop Selector
  cropScroll: { paddingRight: SPACING.md, gap: SPACING.sm },
  cropCard: {
    width: 130, padding: SPACING.md,
    backgroundColor: COLORS.white, borderRadius: RADIUS.md,
    borderWidth: 2, borderColor: COLORS.creamDark,
    alignItems: 'center', position: 'relative',
    ...SHADOW.card,
  },
  cropCardActive: {
    borderColor: COLORS.greenLight,
    backgroundColor: COLORS.greenMint,
  },
  cropEmoji: { fontSize: 28, marginBottom: SPACING.xs },
  cropLabel: {
    fontSize: 14, fontWeight: '700', color: COLORS.greenDeep,
    marginBottom: 2,
  },
  cropLabelActive: { color: COLORS.greenMid },
  cropDesc: { fontSize: 10, color: COLORS.textSoft, textAlign: 'center', lineHeight: 14 },
  cropDescActive: { color: COLORS.greenMid },
  cropCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: COLORS.greenLight,
    alignItems: 'center', justifyContent: 'center',
  },

  // Upload Area
  uploadArea: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: SPACING.xl, alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.creamDark,
    borderStyle: 'dashed',
  },
  uploadIcon: { fontSize: 48, marginBottom: SPACING.sm },
  uploadTitle: {
    fontSize: 16, fontWeight: '700', color: COLORS.greenDeep,
    marginBottom: 4,
  },
  uploadHint: { fontSize: 13, color: COLORS.textSoft, marginBottom: SPACING.lg },
  uploadBtns: { flexDirection: 'row', gap: SPACING.md, width: '100%' },
  uploadBtn: { flex: 1, borderRadius: RADIUS.md, overflow: 'hidden', ...SHADOW.card },
  uploadBtnGradient: {
    padding: SPACING.md, alignItems: 'center', borderRadius: RADIUS.md,
  },
  uploadBtnIcon: { fontSize: 24, marginBottom: SPACING.xs },
  uploadBtnText: {
    fontSize: 14, fontWeight: '700', color: COLORS.white, marginBottom: 2,
  },
  uploadBtnSub: { fontSize: 11, color: COLORS.greenPale, opacity: 0.8 },

  // Preview
  previewContainer: {
    borderRadius: RADIUS.lg,
    ...SHADOW.card,
  },
  previewImage: {
    width: '100%',
    height: 280,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  removeBtn: {
    position: 'absolute', top: SPACING.md, right: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  removeBtnText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },

  // Analyse Button
  analyseBtn: { borderRadius: RADIUS.md, overflow: 'hidden', marginBottom: SPACING.xl, ...SHADOW.strong },
  analyseBtnDisabled: { opacity: 0.6 },
  analyseBtnGradient: {
    paddingVertical: SPACING.lg, alignItems: 'center',
    justifyContent: 'center', flexDirection: 'row',
  },
  analyseBtnText: {
    color: COLORS.white, fontSize: 17, fontWeight: '800', letterSpacing: 0.3,
  },

  // Steps
  stepRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: SPACING.md, gap: SPACING.md,
  },
  stepNum: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.greenDeep,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumText: { color: COLORS.greenLight, fontSize: 13, fontWeight: '800' },
  stepContent: { flex: 1, paddingTop: 4 },
  stepTitle: { fontSize: 14, fontWeight: '700', color: COLORS.greenDeep, marginBottom: 2 },
  stepDesc: { fontSize: 13, color: COLORS.textSoft, lineHeight: 18 },

  footer: {
    textAlign: 'center', color: COLORS.textSoft,
    fontSize: 12, lineHeight: 20, marginTop: SPACING.md,
  },

  historyBtn: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.sm,
},
historyBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },

});
