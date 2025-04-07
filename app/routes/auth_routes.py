from flask import Blueprint, request, session, jsonify
from app.services.auth_service import login_user
from app.services.auth_service import register_user
from app.services.auth_service import users

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if login_user(username, password):
        session['username'] = username
        return jsonify({"message": "Login realizado com sucesso!"}), 200
    else:
        return jsonify({"message": "Credenciais inválidas"}), 401

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.pop('username', None)
    return jsonify({"message": "Logout realizado com sucesso!"}), 200

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"message": "Username e password são obrigatórios."}), 400

    if register_user(username, password):
        return jsonify({"message": "Usuário registrado com sucesso!"}), 201
    else:
        return jsonify({"message": "Usuário já existe."}), 409
    
@auth_bp.route('/users', methods=['GET'])
def get_users():
    return jsonify(users), 200