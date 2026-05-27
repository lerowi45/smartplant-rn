# 🌿 SmartPlant AI — React Native App

AI-powered plant disease detection mobile app built with React Native (Expo) + Flask backend.

---

## 📁 Project Structure

```
smartplant-rn/
├── App.js                        ← Root navigation setup
├── app.json                      ← Expo configuration
├── package.json                  ← Dependencies
├── app.py                        ← Flask backend API (updated for React Native)
└── src/
    ├── screens/
    │   ├── HomeScreen.js         ← Main screen (crop selector + image upload)
    │   └── ResultScreen.js       ← Results screen (disease + treatment)
    ├── utils/
    │   ├── api.js                ← All Flask API calls live here
    │   └── theme.js              ← Shared colors, spacing, fonts
    └── assets/                   ← App icon and images
```

---

## 🚀 Setup & Running

### Step 1 — Install Node.js
Download from https://nodejs.org (choose LTS version)

### Step 2 — Install Expo CLI
```bash
npm install -g expo-cli
```

### Step 3 — Install project dependencies
```bash
cd smartplant-rn
npm install
```

### Step 4 — Install Expo Go on your phone
- Android: Search "Expo Go" on Google Play Store
- iOS: Search "Expo Go" on App Store

### Step 5 — Start the app
```bash
npx expo start
```
A QR code will appear in your terminal. Scan it with:
- Android: Expo Go app → Scan QR Code
- iOS: Camera app → point at QR code

Your app will load on your phone instantly! ✅

---

## 🔌 Connecting to Your Flask Backend

### Step 1 — Find your laptop's local IP address
- **Windows:** Open Command Prompt → type `ipconfig` → look for "IPv4 Address" (e.g., 192.168.1.105)
- **Mac/Linux:** Open Terminal → type `ifconfig` → look for `inet` address

### Step 2 — Update api.js
Open `src/utils/api.js` and update this line:
```javascript
export const API_BASE_URL = 'http://192.168.1.105:5000'; // ← your actual IP
```

### Step 3 — Run Flask with network access
```bash
# Install Flask dependencies
pip install flask pillow numpy

# Run Flask (0.0.0.0 makes it accessible from your phone)
python app.py
```

### Step 4 — Make sure both devices are on the same Wi-Fi
Your phone and laptop MUST be on the same Wi-Fi network.

---

## 📱 App Screens

### Home Screen
- Select crop type (General / Cassava / Tomato / Maize)
- Take a photo with camera OR select from gallery
- Tap "Detect Disease" to send to Flask

### Result Screen
- Shows disease name and confidence percentage
- Animated confidence bar (green = high, orange = medium, red = low)
- Disease description, symptoms, treatment, and prevention tips
- Haptic feedback on result load

---

## 🤖 Adding Your Trained Models

Once you have trained your models using the Colab notebook:

1. Place model files in the `models/` folder:
   ```
   models/best_plant_model.h5
   models/ghana_plant_model.h5
   class_names.json
   ghana_class_names.json
   ```

2. Update `load_models()` in `app.py`:
   ```python
   import tensorflow as tf

   def load_models():
       plant_model = tf.keras.models.load_model('models/best_plant_model.h5')
       ghana_model = tf.keras.models.load_model('models/ghana_plant_model.h5')
       return plant_model, ghana_model
   ```

3. Update `predict_disease()` in `app.py` — the comment in the function shows exactly what code to use.

---

## 🌍 Building for Android (APK)

When your project is ready, build an installable APK:

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in to Expo account (create free account at expo.dev)
eas login

# Configure build
eas build:configure

# Build APK for Android
eas build --platform android --profile preview
```

This creates an APK you can install on any Android phone.

---

## 🛠️ Common Issues & Fixes

| Problem | Solution |
|---|---|
| "Network request failed" | Check IP address in api.js. Make sure phone and laptop are on same Wi-Fi. Make sure Flask is running with host='0.0.0.0' |
| App not loading on phone | Make sure Expo Go is installed. Try restarting `npx expo start` |
| Camera not working | Check app.json has camera permissions. Accept permission prompt on phone |
| "Module not found" error | Run `npm install` again |
| Flask CORS error | The updated app.py already has CORS headers — make sure you're using the new app.py |

---

## 📦 Key Dependencies

| Package | Purpose |
|---|---|
| `expo-image-picker` | Camera and gallery access |
| `expo-haptics` | Vibration feedback |
| `expo-linear-gradient` | Gradient backgrounds |
| `@react-navigation/stack` | Screen navigation |
| `react-native-safe-area-context` | Handle phone notches |

---

Built for Final Year Project — Agricultural Smart Systems using AI
