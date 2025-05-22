from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.config_service import (
    list_all_comerciantes, update_dados_comerciante, delete_comerciante
)

config_bp = Blueprint('config', __name__, url_prefix='/config')

@config_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    return jsonify(list_all_comerciantes()), 200

@config_bp.route('/users/<string:comerciante_id>', methods=['GET'])
@jwt_required()
def get_user_by_id(comerciante_id):
    all_users = list_all_comerciantes()

    if comerciante_id in all_users:
        return jsonify(all_users[comerciante_id]), 200

    return jsonify({"message": "Usuário não encontrado."}), 404

@config_bp.route('/users/<string:comerciante_id>', methods=['PUT'])
@jwt_required()
def update_user(comerciante_id):
    data = request.get_json()
    allowed_fields = ["email", "telefone", "endereco"]
    novos_dados = {k: v for k, v in data.items() if k in allowed_fields}

    if not novos_dados:
        return jsonify({"message": "Nenhum dado válido para atualizar."}), 400

    sucesso = update_dados_comerciante(comerciante_id, novos_dados)
    if sucesso:
        return jsonify({"message": "Dados atualizados com sucesso!"}), 200
    
    return jsonify({"message": "Erro ao atualizar dados ou usuário não encontrado."}), 404

@config_bp.route('/users/<string:comerciante_id>', methods=['DELETE'])
@jwt_required()
def delete_user(comerciante_id):
    sucesso = delete_comerciante(comerciante_id)
    
    if sucesso:
        return jsonify({"message": "Usuário deletado com sucesso!"}), 200
    
    return jsonify({"message": "Erro ao excluir usuário ou usuário não encontrado."}), 404