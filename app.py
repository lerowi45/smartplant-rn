# app.py — Updated Flask backend for React Native frontend
# Key changes from original:
#   1. Added /health endpoint (React Native checks this on startup)
#   2. Added CORS headers (React Native needs these to talk to Flask)
#   3. Added crop_type parameter to choose between models

import os
import json
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from PIL import Image
import numpy as np

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}

# ── CORS — Required for React Native to communicate with Flask ────────────────
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin']  = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response

@app.route('/health', methods=['GET', 'OPTIONS'])
def health():
    """React Native calls this on startup to check if server is running"""
    return jsonify({'status': 'ok', 'message': 'SmartPlant AI server is running'})

# ── DISEASE INFO DATABASE ─────────────────────────────────────────────────────
DISEASE_INFO = {
    "Tomato___Early_blight": {
        "name": "Tomato Early Blight",
        "crop": "Tomato",
        "description": "A fungal disease caused by Alternaria solani. Appears as dark brown spots with concentric rings on older leaves.",
        "symptoms": ["Dark brown circular spots with target-board rings", "Yellow halos around spots", "Affected leaves turn yellow and drop", "Stem lesions near soil level"],
        "treatment": ["Apply copper-based fungicide every 7-10 days", "Remove and destroy infected leaves immediately", "Use Mancozeb or Chlorothalonil fungicide"],
        "prevention": ["Rotate crops every season", "Avoid overhead watering", "Space plants for good airflow", "Use disease-resistant varieties"]
    },
    "Tomato___Late_blight": {
        "name": "Tomato Late Blight",
        "crop": "Tomato",
        "description": "Caused by Phytophthora infestans. Very destructive, spreads rapidly in cool wet conditions.",
        "symptoms": ["Water-soaked gray-green spots", "White fuzzy mold on leaf undersides", "Dark brown stem lesions", "Fruit rots rapidly"],
        "treatment": ["Apply Ridomil Gold or Revus fungicide", "Remove infected plants completely", "Avoid working in wet fields"],
        "prevention": ["Plant resistant varieties", "Ensure good drainage", "Avoid overhead irrigation", "Monitor weather for high-risk periods"]
    },
    "Corn___Northern_Leaf_Blight": {
        "name": "Northern Leaf Blight (Maize)",
        "crop": "Maize / Corn",
        "description": "Caused by Exserohilum turcicum. A major foliar disease of maize reducing yield significantly.",
        "symptoms": ["Long cigar-shaped gray-green lesions", "Lesions turn tan/brown over time", "Appears first on lower leaves", "Severe cases cause complete leaf death"],
        "treatment": ["Apply Azoxystrobin or Propiconazole at early stages", "Remove heavily infected crop debris after harvest"],
        "prevention": ["Use resistant hybrid maize varieties", "Rotate maize with legumes", "Avoid dense planting"]
    },
    "Cassava_Mosaic_Disease_CMD": {
        "name": "Cassava Mosaic Disease",
        "crop": "Cassava",
        "description": "Caused by cassava mosaic viruses transmitted by whiteflies. Most devastating cassava disease in Ghana.",
        "symptoms": ["Yellow and green mosaic pattern on leaves", "Leaf distortion and curling", "Stunted plant growth", "Reduced tuber yield"],
        "treatment": ["No chemical cure — remove and destroy infected plants", "Control whitefly with insecticides", "Replant with clean certified cuttings"],
        "prevention": ["Use virus-free planting material", "Plant resistant varieties (TME 419)", "Control whitefly with neem-based sprays", "Remove infected plants early (roguing)"]
    },
    "Cassava_Bacterial_Blight_CBB": {
        "name": "Cassava Bacterial Blight",
        "crop": "Cassava",
        "description": "Caused by Xanthomonas axonopodis. A serious bacterial disease causing wilting and stem die-back in Ghana.",
        "symptoms": ["Angular water-soaked leaf spots", "Wilting of leaves and stems", "Gummy exudate on stems", "Die-back from stem tips"],
        "treatment": ["Remove and burn infected plants", "Apply copper-based bactericide", "Use clean uninfected planting material"],
        "prevention": ["Use resistant varieties", "Avoid working in fields when wet", "Disinfect cutting tools between plants", "Rotate crops"]
    },
    "Cassava_Brown_Streak_CBSD": {
        "name": "Cassava Brown Streak Disease",
        "crop": "Cassava",
        "description": "A viral disease spreading rapidly through East and West Africa. Causes severe tuber necrosis in Ghana.",
        "symptoms": ["Yellow streaks on leaves", "Brown corky patches inside tubers", "Stunted growth", "Feathery chlorosis on leaves"],
        "treatment": ["No cure — remove and destroy infected plants immediately", "Use virus-tested clean planting material"],
        "prevention": ["Plant certified virus-free cuttings", "Use tolerant varieties", "Control whitefly vectors", "Monitor crops regularly"]
    },
    "Healthy": {
        "name": "Healthy Plant",
        "crop": "General",
        "description": "No disease detected. The plant appears to be in good health. Keep up your current practices!",
        "symptoms": [],
        "treatment": [],
        "prevention": ["Continue regular monitoring", "Maintain proper irrigation", "Use balanced fertilizers", "Practice crop rotation"]
    }
}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def load_models():
    """
    Load both AI models.
    Replace placeholder with real model loading once you have trained models.

    Example:
        import tensorflow as tf
        plant_model = tf.keras.models.load_model('models/best_plant_model.h5')
        ghana_model = tf.keras.models.load_model('models/ghana_plant_model.h5')
        return plant_model, ghana_model
    """
    return None, None  # ← Replace with real models after training

def predict_disease(image_path, plant_model, ghana_model, crop_type='general'):
    """
    Run AI prediction on the uploaded image.

    Replace the placeholder below with real model inference after training:

    import tensorflow as tf
    import numpy as np
    from tensorflow.keras.preprocessing import image as keras_image

    img = keras_image.load_img(image_path, target_size=(224, 224))
    img_array = keras_image.img_to_array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    if crop_type == 'cassava':
        predictions = ghana_model.predict(img_array, verbose=0)
        with open('ghana_class_names.json') as f:
            class_names = json.load(f)
    else:
        predictions = plant_model.predict(img_array, verbose=0)
        with open('class_names.json') as f:
            class_names = json.load(f)

    predicted_index = np.argmax(predictions[0])
    predicted_class = class_names[predicted_index]
    confidence = round(float(predictions[0][predicted_index]) * 100, 1)
    return predicted_class, confidence
    """
    # ── PLACEHOLDER: Remove once real model is ready ──
    import random
    if crop_type == 'cassava':
        classes = ['Cassava_Mosaic_Disease_CMD', 'Cassava_Bacterial_Blight_CBB',
                   'Cassava_Brown_Streak_CBSD', 'Healthy']
    else:
        classes = list(DISEASE_INFO.keys())
    return random.choice(classes), round(random.uniform(72, 98), 1)
    # ─────────────────────────────────────────────────

# Load models once at startup
plant_model, ghana_model = load_models()

# ── ROUTES ────────────────────────────────────────────────────────────────────

@app.route('/analyze', methods=['POST', 'OPTIONS'])
def analyze():
    print(request.content_type)
    print(request.form)
    print(request.files)
    print(request.get_json(silent=True))
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'No image uploaded'}), 400

    file = request.files['image']
    crop_type = request.form.get('crop_type', 'general')

    if not file or file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'success': False, 'error': 'Invalid file type. Use JPG, PNG, or WEBP'}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    disease_key, confidence = predict_disease(filepath, plant_model, ghana_model, crop_type)
    disease_data = DISEASE_INFO.get(disease_key, DISEASE_INFO['Healthy'])

    return jsonify({
        'success':     True,
        'disease_key': disease_key,
        'confidence':  confidence,
        **disease_data
    })

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    # host='0.0.0.0' makes Flask accessible from your phone on the same Wi-Fi
    app.run(debug=True, host='0.0.0.0', port=5001)
