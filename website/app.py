import os
import cv2
import numpy as np
import base64
from flask import Flask, render_template, request, jsonify
from ultralytics import YOLO

app = Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True

# ==========================================
# 1. LOAD AI MODEL ONCE (GLOBAL SCOPE)
# ==========================================
# We load the model here, OUTSIDE the route. 
# If you put this inside the route, Flask will try to load the 
# massive model file from your hard drive every single time 
# a user clicks "Upload", which will crash the server.
print("Loading YOLO Model into memory...")
model = YOLO('best.pt') 
print("YOLO Model loaded successfully!")

# ==========================================
# 2. FRONTEND ROUTE (Serves the Dashboard)
# ==========================================
@app.route("/")
def home():
    return render_template("index.html")

# ==========================================
# 3. BACKEND API ROUTE (Handles the Image)
# ==========================================
@app.route('/api/validate_hotspot', methods=['POST'])
def validate_hotspot():
    # Security check: did they actually attach an image?
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    file = request.files['image']
    
    # Read the image directly into RAM (avoids hard drive clutter)
    img_bytes = file.read()
    np_img = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

    # Run YOLO Inference
    results = model(img)
    
    # Extract Counts dynamically
    counts = {}
    for box in results[0].boxes:
        cls_id = int(box.cls[0])
        cls_name = model.names[cls_id]
        counts[cls_name] = counts.get(cls_name, 0) + 1

    # Generate the Annotated Image (with glowing bounding boxes)
    annotated_img = results[0].plot() 
    
    # Compress and encode to Base64 so the browser can read it as text
    _, buffer = cv2.imencode('.jpg', annotated_img)
    img_base64 = base64.b64encode(buffer).decode('utf-8')

    # Return the dual-payload
    return jsonify({
        'counts': counts,
        'image_base64': f"data:image/jpeg;base64,{img_base64}"
    })

if __name__ == "__main__":
    app.run(debug=True)