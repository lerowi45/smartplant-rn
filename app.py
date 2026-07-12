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
import tensorflow as tf
import keras
from dotenv import load_dotenv

load_dotenv()

from google import genai
import base64

GEMINI_API_KEY =  os.getenv('GEMINI_API_KEY')
client = genai.Client(api_key=GEMINI_API_KEY)


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
    "Pepper__bell___Bacterial_spot": {
        "name": "Pepper Bacterial Spot",
        "crop": "Pepper",
        "description": "Caused by Xanthomonas bacteria. Affects leaves, stems and fruits of bell pepper plants.",
        "symptoms": ["Small water-soaked spots on leaves", "Spots turn brown with yellow halos", "Raised scab-like spots on fruits", "Defoliation in severe cases"],
        "treatment": ["Apply copper-based bactericide every 7 days", "Remove and destroy infected plant parts", "Avoid working in wet conditions"],
        "prevention": ["Use certified disease-free seeds", "Avoid overhead irrigation", "Rotate crops every season", "Space plants for good airflow"]
    },
    "Pepper__bell___healthy": {
        "name": "Healthy Pepper Plant",
        "crop": "Pepper",
        "description": "No disease detected. Your pepper plant appears healthy!",
        "symptoms": [],
        "treatment": [],
        "prevention": ["Continue regular monitoring", "Maintain proper irrigation", "Use balanced fertilizers", "Practice crop rotation"]
    },
    "Potato___Early_blight": {
        "name": "Potato Early Blight",
        "crop": "Potato",
        "description": "Caused by Alternaria solani. Affects potato leaves reducing photosynthesis and yield.",
        "symptoms": ["Dark brown spots with concentric rings", "Yellow halos around spots", "Lower leaves affected first", "Premature leaf drop"],
        "treatment": ["Apply Mancozeb or Chlorothalonil fungicide", "Remove infected leaves immediately", "Spray every 7-10 days during wet weather"],
        "prevention": ["Rotate crops every season", "Avoid overhead watering", "Use disease-resistant varieties", "Destroy crop debris after harvest"]
    },
    "Potato___Late_blight": {
        "name": "Potato Late Blight",
        "crop": "Potato",
        "description": "Caused by Phytophthora infestans. Extremely destructive disease that spreads rapidly.",
        "symptoms": ["Water-soaked dark lesions on leaves", "White mold on leaf undersides", "Brown rotting stems", "Tubers develop reddish-brown rot"],
        "treatment": ["Apply Ridomil Gold or Revus fungicide immediately", "Remove and destroy all infected plants", "Do not compost infected material"],
        "prevention": ["Plant certified disease-free seed potatoes", "Ensure good field drainage", "Monitor weather forecasts", "Avoid overhead irrigation"]
    },
    "Potato___healthy": {
        "name": "Healthy Potato Plant",
        "crop": "Potato",
        "description": "No disease detected. Your potato plant appears healthy!",
        "symptoms": [],
        "treatment": [],
        "prevention": ["Continue regular monitoring", "Maintain proper irrigation", "Use balanced fertilizers", "Practice crop rotation"]
    },
    "Tomato_Bacterial_spot": {
        "name": "Tomato Bacterial Spot",
        "crop": "Tomato",
        "description": "Caused by Xanthomonas bacteria. Affects leaves, stems and fruits causing significant yield loss.",
        "symptoms": ["Small dark water-soaked spots on leaves", "Spots with yellow halos", "Raised scab-like lesions on fruits", "Severe defoliation"],
        "treatment": ["Apply copper-based bactericide", "Remove infected plant parts", "Avoid working in wet fields"],
        "prevention": ["Use disease-free certified seeds", "Avoid overhead irrigation", "Rotate crops", "Disinfect tools regularly"]
    },
    "Tomato_Early_blight": {
        "name": "Tomato Early Blight",
        "crop": "Tomato",
        "description": "A fungal disease caused by Alternaria solani. Appears as dark brown spots with concentric rings on older leaves.",
        "symptoms": ["Dark brown circular spots with target-board rings", "Yellow halos around spots", "Affected leaves turn yellow and drop", "Stem lesions near soil level"],
        "treatment": ["Apply copper-based fungicide every 7-10 days", "Remove and destroy infected leaves immediately", "Use Mancozeb or Chlorothalonil fungicide"],
        "prevention": ["Rotate crops every season", "Avoid overhead watering", "Space plants for good airflow", "Use disease-resistant varieties"]
    },
    "Tomato_Late_blight": {
        "name": "Tomato Late Blight",
        "crop": "Tomato",
        "description": "Caused by Phytophthora infestans. Very destructive, spreads rapidly in cool wet conditions.",
        "symptoms": ["Water-soaked gray-green spots", "White fuzzy mold on leaf undersides", "Dark brown stem lesions", "Fruit rots rapidly"],
        "treatment": ["Apply Ridomil Gold or Revus fungicide", "Remove infected plants completely", "Avoid working in wet fields"],
        "prevention": ["Plant resistant varieties", "Ensure good drainage", "Avoid overhead irrigation", "Monitor weather for high-risk periods"]
    },
    "Tomato_Leaf_Mold": {
        "name": "Tomato Leaf Mold",
        "crop": "Tomato",
        "description": "Caused by Passalora fulva fungus. Common in humid greenhouse and field conditions.",
        "symptoms": ["Pale green or yellow spots on upper leaf surface", "Olive-green to brown mold on undersides", "Leaves curl and dry out", "Severe cases cause defoliation"],
        "treatment": ["Apply fungicide containing Chlorothalonil or Mancozeb", "Improve ventilation around plants", "Remove heavily infected leaves"],
        "prevention": ["Reduce humidity by spacing plants well", "Avoid overhead watering", "Use resistant varieties", "Ensure good air circulation"]
    },
    "Tomato_Septoria_leaf_spot": {
        "name": "Tomato Septoria Leaf Spot",
        "crop": "Tomato",
        "description": "Caused by Septoria lycopersici fungus. One of the most common tomato diseases.",
        "symptoms": ["Small circular spots with dark borders and light centers", "Tiny black dots inside spots", "Lower leaves affected first", "Rapid defoliation"],
        "treatment": ["Apply Mancozeb or copper fungicide", "Remove infected leaves immediately", "Spray every 7-10 days in wet weather"],
        "prevention": ["Rotate crops", "Mulch around plants", "Avoid wetting leaves when watering", "Remove plant debris after harvest"]
    },
    "Tomato_Spider_mites_Two_spotted_spider_mite": {
        "name": "Tomato Spider Mites",
        "crop": "Tomato",
        "description": "Caused by two-spotted spider mites. Worse in hot dry conditions, causes significant damage.",
        "symptoms": ["Tiny yellow or white speckles on leaves", "Fine webbing on undersides of leaves", "Leaves turn bronze and dry out", "Stunted plant growth"],
        "treatment": ["Apply miticide or insecticidal soap", "Spray forceful water jets to dislodge mites", "Use neem oil spray"],
        "prevention": ["Keep plants well watered during dry spells", "Introduce predatory mites", "Avoid dusty conditions", "Monitor regularly under leaves"]
    },
    "Tomato__Target_Spot": {
        "name": "Tomato Target Spot",
        "crop": "Tomato",
        "description": "Caused by Corynespora cassiicola fungus. Produces distinctive target-like lesions on leaves and fruit.",
        "symptoms": ["Brown circular lesions with concentric rings", "Yellow halos around lesions", "Lesions on stems and fruits", "Premature leaf drop"],
        "treatment": ["Apply Azoxystrobin or Chlorothalonil fungicide", "Remove infected plant material", "Improve air circulation"],
        "prevention": ["Avoid overhead irrigation", "Space plants adequately", "Rotate crops", "Remove crop debris after harvest"]
    },
    "Tomato__Tomato_YellowLeaf__Curl_Virus": {
        "name": "Tomato Yellow Leaf Curl Virus",
        "crop": "Tomato",
        "description": "A viral disease spread by whiteflies. One of the most damaging tomato viruses worldwide.",
        "symptoms": ["Upward curling and yellowing of leaves", "Stunted plant growth", "Reduced fruit set", "Small distorted leaves"],
        "treatment": ["No chemical cure — remove infected plants", "Control whitefly with insecticide", "Use reflective mulches to repel whiteflies"],
        "prevention": ["Plant resistant varieties", "Use whitefly-proof nets", "Apply neem oil to control whiteflies", "Remove infected plants early"]
    },
    "Tomato__Tomato_mosaic_virus": {
        "name": "Tomato Mosaic Virus",
        "crop": "Tomato",
        "description": "A highly infectious viral disease spread by contact and insects. Can devastate entire crops.",
        "symptoms": ["Mosaic yellow-green pattern on leaves", "Leaf distortion and curling", "Stunted growth", "Reduced and deformed fruits"],
        "treatment": ["No chemical cure — remove and destroy infected plants", "Disinfect all tools with bleach solution", "Control insect vectors"],
        "prevention": ["Use certified virus-free seeds", "Wash hands before handling plants", "Control aphids and other vectors", "Remove infected plants immediately"]
    },
    "Tomato_healthy": {
        "name": "Healthy Tomato Plant",
        "crop": "Tomato",
        "description": "No disease detected. Your tomato plant appears healthy!",
        "symptoms": [],
        "treatment": [],
        "prevention": ["Continue regular monitoring", "Maintain proper irrigation", "Use balanced fertilizers", "Practice crop rotation"]
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

CLASS_NAME_MAP = {
    "Pepper__bell___Bacterial_spot": "Pepper__bell___Bacterial_spot",
    "Pepper__bell___healthy": "Pepper__bell___healthy",
    "Potato___Early_blight": "Potato___Early_blight",
    "Potato___Late_blight": "Potato___Late_blight",
    "Potato___healthy": "Potato___healthy",
    "Tomato_Bacterial_spot": "Tomato_Bacterial_spot",
    "Tomato_Early_blight": "Tomato_Early_blight",
    "Tomato_Late_blight": "Tomato_Late_blight",
    "Tomato_Leaf_Mold": "Tomato_Leaf_Mold",
    "Tomato_Septoria_leaf_spot": "Tomato_Septoria_leaf_spot",
    "Tomato_Spider_mites_Two_spotted_spider_mite": "Tomato_Spider_mites_Two_spotted_spider_mite",
    "Tomato__Target_Spot": "Tomato__Target_Spot",
    "Tomato__Tomato_YellowLeaf__Curl_Virus": "Tomato__Tomato_YellowLeaf__Curl_Virus",
    "Tomato__Tomato_mosaic_virus": "Tomato__Tomato_mosaic_virus",
    "Tomato_healthy": "Tomato_healthy",
}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# from tensorflow.keras.preprocessing import image as keras_image
from keras.utils import load_img, img_to_array
from keras.models import load_model


# Load class names
with open('class_names.json', 'r') as f:
    CLASS_NAMES = json.load(f)

# def load_models():
#    plant_model = load_model('models/plant_disease_model.keras', compile=False)
#    return plant_model

from keras.applications import MobileNetV2
from keras.models import Sequential
from keras.layers import GlobalAveragePooling2D, BatchNormalization, Dense, Dropout
import numpy as np

def load_models():
    base = MobileNetV2(input_shape=(224,224,3), include_top=False, weights=None)
    model = Sequential([
        base,
        GlobalAveragePooling2D(),
        BatchNormalization(),
        Dense(256, activation='relu'),
        Dropout(0.4),
        Dense(128, activation='relu'),
        Dropout(0.3),
        Dense(15, activation='softmax')
    ])
    weights = np.load('models/model_weights.npy', allow_pickle=True)
    model.set_weights(weights)
    return model

"""
    Load both AI models.
    Replace placeholder with real model loading once you have trained models.

    Example:
        import tensorflow as tf
        plant_model = tf.keras.models.load_model('models/plant_disease_model.h5')
        ghana_model = tf.keras.models.load_model('models/ghana_plant_model.h5')
        return plant_model, ghana_model
"""

    
def predict_with_gemini(image_path):
    from google.genai import types
    import json
    
    try:
        with open(image_path, 'rb') as f:
            image_bytes = f.read()
        
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type='image/jpeg'),
                """You are a plant disease expert. Analyze this plant leaf image.
                Respond in JSON only, no markdown:
                {
                    "disease": "disease name or Healthy",
                    "confidence": 85,
                    "description": "brief description of the disease",
                    "symptoms": ["symptom 1", "symptom 2", "symptom 3"],
                    "treatment": ["treatment step 1", "treatment step 2"],
                    "prevention": ["prevention tip 1", "prevention tip 2"],
                    "severity": "Low/Medium/High"
                }"""
            ]
        )
        print(f"Gemini raw response: {response.text}") 
        result = json.loads(response.text.strip().replace('```json','').replace('```',''))
        print(f"Gemini result: {result}")
        return result

    except Exception as e:
        print(f"Gemini unavailable: {e}")
        return None  # ← this triggers fallback to your model

def predict_disease(image_path, model, crop_type=None):
    img = load_img(image_path, target_size=(224, 224))
    img_array = img_to_array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    predictions = model.predict(img_array, verbose=0)
    predicted_index = np.argmax(predictions[0])
    predicted_class = CLASS_NAMES[predicted_index]
    predicted_class = CLASS_NAME_MAP.get(predicted_class, predicted_class)
    confidence = round(float(predictions[0][predicted_index]) * 100, 1)

    print(f"Predicted index: {predicted_index}")          # add this
    print(f"Predicted class: {predicted_class}")          # add this
    print(f"Confidence: {confidence}%")                   # add this
    print(f"Top 3 indices: {predictions[0].argsort()[-3:][::-1]}")

   # If confidence is low, flag it
    if confidence < 70:
        predicted_class = "uncertain"


    return predicted_class, confidence

    # ─────────────────────────────────────────────────

# Load models once at startup
# plant_model, ghana_model = load_models()
plant_model = load_models()

# ── ROUTES ────────────────────────────────────────────────────────────────────

@app.route('/analyze', methods=['POST', 'OPTIONS'])
def analyze():
    global plant_model
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

    # disease_key, confidence = predict_disease(filepath, plant_model, ghana_model, crop_type)

    # Step 1: Try Gemini first
    gemini_result = predict_with_gemini(filepath)
    
    if gemini_result and gemini_result['confidence'] >= 80:
        # Gemini confident — use its result
        disease_key = gemini_result['disease']
        confidence = gemini_result['confidence']
        disease_data = {
            'name': disease_key,
            'crop': crop_type,
            'description': gemini_result.get('description', ''),
            'symptoms': gemini_result.get('symptoms', []),
            'treatment': gemini_result.get('treatment', []),
            'prevention': gemini_result.get('prevention', []),
        }
    else:
        # Step 2: Gemini unavailable or low confidence — use MobileNet2 model
        disease_key, confidence = predict_disease(filepath, plant_model, crop_type)
        
        if confidence < 70:
            # Step 3: Model not confident either — return uncertain
            return jsonify({
                'success': True,
                'disease_key': 'Uncertain',
                'name': 'Uncertain',
                'crop': crop_type,
                'confidence': confidence,
                'description': 'The image could not be identified with enough confidence. Please try a clearer image with better lighting.',
                'symptoms': [],
                'treatment': [],
                'prevention': ['Take a clearer photo in good lighting', 'Ensure the diseased area is visible', 'Try again or consult an agricultural officer'],
            })
        else:
            disease_data = DISEASE_INFO.get(disease_key, DISEASE_INFO['Healthy'])
    
    return jsonify({
        'success': True,
        'disease_key': disease_key,
        'confidence': confidence,
        **disease_data
    })

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    # host='0.0.0.0' makes Flask accessible from your phone on the same Wi-Fi
    app.run(debug=True, host='0.0.0.0', port=5001)

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
