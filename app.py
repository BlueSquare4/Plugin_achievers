from flask import Flask, request, jsonify, render_template, redirect, session, request
from flask_cors import CORS
from lib.speech_to_text import transcribe_audio
import os
import boto3
from werkzeug.utils import secure_filename
import firebase_admin
from firebase_admin import credentials, auth
import requests

# Initialize Firebase Admin SDK
cred = credentials.Certificate("plugin-13a90-firebase-adminsdk-vmexp-acbd16495e.json")
firebase_admin.initialize_app(cred)

# Firebase REST API URL
FIREBASE_API_KEY = "AIzaSyBW_OsEoa0vkiVs3qbZsFmDX2Q2NN2Qih8"
FIREBASE_SIGNUP_URL = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={FIREBASE_API_KEY}"
FIREBASE_SIGNIN_URL = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"

app = Flask(__name__)
CORS(app, origins=["*"], allow_headers=["*"], methods=["GET", "POST", "OPTIONS"])

# Flask Configuration
app.secret_key = "your-secret-key"  # Replace with a strong secret key
app.config["UPLOAD_FOLDER"] = "uploads"
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

# AWS S3 Configuration
s3 = boto3.client(
    "s3",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION"),
)
BUCKET_NAME = os.getenv("S3_BUCKET_NAME")

@app.route("/")
def index():
    # Check if user is logged in
    if "user" not in session:
        # If not logged in, redirect to Sign In page
        return redirect("/signin")
    # If logged in, show the main page
    return render_template("index.html")

@app.route("/home")
def home():
    return render_template("index.html")

@app.route("/signin", methods=["POST"])
def signin():
    if request.method == "POST":
        # Extract email and password from JSON
        data = request.json
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        # Authenticate with Firebase REST API
        response = requests.post(FIREBASE_SIGNIN_URL, json={"email": email, "password": password, "returnSecureToken": True})
        if response.status_code == 200:
            user_data = response.json()
            session["user"] = {"email": user_data["email"], "idToken": user_data["idToken"]}

            return jsonify({"message": "Sign-In successful", "redirect": "/"}), 200
        else:
            return jsonify({"error": "Invalid email or password"}), 401

    # If method is not POST, return an error
    return jsonify({"error": "Invalid request method. Use POST."}), 405


# @app.route("/signin", methods=["POST"])
# def signin():
#     if request.method == "POST":
#         # Check if data is sent as JSON
#         if not request.is_json:
#             return jsonify({"error": "Invalid request format. Expected JSON."}), 400

#         # Extract email and password from JSON
#         data = request.json
#         email = data.get("email")
#         password = data.get("password")

#         if not email or not password:
#             return jsonify({"error": "Email and password are required"}), 400

#         # Authenticate with Firebase REST API
#         response = requests.post(FIREBASE_SIGNIN_URL, json={"email": email, "password": password, "returnSecureToken": True})
#         if response.status_code == 200:
#             user_data = response.json()
#             # Save the user's session with idToken
#             session["user"] = {"email": user_data["email"], "idToken": user_data["idToken"]}
#             return jsonify({"message": "Sign-In successful"}), 200
#         else:
#             return jsonify({"error": "Invalid email or password"}), 401



@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        # Extract user data from request
        data = request.json
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")

        try:
            # Create user in Firebase Authentication
            user = auth.create_user(email=email, password=password)
            
            # Save additional user data in the database (e.g., Firestore or SQL)
            # Example: Using Firestore
            from firebase_admin import firestore
            db = firestore.client()
            db.collection("users").document(user.uid).set({
                "name": name,
                "email": email,
                "uid": user.uid
            })

            return jsonify({"message": f"User {name} created successfully"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 400

    # Render the Sign-Up page for GET request
    return render_template("signup.html")


@app.route("/upload", methods=["POST"])
def upload_video():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(filepath)

    # Upload to S3
    s3.upload_file(filepath, BUCKET_NAME, filename)
    s3_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{filename}"

    # Transcribe Audio
    transcript = transcribe_audio(filepath)
    return jsonify({"transcript": transcript, "file_url": s3_url})


@app.route("/api/session-logout", methods=["POST"])
def session_logout():
    session.pop("user", None)
    return jsonify({"message": "Session cleared"}), 200


@app.route("/api/protected", methods=["GET"])
def protected():
    if "user" in session:
        return jsonify({"message": "You are authorized", "user": session["user"]}), 200
    else:
        return jsonify({"error": "Unauthorized"}), 401
    
@app.route("/logout")
def logout():
    # Clear the session
    session.pop("user", None)
    return redirect("/signin")


if __name__ == "__main__":
    app.run(debug=True)
