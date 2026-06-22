import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = 'smartplant_scan_history';

// Save a new scan to history
export const saveScan = async (scanData) => {
  try {
    const existing = await getHistory();
    const newScan = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      ...scanData,
    };
    const updated = [newScan, ...existing]; // newest first
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return newScan;
  } catch (error) {
    console.error('Error saving scan:', error);
  }
};

// Get all scans from history
export const getHistory = async () => {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading history:', error);
    return [];
  }
};

// Delete a single scan by id
export const deleteScan = async (id) => {
  try {
    const existing = await getHistory();
    const updated = existing.filter(scan => scan.id !== id);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error deleting scan:', error);
  }
};

// Clear all history
export const clearHistory = async () => {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('Error clearing history:', error);
  }
};