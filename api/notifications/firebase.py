import firebase_admin
from firebase_admin import credentials

def initialize_firebase():
    """
    Initialize Firebase only once globally.
    """
    if not firebase_admin._apps:
        cred = credentials.Certificate("eatoor-firebase-configuration.json")
        firebase_admin.initialize_app(cred)
        print("Firebase initialized successfully!")
