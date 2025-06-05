from flask import Blueprint, request, session, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from functools import wraps
from app.services.auth_service import (
    login_user, register_user, recover_password, change_password
)

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

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

    user = login_user(email, senha)
    if user:
        token = create_access_token(identity=email)
        return jsonify({
            "message": "Login realizado com sucesso!",
            "token": token,
            "idComerciante": user.get("idComerciante") 
        }), 200

    return jsonify({"message": "Credenciais inválidas."}), 401

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    session.pop('email', None)
    return jsonify({"message": "Logout realizado com sucesso!"}), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    email = get_jwt_identity() 
    return jsonify({"email": email}), 200

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    required = ['nome', 'email', 'senha', 'telefone', 'cpf', 'endereco']
    
    if any(field not in data or not data[field] for field in required):
        return jsonify({"message": "Todos os campos são obrigatórios."}), 400

    if register_user(data):
        return jsonify({"message": "Comerciante registrado com sucesso!"}), 201
    return jsonify({"message": "Email já cadastrado."}), 409

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

@auth_bp.route('/edit-info', methods=['POST'])
@jwt_required()
def edit_info_route():
    email = get_jwt_identity()
    data = request.get_json()

    new_email = data.get("new_email")
    new_address = data.get("new_address")
    new_phone = data.get("new_phone")

    if not any([new_email, new_address, new_phone]):
        return jsonify({"message": "Preencha pelo menos um campo para atualizar."}), 400

    success = edit_user_info(
        email=email,
        new_email=new_email,
        new_address=new_address,
        new_phone=new_phone
    )

    if success:
        return jsonify({"message": "Informações alteradas com sucesso!"}), 200
    else:
        return jsonify({"message": "Usuário não encontrado."}), 404

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password_route():
    email = get_jwt_identity()
    data = request.get_json()

    old_password = data.get("old_password")
    new_password = data.get("new_password")
    confirm_new_password = data.get("confirm_new_password")

    if not old_password or not new_password or not confirm_new_password:
        return jsonify({"message": "Senha antiga, nova senha e confirmação são obrigatórias."}), 400

    if new_password != confirm_new_password:
        return jsonify({"message": "As senhas não coincidem."}), 400

    if change_password(email, old_password, new_password):
        return jsonify({"message": "Senha alterada com sucesso!"}), 200

    return jsonify({"message": "Senha incorreta ou usuário não encontrado."}), 400