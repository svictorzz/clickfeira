from flask import Blueprint, request, session, jsonify
from functools import wraps
from app.services.auth_service import (
    login_user,
    register_user,
    recover_password,
    list_all_comerciantes
)

auth_bp = Blueprint('auth', __name__)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'email' not in session:
            return jsonify({"message": "Usuário não autenticado."}), 401
        return f(*args, **kwargs)
    return decorated_function

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    senha = data.get('senha')
    if not email or not senha:
        return jsonify({"message": "Email e senha são obrigatórios."}), 400

    if login_user(email, senha):
        session['email'] = email
        return jsonify({"message": "Login realizado com sucesso!"}), 200
    return jsonify({"message": "Credenciais inválidas."}), 401

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    session.pop('email', None)
    return jsonify({"message": "Logout realizado com sucesso!"}), 200

@auth_bp.route('/me', methods=['GET'])
@login_required
def me():
    return jsonify({"email": session['email']}), 200

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    required = ['nome','email','senha','contato','cpf','endereco']
    if not all(field in data for field in required):
        return jsonify({"message": "Todos os campos são obrigatórios."}), 400

    if register_user(data):
        return jsonify({"message": "Comerciante registrado com sucesso!"}), 201
    return jsonify({"message": "Email já cadastrado."}), 409

@auth_bp.route('/users', methods=['GET'])
def get_users():
    return jsonify(list_all_comerciantes()), 200

@auth_bp.route('/recover-password', methods=['POST'])
def recover_password_route():
    data = request.get_json()
    email = data.get('email')
    if not email:
        return jsonify({"message": "Email é obrigatório."}), 400

    new_password = recover_password(email)
    if new_password:
        return jsonify({
            "message": "Senha redefinida com sucesso!",
            "new_password": new_password
        }), 200
    return jsonify({"message": "Email não encontrado."}), 404
