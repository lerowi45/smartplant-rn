
---

## Setup & Running

### Step 1: Install Node.js
Download from https://nodejs.org (choose LTS version)

### Step 2: Install project dependencies
```bash
cd smartplant-rn
npm install
```

### Step 3: Install Expo Go on your phone
- Android: Search "Expo Go" on Google Play Store
- iOS: Search "Expo Go" on App Store

### Step 4: Start the app
```bash
npx expo start
```
A QR code will appear in your terminal. Scan it with:
- Android: Expo Go app → Scan QR Code
- iOS: Camera app → point at QR code

---

## Connecting to the Flask backend

### Step 1: Find your laptop's local IP address
- **Windows:** Open Command Prompt => type `ipconfig` => look for "IPv4 Address" (e.g., 192.168.43.110)
- **Mac/Linux:** Open Terminal => type `ifconfig` => look for `inet` address

### Step 2: Update api.js
Open `src/utils/api.js` and update this line to match your machine's IP and the port Flask is running on:
```javascript
export const API_BASE_URL = 'http://192.168.43.110:5001'; // <= your actual IP and port
```

### Step 3 (Optional but Recommended): Create a Python Virtual Environment
A virtual environment keeps Flask and its dependencies isolated from your global Python installation.

```bash
# Create the virtual environment (run once, inside the flask backend folder)
python -m venv venv

# Activate it:
# On Windows:
venv\Scripts\activate

# On Mac/Linux:
source venv/bin/activate
```

Then install dependencies inside the virtual environment:
```bash
pip install -r requirements.txt
```

> **Note:** You need to activate the virtual environment (`venv\Scripts\activate` or `source venv/bin/activate`) every time you open a new terminal before running Flask.

### Step 4: Run Flask
```bash
python app.py
```
Flask will start and listen for requests from the app.

### Step 5: Make sure both devices are on the same Wi-Fi
Your phone and laptop MUST be on the same Wi-Fi network.

---

## Running with Tunnel (Recommended, avoids firewall issues)

If the app can't connect to Flask over local Wi-Fi, use a tunnel instead:

```bash
npx expo start --tunnel
```

If this fails, fix the ngrok dependency first:
```bash
npm uninstall @expo/ngrok
npm install @expo/ngrok@^4.1.0
```
Then run `npx expo start --tunnel` again.

> **Note:** The tunnel only handles the Expo dev server connection (port 8081). The Flask backend still needs to be reachable from the phone. Use your local IP or set up a separate ngrok tunnel for Flask:
> ```bash
> ngrok http 5001
> ```
> Then update `API_BASE_URL` in `api.js` with the ngrok HTTPS URL.

---

## App Screens

### Home Screen
- Select crop type (General / Cassava / Tomato / Maize / Rice / Pepper / Potato)
- Take a photo with camera OR select from gallery
- Tap "Detect Disease" to send to Flask for analysis

### Result Screen
- Shows disease name and confidence percentage
- Colour-coded result: green (healthy), red (disease detected), grey (uncertain)
- Disease symptoms, treatment recommendations, and prevention tips
- Haptic feedback on result load

### History Screen
- View all past scans stored locally on the device
- Tap any scan to view its full result again
- Delete individual scans or clear all history
- Data persists across app restarts using AsyncStorage (no internet needed)

---

## How the AI Pipeline Works

1. The app sends the image and selected crop type to the Flask `/analyze` endpoint
2. Flask runs the image through the **MobileNetV2** model (trained on ~82,000 images across 30 disease classes)
3. If MobileNetV2 confidence is **≥ 75%** → result is returned directly
4. If confidence is **< 75%** → image is sent to **Google Gemini 2.5 Flash** as a fallback
5. If both models are below **50%** confidence => an **"Uncertain"** result is returned

---


## Common Issues & Fixes

| Problem | Solution |
|---|---|
| "Network request failed" | Check IP and port in `api.js`. Confirm phone and laptop are on the same Wi-Fi. Confirm Flask is running. |
| App not loading on phone | Make sure Expo Go is installed. Try restarting `npx expo start`. |
| Camera not working | Check `app.json` has camera permissions. Accept the permission prompt on your phone. |
| "Module not found" error | Run `npm install` again. |
| Flask CORS error | Make sure `flask-cors` is installed and `CORS(app)` is in `app.py`. |
| Tunnel not connecting | Reinstall ngrok: `npm uninstall @expo/ngrok && npm install @expo/ngrok@^4.1.0` |
| Virtual environment not active | Run `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Mac/Linux) before `python app.py` |

---
