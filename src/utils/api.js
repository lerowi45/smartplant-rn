// src/utils/api.js
// ─────────────────────────────────────────────────────────────────────────────
// This file handles ALL communication between the React Native app
// and your Flask backend API.
// ─────────────────────────────────────────────────────────────────────────────

// ── CONFIG ───────────────────────────────────────────────────────────────────
// Change this to your Flask server address:
//   • Testing on your laptop:      'http://192.168.x.x:5000'  ← use your PC's local IP
//   • Deployed on Render/Railway:  'https://your-app.onrender.com'
//
// To find your local IP on Windows: open Command Prompt → type 'ipconfig'
// To find your local IP on Mac/Linux: open Terminal → type 'ifconfig'
// Your phone and laptop must be on the SAME Wi-Fi network for local testing!

export const API_BASE_URL = 'http://192.168.43.110:5001'; // ← UPDATE THIS

// ── DISEASE DETECTION ────────────────────────────────────────────────────────

/**
 * Send an image to the Flask backend for disease detection.
 *
 * @param {string} imageUri    - Local URI of the image (from image picker)
 * @param {string} cropType    - 'cassava' for Ghana model, 'general' for PlantVillage model
 * @returns {Promise<object>}  - Disease prediction result from Flask
 */
export async function analyzeImage(imageUri, cropType = 'general') {
  // Build a FormData object — this is how we send images over HTTP
  const formData = new FormData();

  // Get the filename and file type from the URI
  const filename = imageUri.split('/').pop();
  const fileType = filename.split('.').pop().toLowerCase();
  const mimeType = fileType === 'jpg' || fileType === 'jpeg'
    ? 'image/jpeg'
    : fileType === 'png'
    ? 'image/png'
    : 'image/webp';

  // Attach the image to the form
  formData.append('image', {
    uri: imageUri,
    name: filename,
    type: mimeType,
  });

  // Attach the crop type so Flask knows which model to use
  formData.append('crop_type', cropType);

  // Send to Flask
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Check if the Flask server is reachable.
 * Call this on app startup to warn the user if server is offline.
 */
export async function checkServerHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      timeout: 5000,
    });
    return response.ok;
  } catch {
    return false;
  }
}
