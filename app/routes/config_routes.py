from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity # Adicione get_jwt_identity
from app.services.config_service import (
    list_all_comerciantes, update_dados_comerciante, delete_comerciante, get_user_by_id
)

config_bp = Blueprint('config', __name__, url_prefix='/config')

@config_bp.route('/users/<string:comerciante_id>', methods=['DELETE'])
@jwt_required()
def delete_user(comerciante_id):
    
    current_email = get_jwt_identity() 
    current_user_data = None
    all_comerciantes = list_all_comerciantes() # Busca todos os comerciantes
    for key, user_data in all_comerciantes.items():
        if user_data and user_data.get('email') == current_email:
            current_user_data = user_data
            break
    
    if not current_user_data or current_user_data.get('idComerciante') != int(comerciante_id):
        return jsonify({"message": "Você não tem permissão para excluir esta conta."}), 403 # Forbidden

    sucesso = delete_comerciante(comerciante_id)
    
    if sucesso:
        return jsonify({"message": "Usuário e dados relacionados deletados com sucesso!"}), 200
    
    return jsonify({"message": "Erro ao excluir usuário ou usuário não encontrado."}), 404