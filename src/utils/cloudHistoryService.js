
//cloudHistoryService.js
//handles syncing local scans to the cloud and fetching cloud scans
//used only when the user is logged in

import { API_BASE_URL } from './api';

//upload local scans to the cloud (skips duplicates by id)
export const syncLocalScansToCloud = async (token, localScans) => {
  if (!localScans || localScans.length === 0) return;
  try {
    //map local scan fields to what the backend expects
    const scans = localScans.map(s => ({
      id:         s.id,
      crop_type:  s.cropType || s.crop_type || s.crop || 'general',
      disease:    s.name     || s.disease   || 'Unknown',
      confidence: s.confidence,
      image_url:  s.imageUri || s.image_url || null,
      timestamp:  s.date     || s.timestamp || new Date().toISOString(),
    }));

    await fetch(`${API_BASE_URL}/sync-scans`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ scans }),
    });
  } catch (e) {
    console.error('Sync failed:', e);
  }
};

//fetch all cloud scans for the logged-in user
export const getCloudScans = async (token) => {
  const response = await fetch(`${API_BASE_URL}/scans`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to load scans');
  return data.scans;
};

//delete a single cloud scan
export const deleteCloudScan = async (token, scanId) => {
  const response = await fetch(`${API_BASE_URL}/scans/${scanId}`, {
    method:  'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to delete scan');
};
