import firebase_admin
from firebase_admin import credentials, db

cred = credentials.Certificate("credentials.json")

# Inicializar o Firebase
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://click-feira-default-rtdb.firebaseio.com/' 
    })

