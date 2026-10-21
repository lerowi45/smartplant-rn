
//this file handles all communication between the react native app
//and the flask backend API.
//

//CONFIGURATION
//change this to the Flask server address:
//testing on your laptop: 'http://192.168.x.x:5000' - use the PC's local IP


//find your local IP on Windows: open Command Prompt and type 'ipconfig'
//find your local IP on Mac/Linux: open Terminal and type 'ifconfig'
//the phone and laptop must be on the SAME Wi-Fi network for local testing!

//export const API_BASE_URL = 'https://smartplant-rn-production.up.railway.app'; // ← UPDATE THIS (to the IP and port of your Flask server)
export const API_BASE_URL = 'https://glacial-padded-fastness.ngrok-free.dev'; // ← UPDATE THIS (to the IP and port of your Flask server)

//Desease detection

/**
 * Send an image to the Flask backend for disease detection.
 * @param {string} imageUri    - local URI of the image (from image picker)
 * @param {string} cropType    - the crop selected by the user (e.g. 'tomato', 'cassava', 'maize')
 * @returns {Promise<object>}  - disease prediction result from Flask
 */
export async function analyzeImage(imageUri, cropType = 'general') {
  //build a FormData object. This is how we send images over HTTP
  const formData = new FormData();

  //get the filename and file type from the URI
  const filename = imageUri.split('/').pop();
  const fileType = filename.split('.').pop().toLowerCase();
  const mimeType = fileType === 'jpg' || fileType === 'jpeg'
    ? 'image/jpeg'
    : fileType === 'png'
    ? 'image/png'
    : 'image/webp';

  //attach the image to the form
  formData.append('image', {
    uri: imageUri,
    name: filename,
    type: mimeType,
  });

  //attach the crop type selected by the user (sent to flask for context)
  formData.append('crop_type', cropType);

  //send to flask
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
 *check if the flask server is reachable.
 *call this on app startup to warn the user if server is offline.
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
