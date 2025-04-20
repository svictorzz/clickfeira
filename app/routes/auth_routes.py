from flask import Blueprint, request, session, jsonify
from functools import wraps
from app.services.auth_service import(
    login_user,
    register_user,
    recover_password,
    users
)

#funcao pra validar se o usuario ta logado, algumas telas so vao carregar se essa funcao for verdadeira

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'username' not in session:
            return jsonify({"message": "Usuário não autenticado."}), 401
        return f(*args, **kwargs)
    return decorated_function


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

@auth_bp.route('/me', methods=['GET'])
@login_required
def me():
    username = session.get('username')
    return jsonify({"username": username}), 200

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"message": "Usuário e senha são obrigatórios."}), 400

    if register_user(username, password):
        return jsonify({"message": "Usuário registrado com sucesso!"}), 201
    else:
        return jsonify({"message": "Usuário já existe."}), 409
    
@auth_bp.route('/users', methods=['GET'])
def get_users():
    return jsonify(users), 200

@auth_bp.route('/recover-password', methods=['POST'])
def recover_password_route():
    data = request.json
    username = data.get('username')

    if not username:
        return jsonify({"message": "O usuário é obrigatório."}), 400
    
    new_password = recover_password(username)

    if new_password:
        return jsonify({
            "message": "Senha redefinida com sucesso!",
            "new_password": new_password
        }), 200
    else:
        return jsonify({"message": "Usuário não encontrado."}), 404