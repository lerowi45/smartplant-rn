
#prediction flow: MobileNetV2 (primary) → gemini (fallback) → uncertain

import os
import json
import numpy as np
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from google import genai

load_dotenv()

#app config
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}

#gemini client
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
client = genai.Client(api_key=GEMINI_API_KEY)

#cors
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin']  = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response

#health check
@app.route('/health', methods=['GET', 'OPTIONS'])
def health():
    return jsonify({'status': 'ok', 'message': 'SmartPlant AI server is running'})

#disease info database (30 classes)
DISEASE_INFO = {
    #cassava
    "Cassava_Cassava_Bacterial_Blight_CBB": {
        "name": "Cassava Bacterial Blight",
        "crop": "Cassava",
        "description": "Caused by Xanthomonas axonopodis pv. manihotis. A serious bacterial disease causing wilting and stem die-back, common in Ghana.",
        "symptoms": ["Angular water-soaked leaf spots", "Wilting of leaves and stems", "Gummy exudate on stems", "Die-back from stem tips"],
        "treatment": ["Remove and burn infected plants immediately", "Apply copper-based bactericide", "Use clean uninfected planting material"],
        "prevention": ["Use resistant varieties", "Avoid working in fields when wet", "Disinfect cutting tools between plants", "Rotate crops"]
    },
    "Cassava_Cassava_Brown_Streak_Disease_CBSD": {
        "name": "Cassava Brown Streak Disease",
        "crop": "Cassava",
        "description": "A viral disease caused by Cassava brown streak virus, spreading rapidly through East and West Africa. Causes severe tuber necrosis.",
        "symptoms": ["Yellow streaks on leaves", "Brown corky patches inside tubers", "Stunted growth", "Feathery chlorosis on leaves"],
        "treatment": ["No cure — remove and destroy infected plants immediately", "Use virus-tested clean planting material"],
        "prevention": ["Plant certified virus-free cuttings", "Use tolerant varieties", "Control whitefly vectors", "Monitor crops regularly"]
    },
    "Cassava_Cassava_Green_Mottle_CGM": {
        "name": "Cassava Green Mottle",
        "crop": "Cassava",
        "description": "Caused by Cassava green mottle virus. Affects cassava leaves causing a distinctive green mottled appearance and reduced yield.",
        "symptoms": ["Green mottled pattern on leaves", "Mild leaf distortion", "Reduced plant vigour", "Slightly stunted growth"],
        "treatment": ["Remove and destroy severely infected plants", "Control insect vectors that spread the virus", "Use clean planting material"],
        "prevention": ["Use virus-free certified cuttings", "Control whitefly and other insect vectors", "Monitor fields regularly", "Rogue out infected plants early"]
    },
    "Cassava_Cassava_Mosaic_Disease_CMD": {
        "name": "Cassava Mosaic Disease",
        "crop": "Cassava",
        "description": "Caused by cassava mosaic viruses transmitted by whiteflies. The most devastating cassava disease in Ghana, causing severe yield losses.",
        "symptoms": ["Yellow and green mosaic pattern on leaves", "Leaf distortion and curling", "Stunted plant growth", "Severely reduced tuber yield"],
        "treatment": ["No chemical cure — remove and destroy infected plants", "Control whitefly with insecticides or neem oil", "Replant with clean certified cuttings"],
        "prevention": ["Use virus-free planting material", "Plant resistant varieties such as TME 419", "Control whitefly with neem-based sprays", "Remove infected plants early (roguing)"]
    },
    "Cassava_Healthy": {
        "name": "Healthy Cassava Plant",
        "crop": "Cassava",
        "description": "No disease detected. Your cassava plant appears healthy!",
        "symptoms": [],
        "treatment": [],
        "prevention": ["Continue regular monitoring", "Use certified disease-free planting material", "Control weeds and pests", "Practice crop rotation"]
    },
    #maize
    "Maize_Blight": {
        "name": "Maize Northern Leaf Blight",
        "crop": "Maize",
        "description": "Caused by Exserohilum turcicum. A major foliar disease of maize that can cause significant yield losses in Ghana.",
        "symptoms": ["Long cigar-shaped gray-green lesions on leaves", "Lesions turn tan or brown over time", "Appears first on lower leaves", "Severe cases cause complete leaf death"],
        "treatment": ["Apply Azoxystrobin or Propiconazole fungicide at early stages", "Remove heavily infected crop debris after harvest", "Improve field drainage"],
        "prevention": ["Use resistant hybrid maize varieties", "Rotate maize with legumes", "Avoid dense planting", "Remove crop debris after harvest"]
    },
    "Maize_Common_Rust": {
        "name": "Maize Common Rust",
        "crop": "Maize",
        "description": "Caused by Puccinia sorghi. A fungal disease producing distinctive rust-coloured pustules on maize leaves.",
        "symptoms": ["Small brick-red to brown pustules on both leaf surfaces", "Pustules turn dark brown as they mature", "Leaves turn yellow around pustules", "Severe infection causes leaf death"],
        "treatment": ["Apply Mancozeb or Propiconazole fungicide", "Remove and destroy heavily infected plant material", "Apply fungicide at early signs of infection"],
        "prevention": ["Plant resistant maize varieties", "Avoid planting in cool humid conditions", "Rotate crops", "Monitor fields regularly"]
    },
    "Maize_Gray_Leaf_Spot": {
        "name": "Maize Gray Leaf Spot",
        "crop": "Maize",
        "description": "Caused by Cercospora zeae-maydis. A serious fungal disease favoured by warm humid conditions common in Ghana.",
        "symptoms": ["Rectangular gray to tan lesions on leaves", "Lesions bounded by leaf veins", "Lesions may merge causing large dead areas", "Lower leaves affected first"],
        "treatment": ["Apply Azoxystrobin or Trifloxystrobin fungicide", "Remove infected debris", "Improve air circulation between plants"],
        "prevention": ["Use resistant hybrid varieties", "Rotate crops — avoid planting maize on maize", "Reduce plant density", "Remove crop residue after harvest"]
    },
    "Maize_Healthy": {
        "name": "Healthy Maize Plant",
        "crop": "Maize",
        "description": "No disease detected. Your maize plant appears healthy!",
        "symptoms": [],
        "treatment": [],
        "prevention": ["Continue regular monitoring", "Maintain proper spacing", "Use balanced fertilizers", "Practice crop rotation"]
    },
    #pepper
    "Pepper__bell___Bacterial_spot": {
        "name": "Pepper Bacterial Spot",
        "crop": "Pepper",
        "description": "Caused by Xanthomonas bacteria. Affects leaves, stems and fruits of bell pepper plants causing significant losses.",
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
    #Potato
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
        "description": "Caused by Phytophthora infestans. Extremely destructive disease that spreads rapidly in cool wet conditions.",
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
    #rice
    "Rice_Bacterial Leaf Blight": {
        "name": "Rice Bacterial Leaf Blight",
        "crop": "Rice",
        "description": "Caused by Xanthomonas oryzae pv. oryzae. One of the most serious rice diseases, capable of causing major yield losses.",
        "symptoms": ["Water-soaked to yellowish stripe on leaf margins", "Stripe turns yellow then white", "Leaves wilt and dry out", "Milky or opaque bacterial ooze on cut stem"],
        "treatment": ["Apply copper-based bactericide", "Remove and destroy infected plants", "Drain flooded fields to reduce spread"],
        "prevention": ["Use resistant rice varieties", "Use certified disease-free seeds", "Avoid excessive nitrogen fertilizer", "Ensure proper field drainage"]
    },
    "Rice_Brown Spot": {
        "name": "Rice Brown Spot",
        "crop": "Rice",
        "description": "Caused by Cochliobolus miyabeanus. A fungal disease associated with nutrient-deficient soils, common in Ghana's rice fields.",
        "symptoms": ["Oval to circular brown spots with gray or whitish centre", "Dark brown borders around spots", "Spots on leaves, leaf sheaths and grains", "Severe infection causes leaf death"],
        "treatment": ["Apply Mancozeb or Propiconazole fungicide", "Improve soil fertility — apply potassium and silicon", "Remove infected plant debris"],
        "prevention": ["Use balanced fertilizers especially potassium", "Use resistant varieties", "Treat seeds with fungicide before planting", "Maintain proper water management"]
    },
    "Rice_Healthy Rice Leaf": {
        "name": "Healthy Rice Plant",
        "crop": "Rice",
        "description": "No disease detected. Your rice plant appears healthy!",
        "symptoms": [],
        "treatment": [],
        "prevention": ["Continue regular monitoring", "Maintain proper water management", "Use balanced fertilizers", "Practice crop rotation"]
    },
    "Rice_Leaf Blast": {
        "name": "Rice Leaf Blast",
        "crop": "Rice",
        "description": "Caused by Magnaporthe oryzae. One of the most destructive rice diseases worldwide, causing diamond-shaped lesions on leaves.",
        "symptoms": ["Diamond or spindle-shaped lesions with gray centres", "Brown or reddish-brown borders around lesions", "Lesions merge causing large dead areas", "Leaves turn white and die in severe cases"],
        "treatment": ["Apply Tricyclazole or Isoprothiolane fungicide", "Spray at first sign of disease", "Avoid excessive nitrogen fertilizer"],
        "prevention": ["Plant blast-resistant varieties", "Avoid excessive nitrogen application", "Ensure proper spacing for air circulation", "Monitor fields especially during humid conditions"]
    },
    "Rice_Leaf scald": {
        "name": "Rice Leaf Scald",
        "crop": "Rice",
        "description": "Caused by Microdochium oryzae. A fungal disease producing distinctive scalded or bleached patches on rice leaves.",
        "symptoms": ["Pale yellowish-brown to straw-coloured lesions", "Wavy or irregular margins on lesions", "Scalded or bleached appearance on leaf tips", "Lesions may cover large portions of the leaf"],
        "treatment": ["Apply Propiconazole or Trifloxystrobin fungicide", "Remove infected crop debris", "Avoid water stress in the field"],
        "prevention": ["Use resistant varieties", "Avoid excessive nitrogen", "Maintain proper water management", "Remove crop residue after harvest"]
    },
    "Rice_Sheath Blight": {
        "name": "Rice Sheath Blight",
        "crop": "Rice",
        "description": "Caused by Rhizoctonia solani. A major rice disease in warm humid conditions, attacking the leaf sheath.",
        "symptoms": ["Oval to irregular greenish-gray lesions on leaf sheath", "Lesions with brown borders and gray centres", "Disease progresses upward from lower sheaths", "Leaves above infected sheath wilt and die"],
        "treatment": ["Apply Hexaconazole or Propiconazole fungicide", "Reduce plant density", "Drain field periodically to reduce humidity"],
        "prevention": ["Reduce nitrogen fertilizer rates", "Avoid dense planting", "Use tolerant varieties", "Maintain proper water management"]
    },
    #tomato
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
    #fallback
    "Healthy": {
        "name": "Healthy Plant",
        "crop": "General",
        "description": "No disease detected. The plant appears to be in good health. Keep up your current practices!",
        "symptoms": [],
        "treatment": [],
        "prevention": ["Continue regular monitoring", "Maintain proper irrigation", "Use balanced fertilizers", "Practice crop rotation"]
    }
}

#class name map
CLASS_NAME_MAP = {
    "Cassava_Cassava_Bacterial_Blight_CBB":           "Cassava_Cassava_Bacterial_Blight_CBB",
    "Cassava_Cassava_Brown_Streak_Disease_CBSD":       "Cassava_Cassava_Brown_Streak_Disease_CBSD",
    "Cassava_Cassava_Green_Mottle_CGM":               "Cassava_Cassava_Green_Mottle_CGM",
    "Cassava_Cassava_Mosaic_Disease_CMD":             "Cassava_Cassava_Mosaic_Disease_CMD",
    "Cassava_Healthy":                                "Cassava_Healthy",
    "Maize_Blight":                                   "Maize_Blight",
    "Maize_Common_Rust":                              "Maize_Common_Rust",
    "Maize_Gray_Leaf_Spot":                           "Maize_Gray_Leaf_Spot",
    "Maize_Healthy":                                  "Maize_Healthy",
    "Pepper__bell___Bacterial_spot":                  "Pepper__bell___Bacterial_spot",
    "Pepper__bell___healthy":                         "Pepper__bell___healthy",
    "Potato___Early_blight":                          "Potato___Early_blight",
    "Potato___Late_blight":                           "Potato___Late_blight",
    "Potato___healthy":                               "Potato___healthy",
    "Rice_Bacterial Leaf Blight":                     "Rice_Bacterial Leaf Blight",
    "Rice_Brown Spot":                                "Rice_Brown Spot",
    "Rice_Healthy Rice Leaf":                         "Rice_Healthy Rice Leaf",
    "Rice_Leaf Blast":                                "Rice_Leaf Blast",
    "Rice_Leaf scald":                                "Rice_Leaf scald",
    "Rice_Sheath Blight":                             "Rice_Sheath Blight",
    "Tomato_Bacterial_spot":                          "Tomato_Bacterial_spot",
    "Tomato_Early_blight":                            "Tomato_Early_blight",
    "Tomato_Late_blight":                             "Tomato_Late_blight",
    "Tomato_Leaf_Mold":                               "Tomato_Leaf_Mold",
    "Tomato_Septoria_leaf_spot":                      "Tomato_Septoria_leaf_spot",
    "Tomato_Spider_mites_Two_spotted_spider_mite":    "Tomato_Spider_mites_Two_spotted_spider_mite",
    "Tomato__Target_Spot":                            "Tomato__Target_Spot",
    "Tomato__Tomato_YellowLeaf__Curl_Virus":          "Tomato__Tomato_YellowLeaf__Curl_Virus",
    "Tomato__Tomato_mosaic_virus":                    "Tomato__Tomato_mosaic_virus",
    "Tomato_healthy":                                 "Tomato_healthy",
}

#helpers
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

#load class names
with open('class_names.json', 'r') as f:
    CLASS_NAMES = json.load(f)

#load model
#fix for keras version mismatch: quantization_config not recognized in older Keras
#this custom dense layer strips the unknown argument before passing to the real Dense
import keras
from keras.utils import load_img, img_to_array

class CompatDense(keras.layers.Dense):
    """Strips unknown kwargs (e.g. quantization_config) for cross-version compatibility."""
    def __init__(self, *args, **kwargs):
        kwargs.pop('quantization_config', None)
        super().__init__(*args, **kwargs)

    @classmethod
    def from_config(cls, config):
        config.pop('quantization_config', None)
        return super().from_config(config)

def load_models():
    print("Loading MobileNetV2 model...")
    
    #patch Dense.from_config to strip quantization_config before Keras sees it
    original_from_config = keras.layers.Dense.from_config
    
    @classmethod
    def patched_from_config(cls, config):
        config.pop('quantization_config', None)
        return original_from_config.__func__(cls, config)
    
    keras.layers.Dense.from_config = patched_from_config
    
    model = keras.models.load_model(
        'models/plant_disease_model.keras',
        compile=False
    )
    
    print(f"Model loaded successfully — {len(model.layers)} layers")
    return model

plant_model = load_models()

# MobileNet2 prediction (primary)
def predict_disease(image_path, model, crop_type=None):
    img = load_img(image_path, target_size=(224, 224))
    img_array = img_to_array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    predictions = model.predict(img_array, verbose=0)
    predicted_index = int(np.argmax(predictions[0]))
    predicted_class = CLASS_NAMES[predicted_index]
    predicted_class = CLASS_NAME_MAP.get(predicted_class, predicted_class)
    confidence = round(float(predictions[0][predicted_index]) * 100, 1)

    top3 = predictions[0].argsort()[-3:][::-1]
    print(f"MobileNetV2 → Class: {predicted_class} | Confidence: {confidence}%")
    print(f"Top 3: {[(CLASS_NAMES[i], round(float(predictions[0][i])*100,1)) for i in top3]}")

    return predicted_class, confidence

#gemini prediction (fallback)
def predict_with_gemini(image_path):
    try:
        #detect mime type from file extension
        ext = image_path.rsplit('.', 1)[-1].lower()
        mime_map = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp'}
        mime_type = mime_map.get(ext, 'image/jpeg')

        with open(image_path, 'rb') as f:
            image_bytes = f.read()

        #use the correct format for google genai SDK
        from google.genai import types

        prompt = """You are a plant disease expert. Analyze this plant leaf image.
Respond in JSON only, with no markdown formatting or code blocks. Example format:
{"disease": "disease name or Healthy", "confidence": 85, "description": "brief description", "symptoms": ["symptom 1", "symptom 2"], "treatment": ["step 1", "step 2"], "prevention": ["tip 1", "tip 2"], "severity": "Low"}"""

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                types.Part(inline_data=types.Blob(data=image_bytes, mime_type=mime_type)),
                types.Part(text=prompt)
            ]
        )

        print(f"Gemini raw response: {response.text}")
        # Strip any accidental markdown
        clean = response.text.strip().replace('```json', '').replace('```', '').strip()
        result = json.loads(clean)
        print(f"Gemini parsed result: {result}")
        return result

    except Exception as e:
        print(f"Gemini unavailable: {type(e).__name__}: {e}")
        return None

#analyze endpoint
@app.route('/analyze', methods=['POST', 'OPTIONS'])
def analyze():
    global plant_model

    print(f"Content-Type: {request.content_type}")
    print(f"Form: {request.form}")
    print(f"Files: {request.files}")

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

    try:
        #step 1: MobileNetV2 runs first (primary predictor) 
        disease_key, confidence = predict_disease(filepath, plant_model, crop_type)

        if confidence >= 75:
            #high confidence then use MobileNetV2 result directly
            print(f"✅ Using MobileNetV2 result (confidence: {confidence}%)")
            disease_data = DISEASE_INFO.get(disease_key, DISEASE_INFO['Healthy'])

        else:
            #step 2: low confidence then call Gemini as fallback 
            print(f"⚠️ MobileNetV2 confidence low ({confidence}%) — calling Gemini fallback")
            gemini_result = predict_with_gemini(filepath)

            if gemini_result:
                #gemini available then use its result
                print(f" ✅ Using Gemini result (confidence: {gemini_result.get('confidence', 'N/A')}%)")
                disease_key  = gemini_result.get('disease', 'Unknown')
                confidence   = gemini_result.get('confidence', confidence)
                disease_data = {
                    'name':        disease_key,
                    'crop':        crop_type,
                    'description': gemini_result.get('description', ''),
                    'symptoms':    gemini_result.get('symptoms', []),
                    'treatment':   gemini_result.get('treatment', []),
                    'prevention':  gemini_result.get('prevention', []),
                }
            else:
                #step 3: gemini unavailable then fall back to MobileNetV2 
                print(f"❌ Gemini unavailable — returning MobileNetV2 result")

                if confidence < 50:
                    #both failed and confidence very low then return uncertain
                    return jsonify({
                        'success':     True,
                        'disease_key': 'Uncertain',
                        'name':        'Uncertain',
                        'crop':        crop_type,
                        'confidence':  confidence,
                        'description': 'The image could not be identified with enough confidence. Please try a clearer image with better lighting.',
                        'symptoms':    [],
                        'treatment':   [],
                        'prevention':  [
                            'Take a clearer photo in good lighting',
                            'Ensure the diseased area fills the frame',
                            'Try again or consult an agricultural extension officer',
                        ],
                    })
                else:
                    #gemini down but MobileNetV2 has some confidence then use it
                    disease_data = DISEASE_INFO.get(disease_key, DISEASE_INFO['Healthy'])

        return jsonify({
            'success':     True,
            'disease_key': disease_key,
            'confidence':  confidence,
            **disease_data
        })

    except Exception as e:
        print(f"Analyze error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

#run
if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(debug=True, host='0.0.0.0', port=5001)
